// Shell: the only place the Supabase client is created. Reads public environment variables only.
// The session lives in cookies the server reads and writes, so the gate decides before any HTML.
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { Data, Effect, Schema } from 'effect';
import type { Database } from './database.types';

const PublicEnv = Schema.Struct({
  PUBLIC_SUPABASE_URL: Schema.optional(Schema.String),
  PUBLIC_SUPABASE_ANON_KEY: Schema.optional(Schema.String),
});
const publicEnv = Schema.decodeUnknownSync(PublicEnv)(import.meta.env);

/** The local Supabase stack, when no URL is configured. */
const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';

export type Supabase = SupabaseClient<Database>;

/** Where Supabase Auth lives; the only place the sign-in action may send a person off-site. */
export const supabaseOrigin = new URL(supabaseUrl).origin;

/** A client acting as whoever the request's cookies say they are (or no one). */
export const createRequestSupabase = (cookies: Cookies): Supabase =>
  createServerClient<Database>(supabaseUrl, publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? '', {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => {
          // The browser never needs the session, only the server does.
          cookies.set(name, value, { ...options, path: '/', httpOnly: true });
        });
      },
    },
  });

export class SupabaseCallFailed extends Data.TaggedError('SupabaseCallFailed')<{
  readonly cause: unknown;
}> {}

/** How every Supabase call answers: some data, or an error. */
type Reply = { readonly data?: unknown; readonly error: unknown };

/** Decodes what Supabase sent, once, here at the edge. */
export const decodeReply =
  <A>(schema: Schema.Decoder<A>) =>
  (data: unknown): Effect.Effect<A, SupabaseCallFailed> =>
    Schema.decodeUnknownEffect(schema)(data).pipe(
      Effect.mapError((cause) => new SupabaseCallFailed({ cause })),
    );

/** Runs a Supabase call, failing when it rejects or replies with an error. */
export const callSupabase = (
  run: () => PromiseLike<Reply>,
): Effect.Effect<unknown, SupabaseCallFailed> =>
  Effect.tryPromise({ try: run, catch: (cause) => new SupabaseCallFailed({ cause }) }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null ? Effect.succeed(data) : Effect.fail(new SupabaseCallFailed({ cause: error })),
    ),
  );

/** Runs a Supabase call and decodes the data it replies with. */
export const callSupabaseAs = <A>(
  schema: Schema.Decoder<A>,
  run: () => PromiseLike<Reply>,
): Effect.Effect<A, SupabaseCallFailed> =>
  callSupabase(run).pipe(Effect.flatMap(decodeReply(schema)));
