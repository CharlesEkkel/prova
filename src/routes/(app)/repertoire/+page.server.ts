import { error } from '@sveltejs/kit';
import { formActions } from '../../../lib/core/paths';
import { mayAddPiece, pieceActionsFor } from '../../../lib/core/pieces';
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
  const pieces = await valueOrNull(loadRepertoire(locals.supabase));
  if (pieces === null) error(503, 'The Repertoire could not be loaded. Try again in a moment.');
  const { visitor } = locals;
  const held = visitor.stage === 'ready' ? visitor.permissions : [];
  // The database enforces these; they only decide what to show.
  return { pieces, mayAdd: mayAddPiece(held), rowActions: pieceActionsFor(held) };
};

export const actions: Actions = {
  [formActions.pieces.create]: ({ locals, request }) => runAddPiece(locals.supabase, request),
  [formActions.pieces.update]: ({ locals, request }) =>
    runPieceAction(updatePiece, locals.supabase, request),
  [formActions.pieces.delete]: ({ locals, request }) =>
    runPieceAction(deletePiece, locals.supabase, request),
};
