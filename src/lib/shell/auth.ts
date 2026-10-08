// Shell: signing in with Google and out again, through Supabase Auth.
import { Effect, Schema } from 'effect';
import { paths, signInErrorParam } from '../core/paths';
import { callSupabase, callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

/** Why sign-in did not finish, as carried back to the sign-in screen in `?error=`. */
export const SignInProblem = Schema.Literals(['cancelled', 'failed']);
export type SignInProblem = typeof SignInProblem.Type;

const isSignInProblem = Schema.is(SignInProblem);

/** Reads the sign-in screen's problem: none, a known one, or anything else counted as `failed`. */
export const signInProblemFrom = (query: URLSearchParams): SignInProblem | null => {
  const raw = query.get(signInErrorParam);
  if (raw === null) return null;
  return isSignInProblem(raw) ? raw : 'failed';
};

const OAuthStart = Schema.Struct({ url: Schema.String });

/** Where to send the person to sign in with Google; Google then sends them back to `origin`. */
export const startGoogleSignIn = (
  supabase: Supabase,
  origin: string,
): Effect.Effect<string, SupabaseCallFailed> =>
  callSupabaseAs(OAuthStart, () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}${paths.authCallback}`, skipBrowserRedirect: true },
    }),
  ).pipe(Effect.map(({ url }) => url));

/** What Google sends back to the callback: a one-time code, or an error. */
const GoogleReply = Schema.Struct({
  code: Schema.optional(Schema.NonEmptyString),
  error: Schema.optional(Schema.String),
});
const decodeGoogleReply = Schema.decodeUnknownEffect(GoogleReply);

/** Google says `access_denied` when the person cancelled; any other error is a failure. */
const problemFromGoogle = (error: string): SignInProblem =>
  error === 'access_denied' ? 'cancelled' : 'failed';

/** Turns Google's reply into a session stored in cookies, or says why sign-in did not finish. */
export const finishGoogleSignIn = (
  supabase: Supabase,
  reply: URLSearchParams,
): Effect.Effect<void, SignInProblem> =>
  decodeGoogleReply(Object.fromEntries(reply)).pipe(
    Effect.flatMap(
      ({ code, error }): Effect.Effect<unknown, SignInProblem | SupabaseCallFailed> => {
        if (error !== undefined) return Effect.fail(problemFromGoogle(error));
        if (code === undefined) return Effect.fail<SignInProblem>('failed');
        return callSupabase(() => supabase.auth.exchangeCodeForSession(code));
      },
    ),
    // A reply that does not decode, or a code Supabase refuses, is simply a failed sign-in.
    Effect.mapError((failure) => (isSignInProblem(failure) ? failure : 'failed')),
    Effect.asVoid,
  );

/** Ends this device's session only, leaving the Singer's other devices signed in. */
export const signOutHere = (supabase: Supabase): Effect.Effect<void, SupabaseCallFailed> =>
  callSupabase(() => supabase.auth.signOut({ scope: 'local' })).pipe(Effect.asVoid);
