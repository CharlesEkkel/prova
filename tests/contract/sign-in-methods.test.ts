// Backend contract seam: Google is the only way in. Nobody can sign up by calling Auth directly.
import { describe, expect, it } from 'vitest';
import { anonClient, serviceClient } from './support';

describe('signing up', () => {
  it('is not possible with an email and password', async () => {
    const email = `walk-in-${crypto.randomUUID()}@example.test`;

    const { error } = await anonClient().auth.signUp({ email, password: 'a-fine-password-1' });

    expect(error).not.toBeNull();
    const recorded = await serviceClient().from('singers').select('id').eq('email', email);
    expect(recorded.data).toEqual([]);
  });

  it('is not possible anonymously', async () => {
    const { error } = await anonClient().auth.signInAnonymously();

    expect(error).not.toBeNull();
  });
});
