-- Site settings: choir-wide choices that everyone sees. Today that is the Colour Theme (#31).
-- One row, one column per setting. The unique index on a constant is what keeps it to one row.
create table public.site_settings (
  colour_theme text not null default 'forest'
    check (colour_theme in ('forest', 'violet', 'ocean', 'sunset', 'graphite'))
);

create unique index site_settings_single_row on public.site_settings ((true));

insert into public.site_settings (colour_theme) values ('forest');

alter table public.site_settings enable row level security;

-- A deliberate carve-out from "a Pending Singer reads nothing": the Colour Theme is shown to
-- everyone, including a visitor who has not signed in.
create policy "anyone can read the site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- No insert or delete policy: the row is seeded above and only ever changes.
create policy "a Singer with manage-users can change the site settings"
  on public.site_settings for update
  to authenticated
  using (public.has_permission('manage-users'))
  with check (public.has_permission('manage-users'));

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
-- Defence in depth: the default grants would let RLS alone refuse these.
revoke insert, delete, truncate on public.site_settings from anon, authenticated;
