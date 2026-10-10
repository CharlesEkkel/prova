// A Practice Track's audio, at an address that never changes. Only a signed-in Singer with `read`
// gets it (the gate turns everyone else away, and the file is read as the Singer, so the database
// policies decide again). Seeking works because `Range` goes straight through. The browser may keep
// it for the app's usual hour. See ADR 0003.
import { error } from '@sveltejs/kit';
import { privateCacheControl } from '../../../../../../../lib/core/cache';
import { pieceIdOf } from '../../../../../../../lib/core/pieces';
import { trackIdOf } from '../../../../../../../lib/core/practice-tracks';
import { loadTrackFile } from '../../../../../../../lib/shell/practice-tracks';
import { valueOrNull } from '../../../../../../../lib/shell/run';
import { openFile } from '../../../../../../../lib/shell/storage';
import type { RequestHandler } from './$types';

/** What the storage service says about the bytes, passed on as it said it. */
const passedOn = ['content-type', 'content-length', 'content-range', 'etag', 'last-modified'];

export const GET: RequestHandler = async ({ locals, params, request }) => {
  const piece = pieceIdOf(params.pieceId);
  const track = trackIdOf(params.trackId);
  if (piece === null || track === null) error(404, 'There is no such Practice Track.');

  const path = await valueOrNull(loadTrackFile(locals.supabase, piece, track));
  if (path === null) error(404, 'There is no such Practice Track.');

  const stored = await valueOrNull(openFile(locals.supabase, path, request.headers.get('range')));
  if (stored === null) error(503, 'The audio could not be loaded. Try again in a moment.');
  if (stored.status === 416) return new Response(null, { status: 416 });
  if (!stored.ok) error(404, 'There is no such Practice Track.');

  const headers = new Headers(
    Object.fromEntries(
      passedOn.flatMap((name) => {
        const value = stored.headers.get(name);
        return value === null ? [] : [[name, value]];
      }),
    ),
  );
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', privateCacheControl);
  return new Response(stored.body, { status: stored.status, headers });
};
