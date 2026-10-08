// Shell: the admin portal's writes. Each command reads its form once, then calls one RPC; the
// database decides whether the caller may.
import { fail, type ActionFailure } from '@sveltejs/kit';
import { Effect, Schema, SchemaGetter } from 'effect';
import { adminProblemMessages, type AdminProblem } from '../core/admin-problems';
import { AdminSingerId, PermissionName, RoleId } from './admin';
import { failureOrNull } from './run';
import { callSupabase, SupabaseCallFailed, type Supabase } from './supabase';

const ErrorCode = Schema.Struct({ code: Schema.String });
const isErrorCode = Schema.is(ErrorCode);

const problemOf = ({ cause }: SupabaseCallFailed): AdminProblem => {
  if (!isErrorCode(cause)) return 'failed';
  if (cause.code === '42501') return 'not-allowed';
  if (cause.code === '23505') return 'name-taken';
  return cause.code === '22023' || cause.code === 'P0002' ? 'invalid' : 'failed';
};

/** A Role's name as typed: trimmed, and not empty. */
const RoleNameInput = Schema.String.pipe(
  Schema.decode({
    decode: SchemaGetter.transform((name: string) => name.trim()),
    encode: SchemaGetter.transform((name: string) => name),
  }),
).check(Schema.isNonEmpty());

const NewRoleForm = Schema.Struct({
  name: RoleNameInput,
  permissions: Schema.Array(PermissionName),
});
const EditRoleForm = Schema.Struct({ ...NewRoleForm.fields, role: RoleId });
const RoleForm = Schema.Struct({ role: RoleId });
const SingerRolesForm = Schema.Struct({ singer: AdminSingerId, roles: Schema.Array(RoleId) });
const SingerForm = Schema.Struct({ singer: AdminSingerId });

/** A form's fields, with the repeated ones (`permission`, `role`) gathered into arrays. */
const fieldsOf = (form: FormData): Readonly<Record<string, unknown>> => ({
  ...Object.fromEntries(form),
  name: form.get('name') ?? '',
  permissions: form.getAll('permission'),
  roles: form.getAll('role'),
});

type RpcReply = PromiseLike<{ readonly data?: unknown; readonly error: unknown }>;

/** A command: decode the submitted form, then make one RPC call with what it said. */
const command =
  <A, I>(schema: Schema.Codec<A, I>, call: (supabase: Supabase, input: A) => RpcReply) =>
  (supabase: Supabase, request: Request): Effect.Effect<void, AdminProblem> =>
    Effect.tryPromise(() => request.formData()).pipe(
      Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(fieldsOf(form))),
      Effect.mapError((): AdminProblem => 'invalid'),
      Effect.flatMap((input) =>
        callSupabase(() => call(supabase, input)).pipe(Effect.mapError(problemOf)),
      ),
      Effect.asVoid,
    );

export const createRole = command(NewRoleForm, (supabase, { name, permissions }) =>
  supabase.rpc('admin_create_role', { role_name: name, perms: [...permissions] }),
);

export const updateRole = command(EditRoleForm, (supabase, { role, name, permissions }) =>
  supabase.rpc('admin_update_role', { target: role, role_name: name, perms: [...permissions] }),
);

export const deleteRole = command(RoleForm, (supabase, { role }) =>
  supabase.rpc('admin_delete_role', { target: role }),
);

/** Approving a Pending Singer, or editing Roles: makes the ticked Roles the Singer's Roles. */
export const setSingerRoles = command(SingerRolesForm, (supabase, { singer, roles }) =>
  supabase.rpc('admin_set_singer_roles', { target: singer, role_ids: [...roles] }),
);

/** Removing a Singer, or declining a Pending one. */
export const removeSinger = command(SingerForm, (supabase, { singer }) =>
  supabase.rpc('admin_remove_singer', { target: singer }),
);

type Command = typeof createRole;

/** What a form action returns: success, or a refusal carrying the message to show. */
export const runAdminAction = async (
  run: Command,
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ok: true } | ActionFailure<{ readonly problem: string }>> => {
  const problem = await failureOrNull(run(supabase, request));
  return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
};
