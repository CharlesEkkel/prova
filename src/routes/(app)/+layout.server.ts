import { error, redirect } from '@sveltejs/kit';
import { mayOpenAdmin } from '../../lib/core/admin-rules';
import { overviewParam, paths } from '../../lib/core/paths';
import {
  mayAddPiecesToPerformances,
  mayCreatePerformance,
  performanceActionsFor,
  performanceIdOf,
  pieceRowActionsFor,
  sidebarPerformances,
} from '../../lib/core/performances';
import { loadChoirTimeZone, loadOverview, loadPerformances } from '../../lib/shell/performances';
import { loadRepertoire } from '../../lib/shell/pieces';
import { valueOrNull } from '../../lib/shell/run';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { visitor, supabase }, url }) => {
  // The gate lets only a ready Singer in here; anyone else goes back through it.
  if (visitor.stage !== 'ready') redirect(303, paths.home);
  const held = visitor.permissions;
  const mayCreate = mayCreatePerformance(held);
  const overviewId = performanceIdOf(url.searchParams.get(overviewParam) ?? '');

  const [performances, choirTimeZone, repertoire, overview] = await Promise.all([
    valueOrNull(loadPerformances(supabase)),
    valueOrNull(loadChoirTimeZone(supabase)),
    // The New Performance dialog offers the Repertoire for its first Pieces.
    mayCreate ? valueOrNull(loadRepertoire(supabase)) : Promise.resolve([]),
    overviewId === null ? Promise.resolve(null) : valueOrNull(loadOverview(supabase, overviewId)),
  ]);
  if (performances === null || choirTimeZone === null || repertoire === null) {
    error(503, 'The Performances could not be loaded. Try again in a moment.');
  }

  return {
    singerName: visitor.singer.displayName,
    voicePartName: visitor.voicePart.name,
    // Only a ready Singer sees the Admin link; the admin routes refuse everyone else regardless.
    showAdminLink: mayOpenAdmin(visitor.permissions),
    performances: sidebarPerformances(performances, new Date()),
    choirTimeZone,
    // The database enforces these; they only decide what to show.
    mayCreatePerformance: mayCreate,
    mayAddPiecesToPerformances: mayAddPiecesToPerformances(held),
    performanceActions: performanceActionsFor(held),
    pieceRowActions: pieceRowActionsFor(held),
    repertoire: repertoire.map(({ id, title, composer }) => ({ id, title, composer })),
    // The Performance whose Overview is open, from `?overview=`; an unknown one opens nothing.
    overview,
  };
};
