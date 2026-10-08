import { error } from '@sveltejs/kit';
import { loadRoles, loadSingers } from '../../lib/shell/admin';
import { removeSinger, runAdminAction, setSingerRoles } from '../../lib/shell/admin-commands';
import { valueOrNull } from '../../lib/shell/run';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [singers, roles] = await Promise.all([
    valueOrNull(loadSingers(locals.supabase)),
    valueOrNull(loadRoles(locals.supabase)),
  ]);
  if (singers === null || roles === null) {
    error(503, 'The Singers could not be loaded. Try again in a moment.');
  }
  return { singers, roles };
};

export const actions: Actions = {
  // Approving a Pending Singer and editing a Singer's Roles are the same change.
  setRoles: ({ locals, request }) => runAdminAction(setSingerRoles, locals.supabase, request),
  // Declining a Pending Singer and removing a Singer are the same change; only the wording differs.
  remove: ({ locals, request }) => runAdminAction(removeSinger, locals.supabase, request),
};
