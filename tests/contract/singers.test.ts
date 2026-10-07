// Backend contract seam: how a signed-in person is recorded as a Singer.
import { describe, expect, it } from 'vitest';
import { serviceClient, signInNewSinger } from './support';

describe('recording Singers', () => {
  it('records a person who signs in as a Singer, from what Google reported', async () => {
    const person = await signInNewSinger({
      metadata: { full_name: 'Ada Lovelace', avatar_url: 'https://example.test/ada.png' },
    });

    const { data, error } = await serviceClient()
      .from('singers')
      .select('id, display_name, email, avatar_url, email_verified, default_voice_part_id')
      .eq('id', person.id)
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({
      id: person.id,
      display_name: 'Ada Lovelace',
      email: person.email,
      avatar_url: 'https://example.test/ada.png',
      email_verified: true,
      default_voice_part_id: null,
    });
  });

  it('records that Google did not verify the email', async () => {
    const person = await signInNewSinger({ emailVerified: false });

    const { data } = await serviceClient()
      .from('singers')
      .select('email_verified')
      .eq('id', person.id)
      .single();

    expect(data).toEqual({ email_verified: false });
  });

  it('falls back to the email when Google gives no name', async () => {
    const person = await signInNewSinger({ metadata: { full_name: null, name: null } });

    const { data } = await serviceClient()
      .from('singers')
      .select('display_name')
      .eq('id', person.id)
      .single();

    expect(data).toEqual({ display_name: person.email });
  });
});
