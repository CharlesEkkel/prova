// Shell: the admin portal's reads and writes. Every call is an RPC that checks the caller's
// Permissions in the database; nothing here decides who may do what.
import { Effect, Schema } from 'effect';
import { permissions } from '../core/permissions';
import { callSupabase, callSupabaseAs, SupabaseCallFailed, type Supabase } from './supabase';

const Uuid = Schema.String.check(Schema.isUUID());
export const RoleId = Uuid.pipe(Schema.brand('RoleId'));
export type RoleId = typeof RoleId.Type;
export const AdminSingerId = Uuid.pipe(Schema.brand('AdminSingerId'));
export type AdminSingerId = typeof AdminSingerId.Type;

const PermissionName = Schema.Literals(permissions);

const RoleRow = Schema.Struct({
  id: RoleId,
  name: Schema.String,
  isBuiltin: Schema.Boolean,
  permissions: Schema.Array(PermissionName),
  singerCount: Schema.Number,
}).pipe(Schema.encodeKeys({ isBuiltin: 'is_builtin', singerCount: 'singer_count' }));
export type RoleRow = typeof RoleRow.Type;

const SingerRow = Schema.Struct({
  id: AdminSingerId,
  displayName: Schema.String,
  email: Schema.String,
  voicePart: Schema.NullOr(Schema.String),
  signedUpVia: Schema.String,
  isOwner: Schema.Boolean,
  permissions: Schema.Array(PermissionName),
  roles: Schema.Array(Schema.Struct({ id: RoleId, name: Schema.String })),
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

/** Why an admin change was not made, in the terms the screens explain. */
export type AdminProblem = 'not-allowed' | 'name-taken' | 'invalid' | 'failed';

const ErrorCode = Schema.Struct({ code: Schema.String });
const isErrorCode = Schema.is(ErrorCode);

const problemOf = (failure: SupabaseCallFailed): AdminProblem => {
  const { cause } = failure;
  if (!isErrorCode(cause)) return 'failed';
  if (cause.code === '42501') return 'not-allowed';
  if (cause.code === '23505') return 'name-taken';
  return cause.code === '22023' || cause.code === 'P0002' ? 'invalid' : 'failed';
};

export const adminProblemMessages: Readonly<Record<AdminProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  'name-taken': 'A Role with that name already exists.',
  invalid: 'That change is not valid. Check the details and try again.',
  failed: 'That did not work. Try again in a moment.',
};

/** What the Role form sends: a name and the ticked Permissions. */
const RoleForm = Schema.Struct({
  name: Schema.String,
  permissions: Schema.Array(PermissionName),
});

const RoleIdForm = Schema.Struct({ role: RoleId });
const RoleEditForm = Schema.Struct({ ...RoleForm.fields, ...RoleIdForm.fields });
const SingerRolesForm = Schema.Struct({ singer: AdminSingerId, roles: Schema.Array(RoleId) });
const SingerIdForm = Schema.Struct({ singer: AdminSingerId });

/** A form's fields, with repeated ones (`permission`, `role`) gathered into arrays. */
const fieldsOf = (form: FormData): Readonly<Record<string, unknown>> => ({
  ...Object.fromEntries(form),
  name: form.get('name') ?? '',
  permissions: form.getAll('permission'),
  roles: form.getAll('role'),
});

const readForm = <A>(schema: Schema.Decoder<A>, request: Request): Effect.Effect<A, AdminProblem> =>
  Effect.tryPromise(() => request.formData()).pipe(
    Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(fieldsOf(form))),
    Effect.mapError((): AdminProblem => 'invalid'),
  );

const run = (
  call: () => PromiseLike<{ readonly data?: unknown; readonly error: unknown }>,
): Effect.Effect<void, AdminProblem> =>
  callSupabase(call).pipe(Effect.mapError(problemOf), Effect.asVoid);

export const createRole = (supabase: Supabase, request: Request) =>
  readForm(RoleForm, request).pipe(
    Effect.flatMap(({ name, permissions: perms }) =>
      run(() => supabase.rpc('admin_create_role', { role_name: name, perms: [...perms] })),
    ),
  );

export const updateRole = (supabase: Supabase, request: Request) =>
  readForm(RoleEditForm, request).pipe(
    Effect.flatMap(({ name, permissions: perms, role }) =>
      run(() =>
        supabase.rpc('admin_update_role', { target: role, role_name: name, perms: [...perms] }),
      ),
    ),
  );

export const deleteRole = (supabase: Supabase, request: Request) =>
  readForm(RoleIdForm, request).pipe(
    Effect.flatMap(({ role }) => run(() => supabase.rpc('admin_delete_role', { target: role }))),
  );

/** Approving a Pending Singer, or editing Roles: makes the ticked Roles the Singer's Roles. */
export const setSingerRoles = (supabase: Supabase, request: Request) =>
  readForm(SingerRolesForm, request).pipe(
    Effect.flatMap(({ singer, roles }) =>
      run(() => supabase.rpc('admin_set_singer_roles', { target: singer, role_ids: [...roles] })),
    ),
  );

/** Removing a Singer, or declining a Pending one. */
export const removeSinger = (supabase: Supabase, request: Request) =>
  readForm(SingerIdForm, request).pipe(
    Effect.flatMap(({ singer }) =>
      run(() => supabase.rpc('admin_remove_singer', { target: singer })),
    ),
  );
