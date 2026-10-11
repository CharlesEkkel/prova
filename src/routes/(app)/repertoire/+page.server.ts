import { error } from '@sveltejs/kit';
import { formActions } from '../../../lib/core/paths';
import { mayChangeRunningOrder } from '../../../lib/core/performances';
import { mayAddPiece, pieceActionsFor } from '../../../lib/core/pieces';
import { loadPerformanceEntries } from '../../../lib/shell/performances';
import { loadRepertoire } from '../../../lib/shell/pieces';
import {
  runAddPiece,
  runPieceAction,
  updatePiece,
  deletePiece,
} from '../../../lib/shell/piece-commands';
import { valueOrNull } from '../../../lib/shell/run';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { visitor } = locals;
  const held = visitor.stage === 'ready' ? visitor.permissions : [];
  const mayAddToPerformances = mayChangeRunningOrder(held);
  const [pieces, performanceEntries] = await Promise.all([
    valueOrNull(loadRepertoire(locals.supabase)),
    // "Add to a Performance…" ticks the ones each Piece is in already.
    mayAddToPerformances
      ? valueOrNull(loadPerformanceEntries(locals.supabase))
      : Promise.resolve([]),
  ]);
  if (pieces === null || performanceEntries === null) {
    error(503, 'The Repertoire could not be loaded. Try again in a moment.');
  }
  // The database enforces these; they only decide what to show.
  return {
    pieces,
    performanceEntries,
    mayAdd: mayAddPiece(held),
    rowActions: pieceActionsFor(held),
    mayAddToPerformances,
  };
};

export const actions: Actions = {
  [formActions.pieces.create]: ({ locals, request }) => runAddPiece(locals.supabase, request),
  [formActions.pieces.update]: ({ locals, request }) =>
    runPieceAction(updatePiece, locals.supabase, request),
  [formActions.pieces.delete]: ({ locals, request }) =>
    runPieceAction(deletePiece, locals.supabase, request),
};
