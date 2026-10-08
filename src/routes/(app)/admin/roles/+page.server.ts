import { formActions } from '../../../../lib/core/paths';
import {
  createRole,
  deleteRole,
  runAdminAction,
  updateRole,
} from '../../../../lib/shell/admin-commands';
import type { Actions } from './$types';

export const actions: Actions = {
  [formActions.roles.create]: ({ locals, request }) =>
    runAdminAction(createRole, locals.supabase, request),
  [formActions.roles.update]: ({ locals, request }) =>
    runAdminAction(updateRole, locals.supabase, request),
  [formActions.roles.delete]: ({ locals, request }) =>
    runAdminAction(deleteRole, locals.supabase, request),
};
