// Backend contract support: real users and real sessions against the local Supabase stack.
// Google itself is never involved; users are created through the admin API instead.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../src/lib/shell/database.types';

export const url = process.env['PUBLIC_SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
export const anonKey = process.env['PUBLIC_SUPABASE_ANON_KEY'] ?? '';
export const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

/** Bypasses RLS. Tests use it only to arrange state (grant a Role) or to read back what happened. */
export const serviceClient = (): SupabaseClient<Database> =>
  createClient<Database>(url, serviceRoleKey, clientOptions);

export const anonClient = (fetch?: typeof globalThis.fetch): SupabaseClient<Database> =>
  createClient<Database>(url, anonKey, {
    ...clientOptions,
    ...(fetch === undefined ? {} : { global: { fetch } }),
  });

export type TestSinger = {
  readonly id: string;
  readonly email: string;
  readonly client: SupabaseClient<Database>;
};

type NewSinger = {
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** How the Singer's own client reaches Supabase, so a test can make it fail. */
  readonly fetch?: typeof globalThis.fetch;
};

/**
 * Signs a person in the way Google would leave them: an auth user with Google-style metadata and a
 * real session. Email sign-in is switched off for the app, so the session comes from a magic link
 * the admin API generates instead of a password.
 */
export const signInNewSinger = async (options: NewSinger = {}): Promise<TestSinger> => {
  const email = options.email ?? `singer-${randomUUID()}@example.test`;
  const admin = serviceClient();
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Singer',
      avatar_url: 'https://example.test/avatar.png',
      email_verified: options.emailVerified ?? true,
      ...options.metadata,
    },
  });
  if (created.error) throw created.error;

  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;

  const client = anonClient(options.fetch);
  const session = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (session.error) throw session.error;
  return { id: created.data.user.id, email, client };
};

type Permission = Database['public']['Enums']['permission'];

/** Gives a Singer a Role holding exactly these Permissions. Returns the Role's id. */
export const grantRole = async (
  singer: Pick<TestSinger, 'id'>,
  permissions: readonly Permission[],
): Promise<string> => {
  const admin = serviceClient();
  const role = await admin
    .from('roles')
    .insert({ name: `role-${randomUUID()}` })
    .select('id')
    .single();
  if (role.error) throw role.error;
  const bundle = await admin
    .from('role_permissions')
    .insert(permissions.map((permission) => ({ role_id: role.data.id, permission })));
  if (bundle.error) throw bundle.error;
  const grant = await admin
    .from('singer_roles')
    .insert({ singer_id: singer.id, role_id: role.data.id });
  if (grant.error) throw grant.error;
  return role.data.id;
};

export const revokeRole = async (singer: Pick<TestSinger, 'id'>, roleId: string): Promise<void> => {
  const { error } = await serviceClient()
    .from('singer_roles')
    .delete()
    .eq('singer_id', singer.id)
    .eq('role_id', roleId);
  if (error) throw error;
};

const builtinRoleId = async (builtin: 'admin' | 'owner'): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('roles')
    .select('id')
    .eq('builtin', builtin)
    .single();
  if (error) throw error;
  return data.id;
};

/** Gives a Singer the built-in Admin Role: every Permission except manage-admins. */
export const makeAdmin = async (singer: Pick<TestSinger, 'id'>): Promise<void> => {
  const { error } = await serviceClient()
    .from('singer_roles')
    .insert({ singer_id: singer.id, role_id: await builtinRoleId('admin') });
  if (error) throw error;
};

export const adminRoleId = (): Promise<string> => builtinRoleId('admin');
export const ownerRoleId = (): Promise<string> => builtinRoleId('owner');

/**
 * Adds an owner email without touching the others, because contract test files run side by side
 * and `set_owner_emails` replaces the whole list. Returns how to take it off again.
 */
export const addOwnerEmail = async (email: string): Promise<() => Promise<void>> => {
  const { error } = await serviceClient()
    .from('owner_emails')
    .insert({ email: email.toLowerCase() });
  if (error) throw error;
  return removeOwnerEmail(email);
};

export const removeOwnerEmail = (email: string) => async (): Promise<void> => {
  const { error } = await serviceClient()
    .from('owner_emails')
    .delete()
    .eq('email', email.toLowerCase());
  if (error) throw error;
};

/** A Singer whose verified email is an owner email. */
export const signInNewOwner = async (): Promise<TestSinger> => {
  const owner = await signInNewSinger();
  await addOwnerEmail(owner.email);
  return owner;
};

/** A Singer with the built-in Admin Role, who is not an Owner. */
export const signInNewAdmin = async (): Promise<TestSinger> => {
  const admin = await signInNewSinger();
  await makeAdmin(admin);
  return admin;
};

/** The ids of the Roles a Singer holds, read with the service role. */
export const rolesHeldBy = async (singer: Pick<TestSinger, 'id'>): Promise<readonly string[]> => {
  const { data, error } = await serviceClient()
    .from('singer_roles')
    .select('role_id')
    .eq('singer_id', singer.id);
  if (error) throw error;
  return data.map(({ role_id }) => role_id);
};

/** The id of the Role with this name (any case). Throws when there is none. */
export const roleIdNamed = async (name: string): Promise<string> => {
  const { data, error } = await serviceClient().from('roles').select('id').ilike('name', name);
  if (error) throw error;
  const [role] = data;
  if (role === undefined) throw new Error(`no Role named ${name}`);
  return role.id;
};

/** Builds a Role through the admin portal's own call, as this Singer. Throws if it is refused. */
export const createRoleAs = async (
  singer: Pick<TestSinger, 'client'>,
  name: string,
  permissions: readonly Permission[],
): Promise<string> => {
  const { data, error } = await singer.client.rpc('admin_create_role', {
    role_name: name,
    perms: [...permissions],
  });
  if (error) throw error;
  return data;
};

/** A Singer who may run the admin portal but is neither an Owner nor an Admin: just `manage-users`. */
export const signInNewManager = async (): Promise<TestSinger> => {
  const manager = await signInNewSinger();
  await grantRole(manager, ['read', 'manage-users']);
  return manager;
};
