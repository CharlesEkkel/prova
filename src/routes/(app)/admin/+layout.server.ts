import { error } from '@sveltejs/kit';
import { mayOpenAdmin } from '../../../lib/core/admin-rules';
import { loadRoles, loadSingers } from '../../../lib/shell/admin';
import { valueOrNull } from '../../../lib/shell/run';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { visitor } = locals;
  // The database refuses the admin operations too; this keeps the screens from rendering at all.
  if (visitor.stage !== 'ready' || !mayOpenAdmin(visitor.permissions)) {
    error(403, 'You do not have access to the admin portal.');
  }
  // Both tabs (and the counts on them) read the same two lists.
  const [singers, roles] = await Promise.all([
    valueOrNull(loadSingers(locals.supabase)),
    valueOrNull(loadRoles(locals.supabase)),
  ]);
  if (singers === null || roles === null) {
    error(503, 'The admin portal could not be loaded. Try again in a moment.');
  }
  return { permissions: visitor.permissions, singers, roles };
};
