// A Practice Track's audio, at an address that never changes. See serve-file.ts and ADR 0003.
import { error } from '@sveltejs/kit';
import { pieceIdOf } from '../../../../../../../lib/core/pieces';
import { trackIdOf } from '../../../../../../../lib/core/practice-tracks';
import { valueOrNull } from '../../../../../../../lib/shell/run';
import { serveStoredFile } from '../../../../../../../lib/shell/serve-file';
import { loadObjectPath } from '../../../../../../../lib/shell/stored-files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, request }) => {
  const piece = pieceIdOf(params.pieceId);
  const track = trackIdOf(params.trackId);
  if (piece === null || track === null) error(404, 'There is no such Practice Track.');

  const path = await valueOrNull(loadObjectPath(locals.supabase, 'practice_tracks', piece, track));
  if (path === null) error(404, 'There is no such Practice Track.');

  return serveStoredFile(locals.supabase, 'practice-tracks', path, request, {
    missing: 'There is no such Practice Track.',
    unavailable: 'The audio could not be loaded. Try again in a moment.',
  });
};
