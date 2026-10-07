-- Voice Parts: the choir's configurable list, seeded with Soprano, Alto, Tenor and Bass. #16 adds
-- Admin editing, numbered labels and the profile change.
create table public.voice_parts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_label text not null unique,
  position integer not null
);

alter table public.voice_parts enable row level security;

-- A deliberate carve-out from "a Pending Singer reads nothing": a new Singer chooses their
-- Voice Part before approval, so any signed-in person may read the names and labels, and only that.
create policy "signed-in people can read the Voice Part list"
  on public.voice_parts for select
  to authenticated
  using (true);

insert into public.voice_parts (name, short_label, position) values
  ('Soprano', 'S', 1),
  ('Alto', 'A', 2),
  ('Tenor', 'T', 3),
  ('Bass', 'B', 4);

-- Removing a Voice Part sends the affected Singers back to choose again.
alter table public.singers
  add constraint singers_default_voice_part_fk
  foreign key (default_voice_part_id) references public.voice_parts (id) on delete set null;

-- The only way a Singer writes their own default: it must be an existing Voice Part.
create function public.set_my_default_voice_part(chosen uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.voice_parts where id = chosen) then
    raise exception 'unknown Voice Part' using errcode = '22023';
  end if;
  update public.singers set default_voice_part_id = chosen where id = auth.uid();
end;
$$;

-- The signed-in Singer's own default Voice Part, or null before they have chosen one. A Pending
-- Singer cannot read their own row, so this is how the app knows whether to ask.
create function public.my_default_voice_part()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', vp.id, 'name', vp.name, 'short_label', vp.short_label)
  from public.singers s
  join public.voice_parts vp on vp.id = s.default_voice_part_id
  where s.id = auth.uid();
$$;

revoke execute on function public.set_my_default_voice_part(uuid) from public, anon;
revoke execute on function public.my_default_voice_part() from public, anon;
grant execute on function public.set_my_default_voice_part(uuid) to authenticated;
grant execute on function public.my_default_voice_part() to authenticated;
