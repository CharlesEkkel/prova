// Backend contract seam: how the per-request visitor lookup reads the Auth server's answers. No
// one signed in is not the same as not knowing: only the second may stop the app with a 503.
import { describe, expect, it } from 'vitest';
import { valueOrNull } from '../../src/lib/shell/run';
import { loadVisitor } from '../../src/lib/shell/visitor';
import { anonClient, serviceClient, signInNewSinger } from './support';

/** A fetch that works until `breakAuth`, then answers the Auth server's user lookup with `failure`. */
const breakableFetch = (failure: () => Promise<Response>) => {
  const state = { broken: false };
  const breakable: typeof fetch = (input, init) => {
    const target = input instanceof Request ? input.url : String(input);
    return state.broken && target.includes('/auth/v1/user') ? failure() : fetch(input, init);
  };
  return {
    fetch: breakable,
    breakAuth: () => {
      state.broken = true;
    },
  };
};

describe('the visitor lookup', () => {
  it('finds no one when there is no session', async () => {
    const visitor = await valueOrNull(loadVisitor(anonClient()));

    expect(visitor?.stage).toBe('signed-out');
  });

  it('finds the Singer behind a valid session', async () => {
    const singer = await signInNewSinger();

    const visitor = await valueOrNull(loadVisitor(singer.client));

    expect(visitor?.stage).toBe('needs-voice-part');
  });

  it('finds no one when the Auth server rejects the session', async () => {
    const singer = await signInNewSinger();
    await serviceClient().auth.admin.deleteUser(singer.id);

    const visitor = await valueOrNull(loadVisitor(singer.client));

    expect(visitor?.stage).toBe('signed-out');
  });

  it('does not know who is asking when the Auth server cannot be reached', async () => {
    const { fetch, breakAuth } = breakableFetch(() =>
      Promise.reject(new TypeError('fetch failed')),
    );
    const singer = await signInNewSinger({ fetch });
    breakAuth();

    expect(await valueOrNull(loadVisitor(singer.client))).toBeNull();
  });

  it('does not know who is asking when the Auth server answers with a server error', async () => {
    const { fetch, breakAuth } = breakableFetch(() =>
      Promise.resolve(Response.json({ message: 'unavailable' }, { status: 500 })),
    );
    const singer = await signInNewSinger({ fetch });
    breakAuth();

    expect(await valueOrNull(loadVisitor(singer.client))).toBeNull();
  });
});
