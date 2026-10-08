// Google sends the person back here with a one-time code, which becomes their session.
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { safeNextPath } from '../../../lib/core/gate';
import { finishGoogleSignIn, signInProblemPath } from '../../../lib/shell/auth';
import { destinationCookie, destinationCookieOptions } from '../../../lib/shell/destination-cookie';
import { failureOrNull } from '../../../lib/shell/run';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const destination = safeNextPath(cookies.get(destinationCookie) ?? null);
  cookies.delete(destinationCookie, destinationCookieOptions);

  const problem = await failureOrNull(finishGoogleSignIn(locals.supabase, url.searchParams));
  return redirect(303, problem === null ? destination : signInProblemPath(problem, destination));
};
