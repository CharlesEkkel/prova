// Google sends the person back here with a one-time code, which becomes their session.
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { Effect } from 'effect';
import { safeNextPath } from '../../../lib/core/gate';
import { finishGoogleSignIn, signInProblemPath } from '../../../lib/shell/auth';
import { destinationCookie } from '../../../lib/shell/destination-cookie';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const providerError = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const destination = safeNextPath(cookies.get(destinationCookie) ?? null);
  cookies.delete(destinationCookie, { path: '/' });

  if (providerError !== null) {
    return redirect(
      303,
      signInProblemPath(providerError === 'access_denied' ? 'cancelled' : 'failed'),
    );
  }
  if (code === null) return redirect(303, signInProblemPath('failed'));

  const signedIn = await Effect.runPromise(
    finishGoogleSignIn(locals.supabase, code).pipe(
      Effect.match({ onFailure: () => false, onSuccess: () => true }),
    ),
  );
  return redirect(303, signedIn ? destination : signInProblemPath('failed'));
};
