// Every request: build a Supabase client from the cookies, work out how far through sign-in the
// person is, and let the gate decide before any page renders.
import { error, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { Effect } from 'effect';
import { resolveGate } from './lib/core/gate';
import { loadSession } from './lib/shell/session';
import { createRequestSupabase } from './lib/shell/supabase';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createRequestSupabase(event.cookies);
  const session = await Effect.runPromise(
    loadSession(supabase).pipe(Effect.orElseSucceed(() => null)),
  );
  if (session === null) {
    error(503, 'Prova cannot check your access right now. Try again in a moment.');
  }
  // `locals` is read-only in its type but SvelteKit expects it filled in here, once per request.
  Object.assign(event.locals, { supabase, session });

  const decision = resolveGate(session.stage, `${event.url.pathname}${event.url.search}`);
  if (decision.kind === 'redirect') redirect(303, decision.to);

  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range',
  });
  // Pages differ per person, so a shared cache must never keep them.
  if (response.headers.get('content-type')?.includes('text/html') === true) {
    response.headers.set('cache-control', 'private');
  }
  return response;
};
