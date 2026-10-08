-- Voice Part administration (#16): a Singer with manage-users edits the choir's list. Names and
-- short labels are trimmed, unique ignoring case, and never "All", which is the Combined Track's.
alter table public.voice_parts
  drop constraint voice_parts_name_key,
  drop constraint voice_parts_short_label_key;

create unique index voice_parts_name_unique on public.voice_parts (lower(name));
create unique index voice_parts_short_label_unique on public.voice_parts (lower(short_label));

-- The limits below (40 characters, 3 letters or digits, "All") are also in src/lib/core/voice-parts.ts;
-- tests/contract/voice-part-admin.test.ts takes its boundaries from there, so they are kept in step.
alter table public.voice_parts
  add constraint voice_parts_name_shape
    check (name = btrim(name) and char_length(name) between 1 and 40 and lower(name) <> 'all'),
  add constraint voice_parts_short_label_shape
    check (short_label ~ '^[A-Za-z0-9]{1,3}$' and lower(short_label) <> 'all');

-- Refuses a name or short label the list cannot hold. The hint tells the app which rule it broke:
-- 22023 is "invalid", 23505 is "taken". `except_part` is the part being edited, if any.
create function public.check_voice_part(part_name text, part_label text, except_part uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if lower(btrim(part_name)) = 'all' or lower(btrim(part_label)) = 'all' then
    raise exception '"All" is reserved for the Combined Track'
      using errcode = '22023', hint = 'reserved';
  end if;
  if btrim(part_name) = '' or char_length(btrim(part_name)) > 40 then
    raise exception 'a Voice Part needs a name of 1 to 40 characters'
      using errcode = '22023', hint = 'invalid';
  end if;
  if btrim(part_label) !~ '^[A-Za-z0-9]{1,3}$' then
    raise exception 'a short label is 1 to 3 letters or digits'
      using errcode = '22023', hint = 'invalid';
  end if;
  if exists (
    select 1 from public.voice_parts
    where lower(name) = lower(btrim(part_name)) and id is distinct from except_part
  ) then
    raise exception 'a Voice Part with that name exists' using errcode = '23505', hint = 'name-taken';
  end if;
  if exists (
    select 1 from public.voice_parts
    where lower(short_label) = lower(btrim(part_label)) and id is distinct from except_part
  ) then
    raise exception 'a Voice Part with that short label exists'
      using errcode = '23505', hint = 'label-taken';
  end if;
end;
$$;

-- Adds a Voice Part at the end of the list.
create function public.admin_add_voice_part(part_name text, part_label text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  added uuid;
begin
  perform public.require_permission('manage-users');
  perform public.check_voice_part(part_name, part_label, null);

  insert into public.voice_parts (name, short_label, position)
    select btrim(part_name), btrim(part_label), coalesce(max(position), 0) + 1
    from public.voice_parts
    returning id into added;
  return added;
end;
$$;

-- Only a signed-in Singer may call these; each one checks the Permission itself.
revoke execute on function public.check_voice_part(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.admin_add_voice_part(text, text) from public, anon;
grant execute on function public.admin_add_voice_part(text, text) to authenticated;

-- Renames a Voice Part and sets its short label. It keeps its place in the list, and the short label
-- never follows the name: it is the Admin's to set.
create function public.admin_update_voice_part(target uuid, part_name text, part_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  if not exists (select 1 from public.voice_parts where id = target) then
    raise exception 'unknown Voice Part' using errcode = 'P0002';
  end if;
  perform public.check_voice_part(part_name, part_label, target);

  update public.voice_parts
    set name = btrim(part_name), short_label = btrim(part_label)
    where id = target;
end;
$$;

revoke execute on function public.admin_update_voice_part(uuid, text, text) from public, anon;
grant execute on function public.admin_update_voice_part(uuid, text, text) to authenticated;

-- The list as the admin portal shows it: in order, with how many Singers have each part as their
-- default (the ones removing it would send back to choose again).
create function public.admin_voice_parts()
returns table (id uuid, name text, short_label text, singer_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  return query
    select vp.id, vp.name, vp.short_label, count(s.id)
    from public.voice_parts vp
    left join public.singers s on s.default_voice_part_id = vp.id
    group by vp.id
    order by vp.position, vp.name;
end;
$$;

-- Sets the whole list to this order: the ids of every Voice Part, once each, first to last. A list
-- that is missing a part, repeats one or names one that is gone was made from an out-of-date page,
-- so it is refused rather than guessed at (hint: stale-list). Locked so two changes cannot interleave.
create function public.admin_reorder_voice_parts(ordered uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  lock table public.voice_parts in share row exclusive mode;
  if cardinality(ordered) is distinct from (select count(*) from public.voice_parts)
    or (
      select count(distinct listed.part)
      from unnest(ordered) as listed(part)
      join public.voice_parts vp on vp.id = listed.part
    ) <> cardinality(ordered)
  then
    raise exception 'the list of Voice Parts has changed' using errcode = '22023', hint = 'stale-list';
  end if;

  update public.voice_parts vp
    set position = numbered.place
    from unnest(ordered) with ordinality as numbered(part, place)
    where vp.id = numbered.part;
end;
$$;

-- Removes a Voice Part. Singers who had it as their default are left with none (the foreign key),
-- so they choose again. The last Voice Part stays, or nobody could finish choosing.
create function public.admin_remove_voice_part(target uuid)
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

  delete from public.voice_parts where id = target;
end;
$$;

revoke execute on function public.admin_voice_parts() from public, anon;
revoke execute on function public.admin_reorder_voice_parts(uuid[]) from public, anon;
revoke execute on function public.admin_remove_voice_part(uuid) from public, anon;
grant execute on function public.admin_voice_parts() to authenticated;
grant execute on function public.admin_reorder_voice_parts(uuid[]) to authenticated;
grant execute on function public.admin_remove_voice_part(uuid) to authenticated;
