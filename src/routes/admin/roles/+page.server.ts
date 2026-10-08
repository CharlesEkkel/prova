import { error, fail } from '@sveltejs/kit';
import {
  adminProblemMessages,
  createRole,
  deleteRole,
  loadRoles,
  updateRole,
} from '../../../lib/shell/admin';
import { failureOrNull, valueOrNull } from '../../../lib/shell/run';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const roles = await valueOrNull(loadRoles(locals.supabase));
  if (roles === null) error(503, 'The Roles could not be loaded. Try again in a moment.');
  return { roles };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const problem = await failureOrNull(createRole(locals.supabase, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
  update: async ({ locals, request }) => {
    const problem = await failureOrNull(updateRole(locals.supabase, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
  delete: async ({ locals, request }) => {
    const problem = await failureOrNull(deleteRole(locals.supabase, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
};
