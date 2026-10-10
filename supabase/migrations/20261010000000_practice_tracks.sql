-- Practice Tracks (#18): audio attached to a Piece, either the Combined Track (no Voice Part) or one
-- Voice Part's track, which says whether it is part-only or part-predominant. The files live in the
-- private `practice-tracks` bucket; this table says which Piece, part, kind and label each belongs to.
--
-- Uploads are append-only. The bucket has an insert policy for `append`, a read policy for `read` and
-- a delete policy for `delete`, and no update policy, so a file can never be replaced or overwritten.
-- A track's row is written only by `add_practice_track`, after the file is in the bucket. `update`
-- renames a label and nothing more. The size limit and the types the bucket accepts are set here;
-- scripts/apply-upload-limit.mjs sets the limit again from PUBLIC_UPLOAD_LIMIT_MIB during a deployment.
--
-- The label limit (60 characters) is also in src/lib/core/practice-tracks.ts; the contract tests
-- take their boundary from there, so they are kept in step.
create type public.practice_track_kind as enum ('part-only', 'part-predominant');

create table public.practice_tracks (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces (id) on delete cascade,
  -- Null is the Combined Track.
  voice_part_id uuid references public.voice_parts (id) on delete restrict,
  kind public.practice_track_kind,
  label text not null default '',
  object_path text not null unique,
  -- Measured in the browser when the file was chosen. Advisory: shown when present.
  duration_seconds integer,
  created_at timestamptz not null default now(),
  -- A Voice Part's track says which kind it is; the Combined Track has none.
  constraint practice_tracks_kind_shape check ((voice_part_id is null) = (kind is null)),
  constraint practice_tracks_label_shape check (label = btrim(label) and char_length(label) <= 60),
  constraint practice_tracks_duration_shape
    check (duration_seconds is null or duration_seconds between 1 and 86400)
);

create index practice_tracks_piece_idx on public.practice_tracks (piece_id, created_at, id);

alter table public.practice_tracks enable row level security;

-- Every Singer with `read` sees every track. Nobody writes through the API: there is no write policy.
create policy practice_tracks_read on public.practice_tracks for select to authenticated
  using (public.has_permission('read'));

-- The bucket. 10 MiB and MP3 or M4A; the types are the ones a browser sends for those extensions.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('practice-tracks', 'practice-tracks', false, 10485760, array['audio/mpeg', 'audio/mp4'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A file is `<piece id>/<track id>.mp3` or `.m4a`: the path is chosen by the app, never by the Singer.
create policy practice_tracks_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'practice-tracks'
    and public.has_permission('append')
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp3|m4a)$'
  );

create policy practice_tracks_download on storage.objects for select to authenticated
  using (bucket_id = 'practice-tracks' and public.has_permission('read'));

create policy practice_tracks_remove on storage.objects for delete to authenticated
  using (bucket_id = 'practice-tracks' and public.has_permission('delete'));

-- Registers an uploaded file as a Practice Track of a Piece. The file must already be in the bucket,
-- put there by the caller, and not yet belong to a track. `part` null makes it the Combined Track,
-- otherwise `track_kind` is required (the optional arguments are left out for the Combined Track). 22023 is "invalid", P0002 "unknown Piece". `hint` says which.
create function public.add_practice_track(
  target_piece uuid,
  file_path text,
  part uuid default null,
  track_kind public.practice_track_kind default null,
  track_label text default '',
  track_seconds integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  added uuid;
  tidy_label text := public.tidy_text(track_label);
begin
  perform public.require_permission('append');
  if not exists (select 1 from public.pieces where id = target_piece) then
    raise exception 'unknown Piece' using errcode = 'P0002';
  end if;
  if (part is null) <> (track_kind is null) then
    raise exception 'a Voice Part track needs a kind, and the Combined Track has none'
      using errcode = '22023', hint = 'kind';
  end if;
  if part is not null and not exists (select 1 from public.voice_parts where id = part) then
    raise exception 'unknown Voice Part' using errcode = '22023', hint = 'voice-part';
  end if;
  if char_length(tidy_label) > 60 then
    raise exception 'a label is up to 60 characters' using errcode = '22023', hint = 'label';
  end if;
  if track_seconds is not null and track_seconds not between 1 and 86400 then
    track_seconds := null;
  end if;
  if split_part(file_path, '/', 1) <> target_piece::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'practice-tracks'
        and name = file_path
        and owner_id = (select auth.uid())::text
    )
  then
    raise exception 'upload the file first' using errcode = '22023', hint = 'file';
  end if;
  if exists (select 1 from public.practice_tracks where object_path = file_path) then
    raise exception 'that file is a track already' using errcode = '23505', hint = 'file-used';
  end if;

  insert into public.practice_tracks (piece_id, voice_part_id, kind, label, object_path, duration_seconds)
    values (target_piece, part, track_kind, tidy_label, file_path, track_seconds)
    returning id into added;
  return added;
end;
$$;

-- Changes a track's label. Nothing else about a track can be changed, and its file never is.
create function public.rename_practice_track(target uuid, track_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('update');
  if char_length(public.tidy_text(track_label)) > 60 then
    raise exception 'a label is up to 60 characters' using errcode = '22023', hint = 'label';
  end if;
  update public.practice_tracks set label = public.tidy_text(track_label) where id = target;
  if not found then
    raise exception 'unknown Practice Track' using errcode = 'P0002';
  end if;
end;
$$;

-- Deletes a track's row and answers with the path of its file, which the caller then removes from
-- the bucket (a database function cannot remove a stored file). The row goes first, so a failure in
-- between leaves a stray file and never a track with no file.
create function public.delete_practice_track(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed text;
begin
  perform public.require_permission('delete');
  delete from public.practice_tracks where id = target returning object_path into removed;
  if removed is null then
    raise exception 'unknown Practice Track' using errcode = 'P0002';
  end if;
  return removed;
end;
$$;

-- The Repertoire as the app shows it, now counting Practice Tracks. Scores and Performances arrive
-- with #19 and #20, which replace this function to count them.
create or replace function public.repertoire(only_piece uuid default null)
returns table (
  id uuid,
  title text,
  composer text,
  notes text,
  practice_tracks bigint,
  scores bigint,
  performances bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('read');
  return query
    select p.id, p.title, p.composer, p.notes,
      (select count(*) from public.practice_tracks t where t.piece_id = p.id),
      0::bigint, 0::bigint
    from public.pieces p
    where only_piece is null or p.id = only_piece;
end;
$$;

-- A Voice Part that has Practice Tracks stays: removing it would strand them. Otherwise as before.
create or replace function public.admin_remove_voice_part(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  -- Locked so two removals cannot each see the other's part still there and take the last two.
  lock table public.voice_parts in share row exclusive mode;
  if not exists (select 1 from public.voice_parts where id = target) then
    raise exception 'unknown Voice Part' using errcode = 'P0002';
  end if;
  if (select count(*) from public.voice_parts) <= 1 then
    raise exception 'the last Voice Part cannot be removed'
      using errcode = '22023', hint = 'last-voice-part';
  end if;
  if exists (select 1 from public.practice_tracks where voice_part_id = target) then
    raise exception 'that Voice Part has Practice Tracks'
      using errcode = '22023', hint = 'has-tracks';
  end if;

  delete from public.voice_parts where id = target;
end;
$$;

revoke execute on function public.add_practice_track(uuid, text, uuid, public.practice_track_kind, text, integer) from public, anon;
revoke execute on function public.rename_practice_track(uuid, text) from public, anon;
revoke execute on function public.delete_practice_track(uuid) from public, anon;
grant execute on function public.add_practice_track(uuid, text, uuid, public.practice_track_kind, text, integer) to authenticated;
grant execute on function public.rename_practice_track(uuid, text) to authenticated;
grant execute on function public.delete_practice_track(uuid) to authenticated;
