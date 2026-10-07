// Backend contract support: real users and real sessions against the local Supabase stack.
// Google itself is never involved; users are created through the admin API instead.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../src/lib/shell/database.types';

export const url = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
export const anonKey = process.env['SUPABASE_ANON_KEY'] ?? '';
export const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

/** Bypasses RLS. Tests use it only to arrange state (grant a Role) or to read back what happened. */
export const serviceClient = (): SupabaseClient<Database> =>
  createClient<Database>(url, serviceRoleKey, clientOptions);

export const anonClient = (): SupabaseClient<Database> =>
  createClient<Database>(url, anonKey, clientOptions);

export type TestSinger = {
  readonly id: string;
  readonly email: string;
  readonly client: SupabaseClient<Database>;
};

type NewSinger = {
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
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

  const client = anonClient();
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
