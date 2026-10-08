import {
  createRole,
  deleteRole,
  runAdminAction,
  updateRole,
} from '../../../../lib/shell/admin-commands';
import type { Actions } from './$types';

export const actions: Actions = {
  create: ({ locals, request }) => runAdminAction(createRole, locals.supabase, request),
  update: ({ locals, request }) => runAdminAction(updateRole, locals.supabase, request),
  delete: ({ locals, request }) => runAdminAction(deleteRole, locals.supabase, request),
};
