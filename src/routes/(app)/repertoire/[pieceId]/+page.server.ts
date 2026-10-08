import { error } from '@sveltejs/kit';
import { pieceIdOf } from '../../../../lib/core/pieces';
import { loadPiece } from '../../../../lib/shell/pieces';
import { valueOrNull } from '../../../../lib/shell/run';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = pieceIdOf(params.pieceId);
  if (id === null) error(404, 'There is no such Piece.');
  const piece = await valueOrNull(loadPiece(locals.supabase, id));
  if (piece === null) error(404, 'There is no such Piece.');
  return { piece };
};
