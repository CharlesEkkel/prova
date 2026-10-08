import { redirect } from '@sveltejs/kit';
import { mayOpenAdmin } from '../../lib/core/admin-rules';
import { paths } from '../../lib/core/paths';
import { sidebarPerformances, type SidebarPerformance } from '../../lib/core/performances';
import type { LayoutServerLoad } from './$types';

// Performances arrive with #20; until then the sidebar has none to list.
const performances: readonly SidebarPerformance[] = [];

export const load: LayoutServerLoad = ({ locals: { visitor } }) => {
  // The gate lets only a ready Singer in here; anyone else goes back through it.
  if (visitor.stage !== 'ready') redirect(303, paths.home);
  return {
    singerName: visitor.singer.displayName,
    voicePartName: visitor.voicePart.name,
    // Only a ready Singer sees the Admin link; the admin routes refuse everyone else regardless.
    showAdminLink: mayOpenAdmin(visitor.permissions),
    performances: sidebarPerformances(performances, new Date()),
  };
};
