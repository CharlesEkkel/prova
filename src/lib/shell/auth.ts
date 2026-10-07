// Shell: signing in with Google and out again, through Supabase Auth.
import { Effect, Schema } from 'effect';
import { callbackPath } from '../core/gate';
import { callSupabase, callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

/** Why sign-in did not finish, as carried back to the sign-in screen in `?error=`. */
export const SignInProblem = Schema.Literals(['cancelled', 'failed']);
export type SignInProblem = typeof SignInProblem.Type;

const isSignInProblem = Schema.is(SignInProblem);

/** The sign-in screen, showing this problem. */
export const signInProblemPath = (problem: SignInProblem): string => `/sign-in?error=${problem}`;

/** Reads `?error=`: no problem, a known one, or anything else counted as `failed`. */
export const signInProblemFrom = (raw: string | null): SignInProblem | null => {
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
      options: { redirectTo: `${origin}${callbackPath}`, skipBrowserRedirect: true },
    }),
  ).pipe(Effect.map(({ url }) => url));

/** Turns the one-time code Google sent back into a session, stored in cookies. */
export const finishGoogleSignIn = (
  supabase: Supabase,
  code: string,
): Effect.Effect<void, SupabaseCallFailed> =>
  callSupabase(() => supabase.auth.exchangeCodeForSession(code)).pipe(Effect.asVoid);

/** Ends this device's session only, leaving the Singer's other devices signed in. */
export const signOutHere = (supabase: Supabase): Effect.Effect<void, SupabaseCallFailed> =>
  callSupabase(() => supabase.auth.signOut({ scope: 'local' })).pipe(Effect.asVoid);
