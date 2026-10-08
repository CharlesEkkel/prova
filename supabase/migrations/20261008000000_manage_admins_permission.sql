-- The sixth Permission. Added on its own because a new enum value cannot be used in the
-- transaction that adds it; 20261008000100_roles_and_owners.sql uses it.
alter type public.permission add value if not exists 'manage-admins';
