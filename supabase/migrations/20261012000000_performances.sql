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

-- Creates a Performance. `append` may also mark it major now.
create function public.add_performance(
  performance_name text,
  performance_starts_at timestamptz,
  performance_ends_at timestamptz,
  performance_venue text,
  performance_is_major boolean
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
  return added;
end;
$$;

revoke execute on function public.check_performance(text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke execute on function public.add_performance(text, timestamptz, timestamptz, text, boolean) from public, anon;
grant execute on function public.add_performance(text, timestamptz, timestamptz, text, boolean) to authenticated;
