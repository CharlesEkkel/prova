import { removeSinger, runAdminAction, setSingerRoles } from '../../../lib/shell/admin-commands';
import type { Actions } from './$types';

export const actions: Actions = {
  // Approving a Pending Singer and editing a Singer's Roles are the same change.
  setRoles: ({ locals, request }) => runAdminAction(setSingerRoles, locals.supabase, request),
  // Declining a Pending Singer and removing a Singer are the same change; only the wording differs.
  remove: ({ locals, request }) => runAdminAction(removeSinger, locals.supabase, request),
};
