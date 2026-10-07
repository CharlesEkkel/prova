// Ends this device's session only, then back to the sign-in screen.
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { signOutHere } from '../../lib/shell/auth';
import { failureOrNull } from '../../lib/shell/run';

export const POST: RequestHandler = async ({ locals }) => {
  // A failed sign-out still ends on the sign-in screen; the gate decides from there.
  await failureOrNull(signOutHere(locals.supabase));
  return redirect(303, '/sign-in');
};
