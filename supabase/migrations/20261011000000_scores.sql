-- Scores (#19): PDFs of the written music for a Piece. A Piece can have several, each with a label,
-- and at most one is the choir score. The files live in the private `scores` bucket; this table says
-- which Piece, label and choir-score flag each belongs to.
--
-- Uploads are append-only, as for Practice Tracks: the bucket has an insert policy for `append`, a
-- read policy for `read` and a delete policy for `delete`, and no update policy, so a file can never
-- be replaced or overwritten. A Score's row is written only by `add_score`, after the file is in the
-- bucket. `update` renames a label and chooses the choir score, nothing more. The bucket has its own
-- size limit (20 MiB; scanned scores are much larger than audio) and accepts only PDF;
-- scripts/apply-upload-limit.mjs sets the limit again from PUBLIC_SCORE_UPLOAD_LIMIT_MIB during a
-- deployment.
--
-- The label limit (60 characters) is also in src/lib/core/scores.ts; the contract tests take their
-- boundary from there, so they are kept in step.
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces (id) on delete cascade,
  label text not null,
  -- The one Score the choir treats as its own. At most one per Piece (see the index below).
  is_choir_score boolean not null default false,
  object_path text not null unique,
  created_at timestamptz not null default now(),
  constraint scores_label_shape
    check (label = btrim(label) and char_length(label) between 1 and 60)
);

create index scores_piece_idx on public.scores (piece_id, created_at, id);

-- At most one choir score per Piece, enforced by the database itself.
create unique index scores_one_choir_score_idx on public.scores (piece_id) where is_choir_score;

alter table public.scores enable row level security;

-- Every Singer with `read` sees every Score. Nobody writes through the API: there is no write policy.
create policy scores_read on public.scores for select to authenticated
  using (public.has_permission('read'));

-- The bucket. 20 MiB and PDF only; the type is the one a browser sends for a .pdf file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scores', 'scores', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A file is `<piece id>/<score id>.pdf`: the path is chosen by the app, never by the Singer.
create policy scores_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'scores'
    and public.has_permission('append')
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  );

create policy scores_download on storage.objects for select to authenticated
  using (bucket_id = 'scores' and public.has_permission('read'));

create policy scores_remove on storage.objects for delete to authenticated
  using (bucket_id = 'scores' and public.has_permission('delete'));

-- Registers an uploaded file as a Score of a Piece. The file must already be in the bucket, put there
-- by the caller, and not yet belong to a Score. `make_choir` makes it the choir score: a Singer with
-- `append` may do that only while the Piece has none, and replacing the current one needs `update`
-- (which is refused as 42501, like any missing Permission). 22023 is "invalid", P0002 "unknown Piece";
-- `hint` says which.
create function public.add_score(
  target_piece uuid,
  file_path text,
  score_label text,
  make_choir boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  added uuid;
  tidy_label text := public.tidy_text(score_label);
begin
  perform public.require_permission('append');
  -- Locked, so two uploads that both want to be the choir score cannot each see none there.
  perform 1 from public.pieces where id = target_piece for update;
  if not found then
    raise exception 'unknown Piece' using errcode = 'P0002';
  end if;
  if char_length(tidy_label) = 0 or char_length(tidy_label) > 60 then
    raise exception 'a label is 1 to 60 characters' using errcode = '22023', hint = 'label';
  end if;
  if split_part(file_path, '/', 1) <> target_piece::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'scores'
        and name = file_path
        and owner_id = (select auth.uid())::text
    )
  then
    raise exception 'upload the file first' using errcode = '22023', hint = 'file';
  end if;
  if exists (select 1 from public.scores where object_path = file_path) then
    raise exception 'that file is a Score already' using errcode = '23505', hint = 'file-used';
  end if;

  if make_choir then
    if exists (select 1 from public.scores where piece_id = target_piece and is_choir_score) then
      perform public.require_permission('update');
      update public.scores set is_choir_score = false
        where piece_id = target_piece and is_choir_score;
    end if;
  end if;

  insert into public.scores (piece_id, label, is_choir_score, object_path)
    values (target_piece, tidy_label, make_choir, file_path)
    returning id into added;
  return added;
end;
$$;

-- Changes a Score's label. Nothing else about the file can be changed.
create function public.rename_score(target uuid, score_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tidy_label text := public.tidy_text(score_label);
begin
  perform public.require_permission('update');
  if char_length(tidy_label) = 0 or char_length(tidy_label) > 60 then
    raise exception 'a label is 1 to 60 characters' using errcode = '22023', hint = 'label';
  end if;
  update public.scores set label = tidy_label where id = target;
  if not found then
    raise exception 'unknown Score' using errcode = 'P0002';
  end if;
end;
$$;

-- Makes a Score its Piece's choir score, in place of the current one if there is one.
create function public.make_choir_score(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_piece uuid;
begin
  perform public.require_permission('update');
  select piece_id into owner_piece from public.scores where id = target;
  if owner_piece is null then
    raise exception 'unknown Score' using errcode = 'P0002';
  end if;
  -- The Piece is locked, as in add_score.
  perform 1 from public.pieces where id = owner_piece for update;
  update public.scores set is_choir_score = false
    where piece_id = owner_piece and is_choir_score and id <> target;
  update public.scores set is_choir_score = true where id = target;
end;
$$;

-- Deletes a Score's row and answers with the path of its file, which the caller then removes from
-- the bucket (a database function cannot remove a stored file). The row goes first, so a failure in
-- between leaves a stray file and never a Score with no file. Deleting the choir score leaves the
-- Piece with none: nothing is promoted in its place.
create function public.delete_score(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed text;
begin
  perform public.require_permission('delete');
  delete from public.scores where id = target returning object_path into removed;
  if removed is null then
    raise exception 'unknown Score' using errcode = 'P0002';
  end if;
  return removed;
end;
$$;

-- The Repertoire as the app shows it, now counting Scores too. Performances arrive with #20, which
-- replaces this function to count them.
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
      (select count(*) from public.scores s where s.piece_id = p.id),
      0::bigint
    from public.pieces p
    where only_piece is null or p.id = only_piece;
end;
$$;

revoke execute on function public.add_score(uuid, text, text, boolean) from public, anon;
revoke execute on function public.rename_score(uuid, text) from public, anon;
revoke execute on function public.make_choir_score(uuid) from public, anon;
revoke execute on function public.delete_score(uuid) from public, anon;
grant execute on function public.add_score(uuid, text, text, boolean) to authenticated;
grant execute on function public.rename_score(uuid, text) to authenticated;
grant execute on function public.make_choir_score(uuid) to authenticated;
grant execute on function public.delete_score(uuid) to authenticated;
