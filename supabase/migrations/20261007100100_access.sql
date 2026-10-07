-- Access: Permissions, Roles and who holds them. #15 adds Role management, the Admin bootstrap
-- and the seeded Roles. Tables are RLS-on with no policy, so nobody reads or writes them through
-- the API; access is learned through the two functions below, which check these tables live.
create type public.permission as enum ('read', 'append', 'update', 'delete', 'manage-users');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission public.permission not null,
  primary key (role_id, permission)
);

create table public.singer_roles (
  singer_id uuid not null references public.singers (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (singer_id, role_id)
);

alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.singer_roles enable row level security;

-- The Permissions the signed-in Singer holds right now. Never read from the token, so removing a
-- Role takes effect on the next request.
create function public.my_permissions()
returns public.permission[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct rp.permission order by rp.permission), '{}')
  from public.singer_roles sr
  join public.role_permissions rp on rp.role_id = sr.role_id
  where sr.singer_id = auth.uid();
$$;

create function public.has_permission(required public.permission)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select required = any (public.my_permissions());
$$;

revoke execute on function public.my_permissions() from public, anon;
revoke execute on function public.has_permission(public.permission) from public, anon;
grant execute on function public.my_permissions() to authenticated;
grant execute on function public.has_permission(public.permission) to authenticated;
