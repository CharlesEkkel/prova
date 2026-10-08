-- Roles, Owners and Role management (#15). See docs/adr/0002. Nothing here is writable through
-- the API directly: tables stay RLS-on with no policy, and every change goes through an admin_*
-- function that checks the caller's Permissions live.

-- Built-in Roles. `builtin` names which one; `is_builtin` is what the app checks, never the name.
alter table public.roles
  add column builtin text check (builtin in ('admin', 'owner')),
  add column is_builtin boolean generated always as (builtin is not null) stored;

create unique index roles_one_per_builtin on public.roles (builtin) where builtin is not null;

-- Names are trimmed and unique ignoring case. Existing rows are trimmed first.
update public.roles set name = btrim(name);
alter table public.roles
  add constraint roles_name_is_trimmed check (name = btrim(name) and name <> '');
create unique index roles_name_unique_ci on public.roles (lower(name));

-- The built-in Roles. A hand-made "Admin" from the stopgap `just make-admin` becomes the built-in.
update public.roles set name = 'Admin', builtin = 'admin' where lower(name) = 'admin';
insert into public.roles (name, builtin)
  select 'Admin', 'admin' where not exists (select 1 from public.roles where builtin = 'admin');
insert into public.roles (name, builtin) values ('Owner', 'owner');

-- Admin holds every Permission except manage-admins; Owner holds all six. Owner is never granted:
-- it exists so the Roles tab can show what an Owner holds.
delete from public.role_permissions
  where role_id in (select id from public.roles where builtin is not null);
insert into public.role_permissions (role_id, permission)
  select r.id, p
  from public.roles r, unnest(enum_range(null::public.permission)) p
  where (r.builtin = 'owner') or (r.builtin = 'admin' and p <> 'manage-admins');

-- The Roles a choir starts with, free to edit or delete.
insert into public.roles (name) values ('Editor'), ('Contributor'), ('Reader');
insert into public.role_permissions (role_id, permission)
  select r.id, bundle.permission::public.permission
  from public.roles r
  join (values
    ('Editor', 'read'), ('Editor', 'append'), ('Editor', 'update'),
    ('Contributor', 'read'), ('Contributor', 'append'),
    ('Reader', 'read')
  ) as bundle (role_name, permission) on bundle.role_name = r.name;

-- manage-admins belongs to Owners alone: only the built-in Owner Role may hold it, and nobody can
-- be granted that Role.
create function public.guard_role_permissions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.permission = 'manage-admins'
     and not exists (select 1 from public.roles where id = new.role_id and builtin = 'owner') then
    raise exception 'only the Owner Role can hold manage-admins' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger guard_role_permissions
  before insert or update on public.role_permissions
  for each row execute function public.guard_role_permissions();

create function public.guard_singer_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.roles where id = new.role_id and builtin = 'owner') then
    raise exception 'Owner is derived from the owner emails and cannot be granted'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger guard_singer_roles
  before insert or update on public.singer_roles
  for each row execute function public.guard_singer_roles();

-- The owner emails, set by the deployment on every deploy through set_owner_emails(). Stored
-- lowercase so matching ignores case.
create table public.owner_emails (
  email text primary key check (email = lower(btrim(email)) and email <> '')
);

alter table public.owner_emails enable row level security;

-- Whether this Singer is an Owner right now: their email, which Google verified, is on the list.
-- Derived on every call, never stored, so removing an email demotes them on the next request.
create function public.is_owner(singer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.singers s
    join public.owner_emails o on o.email = lower(btrim(s.email))
    where s.id = singer and s.email_verified
  );
$$;

-- Everything a Singer holds: their Roles' Permissions, and all of them if they are an Owner.
create function public.permissions_of(singer uuid)
returns public.permission[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct held.permission order by held.permission), '{}')
  from (
    select rp.permission
    from public.singer_roles sr
    join public.role_permissions rp on rp.role_id = sr.role_id
    where sr.singer_id = singer
    union
    select p from unnest(enum_range(null::public.permission)) p where public.is_owner(singer)
  ) held;
$$;

create or replace function public.my_permissions()
returns public.permission[]
language sql
stable
security definer
set search_path = ''
as $$
  select public.permissions_of(auth.uid());
$$;

-- Gives the built-in Admin Role to every Owner, so losing Owner leaves them an Admin.
create function public.grant_admin_to_owners()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.singer_roles (singer_id, role_id)
  select s.id, (select id from public.roles where builtin = 'admin')
  from public.singers s
  where public.is_owner(s.id)
  on conflict do nothing;
$$;

create function public.grant_admin_when_owner_email_added()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.grant_admin_to_owners();
  return null;
end;
$$;

create trigger grant_admin_when_owner_email_added
  after insert on public.owner_emails
  for each statement execute function public.grant_admin_when_owner_email_added();

-- A Singer whose verified email is already an owner email is given Admin at first sign-in.
create or replace function public.record_singer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.singers (id, display_name, email, avatar_url, email_verified)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      new.email
    ),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    coalesce((new.raw_user_meta_data ->> 'email_verified')::boolean, false)
  );
  perform public.grant_admin_to_owners();
  return new;
end;
$$;

-- Replaces the whole owner list. Safe to run on every deploy: the result depends only on the list
-- given. Callable only with the service role key (the deployment, `just set-owners`).
create function public.set_owner_emails(emails text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text[] := coalesce(
    (select array_agg(distinct lower(btrim(e))) from unnest(emails) e where btrim(e) <> ''),
    '{}'
  );
begin
  delete from public.owner_emails where email <> all (wanted);
  insert into public.owner_emails (email) select unnest(wanted) on conflict do nothing;
  perform public.grant_admin_to_owners();
end;
$$;

-- Whether a Role grants manage-users, which only an Owner may hand out or take away.
create function public.role_grants_manage_users(role uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.role_permissions
    where role_id = role and permission = 'manage-users'
  );
$$;

-- Refuses unless the caller holds `required`. 42501 is "insufficient privilege".
create function public.require_permission(required public.permission)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission(required) then
    raise exception 'requires %', required using errcode = '42501';
  end if;
end;
$$;

-- Everything that grants, revokes or touches manage-users also needs manage-admins.
create function public.require_manage_admins_if(touches_manage_users boolean)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if touches_manage_users then
    perform public.require_permission('manage-admins');
  end if;
end;
$$;

-- A Role needs a trimmed, unique name and at least one Permission, and never manage-admins.
create function public.check_role_definition(
  role_name text,
  perms public.permission[],
  except_role uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if btrim(role_name) = '' then
    raise exception 'a Role needs a name' using errcode = '22023';
  end if;
  if coalesce(cardinality(perms), 0) = 0 then
    raise exception 'a Role needs at least one Permission' using errcode = '22023';
  end if;
  if 'manage-admins' = any (perms) then
    raise exception 'no Role can hold manage-admins' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.roles
    where lower(name) = lower(btrim(role_name)) and id is distinct from except_role
  ) then
    raise exception 'a Role with that name exists' using errcode = '23505';
  end if;
end;
$$;

create function public.admin_create_role(role_name text, perms public.permission[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created uuid;
begin
  perform public.require_permission('manage-users');
  perform public.check_role_definition(role_name, perms, null);
  perform public.require_manage_admins_if('manage-users' = any (perms));

  insert into public.roles (name) values (btrim(role_name)) returning id into created;
  insert into public.role_permissions (role_id, permission)
    select created, p from unnest(perms) p on conflict do nothing;
  return created;
end;
$$;

create function public.admin_update_role(
  target uuid,
  role_name text,
  perms public.permission[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  if not exists (select 1 from public.roles where id = target) then
    raise exception 'unknown Role' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.roles where id = target and builtin is not null) then
    raise exception 'built-in Roles are locked' using errcode = '22023';
  end if;
  perform public.check_role_definition(role_name, perms, target);
  perform public.require_manage_admins_if(
    'manage-users' = any (perms) or public.role_grants_manage_users(target)
  );

  update public.roles set name = btrim(role_name) where id = target;
  delete from public.role_permissions where role_id = target;
  insert into public.role_permissions (role_id, permission)
    select target, p from unnest(perms) p on conflict do nothing;
end;
$$;

-- Deleting a Role takes it from every Singer who held it (their grants cascade).
create function public.admin_delete_role(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  if not exists (select 1 from public.roles where id = target) then
    raise exception 'unknown Role' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.roles where id = target and builtin is not null) then
    raise exception 'built-in Roles are locked' using errcode = '22023';
  end if;
  perform public.require_manage_admins_if(public.role_grants_manage_users(target));

  delete from public.roles where id = target;
end;
$$;

-- Makes `role_ids` exactly the Roles this Singer holds. Approving a Pending Singer is this call.
create function public.admin_set_singer_roles(target uuid, role_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted uuid[] := coalesce(
    (select array_agg(distinct r) from unnest(role_ids) r),
    '{}'
  );
  changed uuid[];
begin
  perform public.require_permission('manage-users');
  if not exists (select 1 from public.singers where id = target) then
    raise exception 'unknown Singer' using errcode = 'P0002';
  end if;
  if public.is_owner(target) then
    raise exception 'an Owner''s Roles cannot be changed in the app' using errcode = '42501';
  end if;
  if (select count(*) from public.roles where id = any (wanted)) <> cardinality(wanted) then
    raise exception 'unknown Role' using errcode = '22023';
  end if;

  -- The Roles being added or taken away: the symmetric difference of held and wanted.
  select coalesce(array_agg(r), '{}') into changed from (
    (select unnest(wanted) as r except select role_id from public.singer_roles where singer_id = target)
    union
    (select role_id from public.singer_roles where singer_id = target except select unnest(wanted))
  ) diff;

  perform public.require_manage_admins_if(
    'manage-users' = any (public.permissions_of(target))
    or exists (select 1 from unnest(changed) c where public.role_grants_manage_users(c))
  );

  delete from public.singer_roles where singer_id = target and role_id <> all (wanted);
  insert into public.singer_roles (singer_id, role_id)
    select target, r from unnest(wanted) r on conflict do nothing;
end;
$$;

-- Removes a Singer and their sign-in. Signing in again starts a fresh Pending Singer.
create function public.admin_remove_singer(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  if not exists (select 1 from public.singers where id = target) then
    raise exception 'unknown Singer' using errcode = 'P0002';
  end if;
  if public.is_owner(target) then
    raise exception 'an Owner cannot be removed in the app' using errcode = '42501';
  end if;
  perform public.require_manage_admins_if('manage-users' = any (public.permissions_of(target)));

  delete from auth.users where id = target;
end;
$$;

-- The Roles tab: every Role with its Permissions and how many Singers hold it.
create function public.admin_roles()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'is_builtin', r.is_builtin,
        'permissions', (
          select coalesce(jsonb_agg(rp.permission order by rp.permission), '[]')
          from public.role_permissions rp where rp.role_id = r.id
        ),
        'singer_count', case r.builtin
          when 'owner' then (select count(*) from public.singers s where public.is_owner(s.id))
          else (select count(*) from public.singer_roles sr where sr.role_id = r.id)
        end
      )
      order by (r.builtin is null), r.builtin desc, lower(r.name)
    )
    from public.roles r
  ), '[]');
end;
$$;

-- The Singers tab: every Singer with their Roles, Voice Part and whether they are pending.
create function public.admin_singers()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('manage-users');
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'display_name', s.display_name,
        'email', s.email,
        'voice_part', vp.name,
        'signed_up_via', 'Direct',
        'signed_up_at', s.created_at,
        'is_owner', public.is_owner(s.id),
        'permissions', public.permissions_of(s.id),
        'roles', (
          select coalesce(
            jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by lower(r.name)),
            '[]'
          )
          from public.singer_roles sr join public.roles r on r.id = sr.role_id
          where sr.singer_id = s.id
        )
      )
      order by s.created_at, s.id
    )
    from public.singers s
    left join public.voice_parts vp on vp.id = s.default_voice_part_id
  ), '[]');
end;
$$;

-- Internal helpers: only other functions use them, never the API.
revoke execute on function
  public.is_owner(uuid),
  public.permissions_of(uuid),
  public.grant_admin_to_owners(),
  public.grant_admin_when_owner_email_added(),
  public.role_grants_manage_users(uuid),
  public.require_permission(public.permission),
  public.require_manage_admins_if(boolean),
  public.check_role_definition(text, public.permission[], uuid),
  public.set_owner_emails(text[])
  from public, anon, authenticated;

-- set_owner_emails is for the deployment alone.
grant execute on function public.set_owner_emails(text[]) to service_role;

-- The admin portal's calls. Each refuses anyone without manage-users itself.
revoke execute on function
  public.admin_create_role(text, public.permission[]),
  public.admin_update_role(uuid, text, public.permission[]),
  public.admin_delete_role(uuid),
  public.admin_set_singer_roles(uuid, uuid[]),
  public.admin_remove_singer(uuid),
  public.admin_roles(),
  public.admin_singers()
  from public, anon;
grant execute on function
  public.admin_create_role(text, public.permission[]),
  public.admin_update_role(uuid, text, public.permission[]),
  public.admin_delete_role(uuid),
  public.admin_set_singer_roles(uuid, uuid[]),
  public.admin_remove_singer(uuid),
  public.admin_roles(),
  public.admin_singers()
  to authenticated;
