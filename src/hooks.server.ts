// Every request: build a Supabase client from the cookies, work out how far through sign-in the
// person is, and let the gate decide before any page renders.
import { error, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { accessUnknown, resolveGate } from './lib/core/gate';
import { valueOrNull } from './lib/shell/run';
import { loadVisitor } from './lib/shell/visitor';
import { createRequestSupabase } from './lib/shell/supabase';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createRequestSupabase(event.cookies);
  const visitor = (await valueOrNull(loadVisitor(supabase))) ?? accessUnknown;
  // `locals` is read-only in its type but SvelteKit expects it filled in here, once per request.
  Object.assign(event.locals, { supabase, visitor });

  const decision = resolveGate(visitor.stage, `${event.url.pathname}${event.url.search}`);
  if (decision.kind === 'redirect') redirect(303, decision.to);
  if (decision.kind === 'unavailable') {
    error(503, 'Prova cannot check your access right now. Try again in a moment.');
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range',
  });
  // Pages differ per person, so a shared cache must never keep them.
  if (response.headers.get('content-type')?.includes('text/html') === true) {
    response.headers.set('cache-control', 'private');
  }
  return response;
};
