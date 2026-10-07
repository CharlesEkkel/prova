// Google sends the person back here with a one-time code, which becomes their session.
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { safeNextPath } from '../../../lib/core/gate';
import { destinationCookie } from '../../../lib/shell/destination-cookie';

const signInProblem = (code: 'cancelled' | 'failed'): string => `/sign-in?error=${code}`;

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const providerError = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const destination = safeNextPath(cookies.get(destinationCookie) ?? null);
  cookies.delete(destinationCookie, { path: '/' });

  if (providerError !== null) {
    return redirect(303, signInProblem(providerError === 'access_denied' ? 'cancelled' : 'failed'));
  }
  if (code === null) return redirect(303, signInProblem('failed'));

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error !== null) return redirect(303, signInProblem('failed'));

  return redirect(303, destination);
};
