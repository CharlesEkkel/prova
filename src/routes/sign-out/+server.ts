// Ends this device's session only, then back to the sign-in screen.
import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals }) => {
  await locals.supabase.auth.signOut({ scope: 'local' });
  return redirect(303, '/sign-in');
};
