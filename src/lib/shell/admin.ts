// Shell: what the admin portal reads. The writes are in admin-commands.ts. Every call is an RPC
// that checks the caller's Permissions in the database; nothing here decides who may do what.
import { Effect, Schema } from 'effect';
import { permissions } from '../core/permissions';
import { callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

const Uuid = Schema.String.check(Schema.isUUID());
export const RoleId = Uuid.pipe(Schema.brand('RoleId'));
export type RoleId = typeof RoleId.Type;
export const AdminSingerId = Uuid.pipe(Schema.brand('AdminSingerId'));
export type AdminSingerId = typeof AdminSingerId.Type;

export const RoleName = Schema.NonEmptyString.pipe(Schema.brand('RoleName'));
const DisplayName = Schema.NonEmptyString.pipe(Schema.brand('DisplayName'));
const Email = Schema.NonEmptyString.pipe(Schema.brand('Email'));
const VoicePartName = Schema.NonEmptyString.pipe(Schema.brand('VoicePartName'));
const SingerCount = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const PermissionName = Schema.Literals(permissions);

/** How a Singer signed up. Only direct sign-in exists until Invite Links (#25). */
const SignedUpVia = Schema.Literals(['Direct']);

const RoleRow = Schema.Struct({
  id: RoleId,
  name: RoleName,
  isBuiltin: Schema.Boolean,
  permissions: Schema.Array(PermissionName),
  singerCount: SingerCount,
}).pipe(Schema.encodeKeys({ isBuiltin: 'is_builtin', singerCount: 'singer_count' }));
export type RoleRow = typeof RoleRow.Type;

const SingerRow = Schema.Struct({
  id: AdminSingerId,
  displayName: DisplayName,
  email: Email,
  voicePart: Schema.NullOr(VoicePartName),
  signedUpVia: SignedUpVia,
  isOwner: Schema.Boolean,
  permissions: Schema.Array(PermissionName),
  roles: Schema.Array(Schema.Struct({ id: RoleId, name: RoleName })),
}).pipe(
  Schema.encodeKeys({
    displayName: 'display_name',
    voicePart: 'voice_part',
    signedUpVia: 'signed_up_via',
    isOwner: 'is_owner',
  }),
);
export type SingerRow = typeof SingerRow.Type;

/** Every Role with its Permissions and how many Singers hold it. */
export const loadRoles = (
  supabase: Supabase,
): Effect.Effect<readonly RoleRow[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(RoleRow), () => supabase.rpc('admin_roles'));

/** Every Singer with their Roles; the ones without `read` are the Pending Singers. */
export const loadSingers = (
  supabase: Supabase,
): Effect.Effect<readonly SingerRow[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(SingerRow), () => supabase.rpc('admin_singers'));
