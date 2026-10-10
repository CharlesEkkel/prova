-- The Choir Time Zone (#20, ADR 0004): the one IANA time zone Performance times are entered and shown
-- in. A site setting beside the Colour Theme, so it shares that row's policies: everyone reads it,
-- a Singer with `manage-users` changes it. Changing it reinterprets no stored time.
alter table public.site_settings add column choir_time_zone text not null default 'UTC';

-- Refuses a name Postgres does not know as a time zone. A trigger, because the list lives in a
-- catalogue view a check constraint may not read. 22023 is "invalid".
create function public.check_choir_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.choir_time_zone) then
    raise exception 'unknown time zone %', new.choir_time_zone using errcode = '22023', hint = 'invalid';
  end if;
  return new;
end;
$$;

create trigger site_settings_choir_time_zone
  before insert or update of choir_time_zone on public.site_settings
  for each row execute function public.check_choir_time_zone();

revoke execute on function public.check_choir_time_zone() from public, anon, authenticated;
