// A Score's PDF, at an address that never changes. See serve-file.ts and ADR 0003. pdf.js loads
// this path, and `Range` goes through so it can fetch the pages it needs without the whole file.
import { error } from '@sveltejs/kit';
import { pieceIdOf } from '../../../../../../../lib/core/pieces';
import { scoreIdOf } from '../../../../../../../lib/core/scores';
import { valueOrNull } from '../../../../../../../lib/shell/run';
import { serveStoredFile } from '../../../../../../../lib/shell/serve-file';
import { loadObjectPath } from '../../../../../../../lib/shell/stored-files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, request }) => {
  const piece = pieceIdOf(params.pieceId);
  const score = scoreIdOf(params.scoreId);
  if (piece === null || score === null) error(404, 'There is no such Score.');

  const path = await valueOrNull(loadObjectPath(locals.supabase, 'scores', piece, score));
  if (path === null) error(404, 'There is no such Score.');

  return serveStoredFile(locals.supabase, 'scores', path, request, {
    missing: 'There is no such Score.',
    unavailable: 'The Score could not be loaded. Try again in a moment.',
  });
};
