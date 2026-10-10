// Shell: serves a stored file at an address that never changes. Only a signed-in Singer with `read`
// gets it (the gate turns everyone else away, and the file is read as the Singer, so the database
// policies decide again). Seeking works because `Range` goes straight through. The browser may keep
// it for the app's usual hour. See ADR 0003.
import { error } from '@sveltejs/kit';
import { privateCacheControl } from '../core/cache';
import { valueOrNull } from './run';
import { openFile, type Bucket } from './storage';
import type { Supabase } from './supabase';

/** What the storage service says about the bytes, passed on as it said it. */
const forwardedHeaders = [
  'content-type',
  'content-length',
  'content-range',
  'etag',
  'last-modified',
];

/**
 * The file at `path` in `bucket`, answering the request's `Range`. `missing` and `unavailable` are
 * what the Singer is told when the file is not there or could not be loaded.
 */
export const serveStoredFile = async (
  supabase: Supabase,
  bucket: Bucket,
  path: string,
  request: Request,
  messages: { readonly missing: string; readonly unavailable: string },
): Promise<Response> => {
  const stored = await valueOrNull(openFile(supabase, bucket, path, request.headers.get('range')));
  if (stored === null) error(503, messages.unavailable);
  if (stored.status === 416) return new Response(null, { status: 416 });
  if (!stored.ok) error(404, messages.missing);

  const headers = new Headers(
    Object.fromEntries(
      forwardedHeaders.flatMap((name) => {
        const value = stored.headers.get(name);
        return value === null ? [] : [[name, value]];
      }),
    ),
  );
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', privateCacheControl);
  return new Response(stored.body, { status: stored.status, headers });
};
