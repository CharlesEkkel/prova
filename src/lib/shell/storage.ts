// Shell: the one module that touches the stored files. Everything that uploads, plays or removes an
// audio file goes through here, so storage can move later (for example to Cloudflare R2) without
// touching the rest of the app. Files are private; the bucket's policies decide who may do what.
import { Effect, Schema } from 'effect';
import {
  trackFilePath,
  uploadProblemOfStatus,
  type UploadFileProblem,
} from '../core/practice-tracks';
import {
  callSupabase,
  callSupabaseAs,
  supabaseAnonKey,
  trySupabase,
  type Supabase,
  type SupabaseCallFailed,
} from './supabase';

const bucket = 'practice-tracks';

/** Where and how a browser may put one new file: a one-use address for a path chosen here. */
export type UploadTicket = {
  readonly path: string;
  readonly url: string;
  /** The public key the storage gateway wants beside the ticket. */
  readonly apiKey: string;
};

const SignedUpload = Schema.Struct({ signedUrl: Schema.String, path: Schema.String });
const SignedDownload = Schema.Struct({ signedUrl: Schema.String });

/** A ticket to upload a track's file for this Piece; it works only if the Singer may `append`. */
export const startUpload = (
  supabase: Supabase,
  pieceId: string,
  extension: string,
): Effect.Effect<UploadTicket, SupabaseCallFailed> =>
  Effect.suspend(() => {
    const wanted = trackFilePath(pieceId, crypto.randomUUID(), extension);
    return callSupabaseAs(SignedUpload, () =>
      supabase.storage.from(bucket).createSignedUploadUrl(wanted),
    ).pipe(
      Effect.map(({ signedUrl, path }) => ({ path, url: signedUrl, apiKey: supabaseAnonKey })),
    );
  });

/**
 * A track's file, as the storage service answers for these bytes (`range` is the browser's `Range`
 * header, passed straight through so seeking works). It is read as the Singer, so only a Singer with
 * `read` gets it; the short-lived address it is fetched from never leaves the server.
 */
export const openFile = (
  supabase: Supabase,
  path: string,
  range: string | null,
): Effect.Effect<Response, SupabaseCallFailed> =>
  callSupabaseAs(SignedDownload, () =>
    supabase.storage.from(bucket).createSignedUrl(path, 60),
  ).pipe(
    Effect.flatMap(({ signedUrl }) =>
      trySupabase(() => fetch(signedUrl, range === null ? {} : { headers: { range } })),
    ),
  );

/** Removes stored files. Needs `delete`; a missing file is not an error. */
export const removeFiles = (
  supabase: Supabase,
  paths: readonly string[],
): Effect.Effect<void, SupabaseCallFailed> =>
  paths.length === 0
    ? Effect.void
    : callSupabase(() => supabase.storage.from(bucket).remove([...paths])).pipe(Effect.asVoid);

/** How an upload ended: the file is stored, or why not. */
export type UploadResult =
  { readonly ok: true } | { readonly ok: false; readonly problem: UploadFileProblem | 'failed' };

/**
 * Sends a file to its ticket from the browser, reporting progress from 0 to 1. The content type is
 * the one chosen from the file's extension, which is what the bucket checks.
 */
export const uploadFile = (
  ticket: UploadTicket,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<UploadResult> =>
  new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('PUT', ticket.url);
    request.setRequestHeader('apikey', ticket.apiKey);
    request.setRequestHeader('x-upsert', 'false');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener('load', () => {
      resolve(
        request.status >= 200 && request.status < 300
          ? { ok: true }
          : { ok: false, problem: uploadProblemOfStatus(request.status) },
      );
    });
    request.addEventListener('error', () => {
      resolve({ ok: false, problem: 'failed' });
    });
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file.slice(0, file.size, contentType), file.name);
    request.send(body);
  });
