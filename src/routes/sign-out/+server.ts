// Ends this device's session only, then back to the sign-in screen.
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { Effect } from 'effect';
import { signOutHere } from '../../lib/shell/auth';

export const POST: RequestHandler = async ({ locals }) => {
  // A failed sign-out still ends on the sign-in screen, as before; the gate decides from there.
  await Effect.runPromise(signOutHere(locals.supabase).pipe(Effect.ignore));
  return redirect(303, '/sign-in');
};
