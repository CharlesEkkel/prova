import { error, fail } from '@sveltejs/kit';
import {
  adminProblemMessages,
  loadRoles,
  loadSingers,
  removeSinger,
  setSingerRoles,
} from '../../lib/shell/admin';
import { failureOrNull, valueOrNull } from '../../lib/shell/run';
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
  setRoles: async ({ locals, request }) => {
    const problem = await failureOrNull(setSingerRoles(locals.supabase, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
  // Declining a Pending Singer and removing a Singer are the same change; only the wording differs.
  remove: async ({ locals, request }) => {
    const problem = await failureOrNull(removeSinger(locals.supabase, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
};
