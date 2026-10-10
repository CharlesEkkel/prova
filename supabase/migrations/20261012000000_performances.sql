-- Performances (#20): an event with a name, a start and an end (stored as UTC) and an optional venue.
-- Reading needs `read`. Writing goes only through the functions below: `append` creates.
create table public.performances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null default '',
  is_major boolean not null default false,
  created_at timestamptz not null default now(),
  constraint performances_ends_after_start check (ends_at > starts_at)
);

-- Names are stored with runs of spaces collapsed, so lower-casing is all that is left to ignore.
create unique index performances_name_start_unique on public.performances (lower(name), starts_at);

alter table public.performances enable row level security;

-- Every Singer with `read` sees every Performance. Nobody writes through the API: there is no write policy.
create policy performances_read on public.performances for select to authenticated
  using (public.has_permission('read'));

-- A Performance's running order. A Piece appears at most once in each Performance, and leaves every
-- Performance when it is deleted; deleting a Performance leaves its Pieces in the Repertoire.
-- Positions are unique within a Performance, checked at commit so a reorder can swap them.
create table public.performance_pieces (
  performance_id uuid not null references public.performances (id) on delete cascade,
  piece_id uuid not null references public.pieces (id) on delete cascade,
  position integer not null,
  primary key (performance_id, piece_id),
  constraint performance_pieces_position_unique unique (performance_id, position) deferrable initially deferred
);

create index performance_pieces_piece on public.performance_pieces (piece_id);

alter table public.performance_pieces enable row level security;

create policy performance_pieces_read on public.performance_pieces for select to authenticated
  using (public.has_permission('read'));

-- Refuses a Performance the choir cannot hold. 22023 is "invalid", 23505 is "taken".
-- `except_performance` is the Performance being edited, if any.
create function public.check_performance(
  performance_name text,
  performance_starts_at timestamptz,
  performance_ends_at timestamptz,
  except_performance uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if performance_ends_at <= performance_starts_at then
    raise exception 'a Performance must end after it starts' using errcode = '22023', hint = 'invalid';
  end if;
  if exists (
    select 1 from public.performances
    where lower(name) = lower(public.tidy_text(performance_name))
      and starts_at = performance_starts_at
      and id is distinct from except_performance
  ) then
    raise exception 'a Performance with that name and start exists already' using errcode = '23505', hint = 'duplicate';
  end if;
end;
$$;

-- Creates a Performance. `append` may also add its first Pieces, in the order given, and mark it major.
create function public.add_performance(
  performance_name text,
  performance_starts_at timestamptz,
  performance_ends_at timestamptz,
  performance_venue text,
  performance_is_major boolean,
  first_piece_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  added uuid;
begin
  perform public.require_permission('append');
  perform public.check_performance(performance_name, performance_starts_at, performance_ends_at, null);

  insert into public.performances (name, starts_at, ends_at, venue, is_major)
    values (
      public.tidy_text(performance_name),
      performance_starts_at,
      performance_ends_at,
      public.tidy_text(performance_venue),
      performance_is_major
    )
    returning id into added;

  insert into public.performance_pieces (performance_id, piece_id, position)
    select added, piece_id, ordinality
    from unnest(coalesce(first_piece_ids, '{}')) with ordinality as first (piece_id, ordinality);
  return added;
end;
$$;

-- Edits a Performance's name, times and venue, past or upcoming. Marking it major afterwards is #32.
create function public.update_performance(
  target uuid,
  performance_name text,
  performance_starts_at timestamptz,
  performance_ends_at timestamptz,
  performance_venue text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('update');
  if not exists (select 1 from public.performances where id = target) then
    raise exception 'unknown Performance' using errcode = 'P0002';
  end if;
  perform public.check_performance(performance_name, performance_starts_at, performance_ends_at, target);

  update public.performances
    set name = public.tidy_text(performance_name),
        starts_at = performance_starts_at,
        ends_at = performance_ends_at,
        venue = public.tidy_text(performance_venue)
    where id = target;
end;
$$;

-- Adds a Piece to the end of each of these Performances' running orders ("Add to a Performance…").
-- A Piece already in one of them is refused with 23505, and then it is added to none.
create function public.add_piece_to_performances(target_piece uuid, performance_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  performance uuid;
begin
  perform public.require_permission('update');
  if not exists (select 1 from public.pieces where id = target_piece) then
    raise exception 'unknown Piece' using errcode = 'P0002';
  end if;

  foreach performance in array coalesce(performance_ids, '{}') loop
    -- Holding the Performance's row keeps two adds from taking the same position.
    perform 1 from public.performances where id = performance for update;
    if not found then
      raise exception 'unknown Performance' using errcode = 'P0002';
    end if;
    insert into public.performance_pieces (performance_id, piece_id, position)
      select performance, target_piece, coalesce(max(position), 0) + 1
      from public.performance_pieces
      where performance_id = performance;
  end loop;
end;
$$;

-- Takes a Piece out of one Performance ("Remove from this Performance"). It stays in the Repertoire
-- and in its other Performances.
create function public.remove_piece_from_performance(target_performance uuid, target_piece uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('update');
  delete from public.performance_pieces
    where performance_id = target_performance and piece_id = target_piece;
  if not found then
    raise exception 'that Piece is not in that Performance' using errcode = 'P0002';
  end if;
end;
$$;

-- Sets a Performance's whole running order. `ordered` must name exactly the Pieces it holds, each
-- once; anything else means the Singer was looking at an old list, and is refused as stale.
create function public.reorder_performance(target uuid, ordered uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('update');
  perform 1 from public.performances where id = target for update;
  if not found then
    raise exception 'unknown Performance' using errcode = 'P0002';
  end if;
  if cardinality(ordered) is distinct from (
      select count(*) from public.performance_pieces where performance_id = target
    )
    or (
      select count(distinct listed.piece)
      from unnest(ordered) as listed(piece)
      join public.performance_pieces pp on pp.piece_id = listed.piece and pp.performance_id = target
    ) <> cardinality(ordered)
  then
    raise exception 'the Performance''s Pieces have changed' using errcode = '22023', hint = 'stale-list';
  end if;

  update public.performance_pieces pp
    set position = numbered.place
    from unnest(ordered) with ordinality as numbered(piece, place)
    where pp.performance_id = target and pp.piece_id = numbered.piece;
end;
$$;

-- Deletes a Performance. Its running order goes with it; its Pieces stay in the Repertoire.
create function public.delete_performance(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('delete');
  delete from public.performances where id = target;
  if not found then
    raise exception 'unknown Performance' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.check_performance(text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.add_performance(text, timestamptz, timestamptz, text, boolean, uuid[]) from public, anon;
grant execute on function public.add_performance(text, timestamptz, timestamptz, text, boolean, uuid[]) to authenticated;
revoke execute on function public.update_performance(uuid, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.update_performance(uuid, text, timestamptz, timestamptz, text) to authenticated;
revoke execute on function public.add_piece_to_performances(uuid, uuid[]) from public, anon;
grant execute on function public.add_piece_to_performances(uuid, uuid[]) to authenticated;
revoke execute on function public.remove_piece_from_performance(uuid, uuid) from public, anon;
grant execute on function public.remove_piece_from_performance(uuid, uuid) to authenticated;
revoke execute on function public.reorder_performance(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_performance(uuid, uuid[]) to authenticated;
revoke execute on function public.delete_performance(uuid) from public, anon;
grant execute on function public.delete_performance(uuid) to authenticated;
