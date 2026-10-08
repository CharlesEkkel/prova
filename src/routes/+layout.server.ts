import { mayOpenAdmin } from '../lib/core/admin-rules';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals: { visitor } }) => ({
  // Only a ready Singer sees the Admin link; the admin routes refuse everyone else regardless.
  showAdminLink: visitor.stage === 'ready' && mayOpenAdmin(visitor.permissions),
});
