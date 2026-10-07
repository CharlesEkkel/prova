-- Singers: everyone who has signed in with Google, recorded on first sign-in.
-- No policy is defined, so with RLS on nobody reads or writes a row through the API; the app
-- learns a Singer's access through `my_permissions()` instead.
create table public.singers (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  email_verified boolean not null default false,
  default_voice_part_id uuid,
  created_at timestamptz not null default now()
);

alter table public.singers enable row level security;

create function public.record_singer()
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
  return new;
end;
$$;

create trigger record_singer_on_sign_in
  after insert on auth.users
  for each row execute function public.record_singer();
