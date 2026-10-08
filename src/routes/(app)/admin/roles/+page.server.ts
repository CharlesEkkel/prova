import { error } from '@sveltejs/kit';
import { loadRoles } from '../../../../lib/shell/admin';
import {
  createRole,
  deleteRole,
  runAdminAction,
  updateRole,
} from '../../../../lib/shell/admin-commands';
import { valueOrNull } from '../../../../lib/shell/run';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const roles = await valueOrNull(loadRoles(locals.supabase));
  if (roles === null) error(503, 'The Roles could not be loaded. Try again in a moment.');
  return { roles };
};

export const actions: Actions = {
  create: ({ locals, request }) => runAdminAction(createRole, locals.supabase, request),
  update: ({ locals, request }) => runAdminAction(updateRole, locals.supabase, request),
  delete: ({ locals, request }) => runAdminAction(deleteRole, locals.supabase, request),
};
