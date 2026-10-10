-- Pieces (#17): the Repertoire. A Piece has a title, a composer (both required) and optional
-- Conductor's Notes. Titles may repeat, but not a title and composer together, ignoring case and
-- extra spaces. Reading needs `read`. Writing goes only through the functions
-- below: `append` adds (and may set the notes), `update` edits, `delete` removes.
--
-- The limits (title 120, composer 120, notes 2,000) are also in src/lib/core/pieces.ts;
-- tests/contract/pieces.test.ts takes its boundaries from there, so they are kept in step.
create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  composer text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint pieces_title_shape
    check (title = btrim(title) and char_length(title) between 1 and 120),
  constraint pieces_composer_shape
    check (composer = btrim(composer) and char_length(composer) between 1 and 120),
  constraint pieces_notes_shape check (notes = btrim(notes) and char_length(notes) <= 2000)
);

-- Text is stored with runs of spaces collapsed, so lower-casing is all that is left to ignore.
create unique index pieces_title_composer_unique on public.pieces (lower(title), lower(composer));

alter table public.pieces enable row level security;

-- Every Singer with `read` sees every Piece. Nobody writes through the API: there is no write policy.
create policy pieces_read on public.pieces for select to authenticated
  using (public.has_permission('read'));

-- Trims the ends and makes each run of spaces one.
create function public.tidy_text(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g'));
$$;

-- Refuses a Piece the Repertoire cannot hold. 22023 is "invalid", 23505 is "taken". `except_piece`
-- is the Piece being edited, if any. Notes keep their line breaks; only their ends are trimmed.
create function public.check_piece(piece_title text, piece_composer text, piece_notes text, except_piece uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if char_length(public.tidy_text(piece_title)) not between 1 and 120
    or char_length(public.tidy_text(piece_composer)) not between 1 and 120
    or char_length(btrim(coalesce(piece_notes, ''))) > 2000
  then
    raise exception 'a Piece needs a title and a composer of 1 to 120 characters each' using errcode = '22023', hint = 'invalid';
  end if;
  if exists (
    select 1 from public.pieces
    where lower(title) = lower(public.tidy_text(piece_title))
      and lower(composer) = lower(public.tidy_text(piece_composer))
      and id is distinct from except_piece
  ) then
    raise exception 'the Repertoire has that Piece already' using errcode = '23505', hint = 'duplicate';
  end if;
end;
$$;

-- Adds a Piece. `append` may set the Conductor's Notes now; changing them later needs `update`.
create function public.add_piece(piece_title text, piece_composer text, piece_notes text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  added uuid;
begin
  perform public.require_permission('append');
  perform public.check_piece(piece_title, piece_composer, piece_notes, null);

  insert into public.pieces (title, composer, notes)
    values (
      public.tidy_text(piece_title),
      public.tidy_text(piece_composer),
      btrim(coalesce(piece_notes, ''))
    )
    returning id into added;
  return added;
end;
$$;

-- Edits a Piece's title, composer and Conductor's Notes.
create function public.update_piece(target uuid, piece_title text, piece_composer text, piece_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('update');
  if not exists (select 1 from public.pieces where id = target) then
    raise exception 'unknown Piece' using errcode = 'P0002';
  end if;
  perform public.check_piece(piece_title, piece_composer, piece_notes, target);

  update public.pieces
    set title = public.tidy_text(piece_title),
        composer = public.tidy_text(piece_composer),
        notes = btrim(coalesce(piece_notes, ''))
    where id = target;
end;
$$;

-- Deletes a Piece. What depends on it (Practice Tracks, Scores, Performance entries) must reference
-- `public.pieces (id) on delete cascade`, so it goes too.
create function public.delete_piece(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('delete');
  if not exists (select 1 from public.pieces where id = target) then
    raise exception 'unknown Piece' using errcode = 'P0002';
  end if;

  delete from public.pieces where id = target;
end;
$$;

-- The Repertoire as the app shows it: every Piece with what depends on it, so the Singer sees which
-- have no Practice Tracks and the delete confirmation can say what goes. The counts are advisory (the
-- cascade is what guarantees removal). Practice Tracks, Scores and Performances arrive with #18,
-- #19 and #20, which replace this function to count them. `only_piece` narrows it to one Piece.
create function public.repertoire(only_piece uuid default null)
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
    select p.id, p.title, p.composer, p.notes, 0::bigint, 0::bigint, 0::bigint
    from public.pieces p
    where only_piece is null or p.id = only_piece;
end;
$$;

revoke execute on function public.tidy_text(text) from public, anon, authenticated;
revoke execute on function public.check_piece(text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.add_piece(text, text, text) from public, anon;
revoke execute on function public.update_piece(uuid, text, text, text) from public, anon;
revoke execute on function public.delete_piece(uuid) from public, anon;
revoke execute on function public.repertoire(uuid) from public, anon;
grant execute on function public.add_piece(text, text, text) to authenticated;
grant execute on function public.update_piece(uuid, text, text, text) to authenticated;
grant execute on function public.delete_piece(uuid) to authenticated;
grant execute on function public.repertoire(uuid) to authenticated;
