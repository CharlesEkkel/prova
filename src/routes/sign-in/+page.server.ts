import { fail, redirect } from '@sveltejs/kit';
import { safeNextPath } from '../../lib/core/gate';
import { destinationCookie, destinationCookieOptions } from '../../lib/shell/destination-cookie';
import { supabaseOrigin } from '../../lib/shell/supabase';
import type { Actions, PageServerLoad } from './$types';

const messages: Readonly<Record<string, string>> = {
  cancelled: 'Sign-in was cancelled. Try again when you are ready.',
  failed: 'We could not sign you in with Google. Please try again.',
};

export const load: PageServerLoad = ({ url }) => {
  const code = url.searchParams.get('error');
  return {
    problem: code === null ? null : (messages[code] ?? messages['failed'] ?? null),
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

    const { data, error } = await locals.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${url.origin}/auth/callback`, skipBrowserRedirect: true },
    });
    if (error !== null) {
      return fail(502, { problem: messages['failed'] ?? null });
    }
    return redirect(303, data.url, { external: [supabaseOrigin] });
  },
};
