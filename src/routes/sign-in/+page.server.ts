import { fail, redirect } from '@sveltejs/kit';
import { safeNextPath } from '../../lib/core/gate';
import { signInProblemFrom, startGoogleSignIn, type SignInProblem } from '../../lib/shell/auth';
import { destinationCookie, destinationCookieOptions } from '../../lib/shell/destination-cookie';
import { valueOrNull } from '../../lib/shell/run';
import { supabaseOrigin } from '../../lib/shell/supabase';
import type { Actions, PageServerLoad } from './$types';

// Never the provider's own error text.
const signInProblemMessages: Readonly<Record<SignInProblem, string>> = {
  cancelled: 'Sign-in was cancelled. Try again when you are ready.',
  failed: 'We could not sign you in with Google. Please try again.',
};

export const load: PageServerLoad = ({ url }) => {
  const problem = signInProblemFrom(url.searchParams.get('error'));
  return {
    problem: problem === null ? null : signInProblemMessages[problem],
    next: safeNextPath(url.searchParams.get('next')),
  };
};

export const actions: Actions = {
  google: async ({ locals, url, cookies }) => {
    cookies.set(
      destinationCookie,
      safeNextPath(url.searchParams.get('next')),
      destinationCookieOptions,
    );

    const googleUrl = await valueOrNull(startGoogleSignIn(locals.supabase, url.origin));
    return googleUrl === null
      ? fail(502, { problem: signInProblemMessages.failed })
      : redirect(303, googleUrl, { external: [supabaseOrigin] });
  },
};
