-- Scaffold migration: a tiny public table that proves migrations apply and the API is reachable.
create table public.app_info (
  key text primary key,
  value text not null
);

alter table public.app_info enable row level security;

create policy "app_info is readable by everyone"
  on public.app_info for select
  using (true);

insert into public.app_info (key, value) values ('name', 'prova');
