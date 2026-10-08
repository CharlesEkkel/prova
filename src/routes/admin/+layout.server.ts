import { error } from '@sveltejs/kit';
import { mayOpenAdmin } from '../../lib/core/admin-rules';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals: { visitor } }) => {
  // The database refuses the admin operations too; this keeps the screens from rendering at all.
  if (visitor.stage !== 'ready' || !mayOpenAdmin(visitor.permissions)) {
    error(403, 'You do not have access to the admin portal.');
  }
  return { permissions: visitor.permissions };
};
