// Backend contract seam: the site Colour Theme is readable by anyone and writable only with
// manage-users, and the server's choice of theme for a request follows it. The tests put the setting back to Forest, because every test file shares one row.
import type { Cookies } from '@sveltejs/kit';
import { afterEach, describe, expect, it } from 'vitest';
import { colourThemeFor } from '../../src/lib/shell/colour-theme';
import { anonClient, serviceClient, signInNewManager, signInNewSinger } from './support';

const currentTheme = async (): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('site_settings')
    .select('colour_theme')
    .single();
  if (error) throw error;
  return data.colour_theme;
};

const setInDatabase = async (theme: string): Promise<void> => {
  const { error } = await serviceClient()
    .from('site_settings')
    .update({ colour_theme: theme })
    .not('colour_theme', 'is', null);
  if (error) throw error;
};

afterEach(async () => {
  // PostgREST refuses an update with no filter; every real value passes this one.
  const { error } = await serviceClient()
    .from('site_settings')
    .update({ colour_theme: 'forest' })
    .not('colour_theme', 'is', null);
  if (error) throw error;
});

describe('the Colour Theme setting', () => {
  it('is seeded as Forest, in a single row', async () => {
    const { data, error } = await serviceClient().from('site_settings').select('colour_theme');

    expect(error).toBeNull();
    expect(data).toEqual([{ colour_theme: 'forest' }]);
  });

  it('can be read by a visitor who has not signed in', async () => {
    const { data, error } = await anonClient().from('site_settings').select('colour_theme');

    expect(error).toBeNull();
    expect(data).toEqual([{ colour_theme: 'forest' }]);
  });

  it('can be read by a Pending Singer', async () => {
    const pending = await signInNewSinger();

    const { data } = await pending.client.from('site_settings').select('colour_theme');

    expect(data).toEqual([{ colour_theme: 'forest' }]);
  });

  it('can be changed by a Singer with manage-users', async () => {
    const manager = await signInNewManager();

    const { data, error } = await manager.client
      .from('site_settings')
      .update({ colour_theme: 'violet' })
      .not('colour_theme', 'is', null)
      .select('colour_theme');

    expect(error).toBeNull();
    expect(data).toEqual([{ colour_theme: 'violet' }]);
    expect(await currentTheme()).toBe('violet');
  });

  it.each([
    ['a visitor who has not signed in', () => Promise.resolve(anonClient())],
    ['a Pending Singer', async () => (await signInNewSinger()).client],
  ])('cannot be changed by %s', async (_who, clientOf) => {
    const client = await clientOf();

    const { data } = await client
      .from('site_settings')
      .update({ colour_theme: 'ocean' })
      .not('colour_theme', 'is', null)
      .select('colour_theme');

    expect(data ?? []).toEqual([]);
    expect(await currentTheme()).toBe('forest');
  });

  it('refuses any value but the five themes', async () => {
    const { error } = await serviceClient()
      .from('site_settings')
      .update({ colour_theme: 'neon' })
      .eq('colour_theme', 'forest');

    expect(error?.code).toBe('23514');
    expect(await currentTheme()).toBe('forest');
  });

  it('cannot gain a second row or lose its only one', async () => {
    const manager = await signInNewManager();

    const added = await serviceClient().from('site_settings').insert({ colour_theme: 'ocean' });
    const viaApi = await manager.client.from('site_settings').insert({ colour_theme: 'ocean' });
    const removed = await manager.client
      .from('site_settings')
      .delete()
      .eq('colour_theme', 'forest');

    expect(added.error?.code).toBe('23505');
    expect(viaApi.error).not.toBeNull();
    expect(removed.error).not.toBeNull();
    expect(await currentTheme()).toBe('forest');
  });
});

type Set = { readonly value: string; readonly maxAge: number | undefined };

const jar = (initial?: string) => {
  const sets: Set[] = [];
  const cookies: Pick<Cookies, 'get' | 'set'> = {
    get: () => initial,
    set: (_name, value, options) => {
      sets.push({ value, maxAge: options?.maxAge });
    },
  };
  return { cookies, sets };
};

describe('colourThemeFor', () => {
  it('reads the database when there is no cookie, and keeps the answer for an hour', async () => {
    await setInDatabase('sunset');
    const { cookies, sets } = jar();

    expect(await colourThemeFor(cookies, anonClient())).toBe('sunset');
    expect(sets).toEqual([{ value: 'sunset', maxAge: 3600 }]);
  });

  it('uses a valid cookie without reading the database or setting a new one', async () => {
    const { cookies, sets } = jar('violet');
    const unreachable = anonClient(() => Promise.reject(new Error('the database was read')));

    expect(await colourThemeFor(cookies, unreachable)).toBe('violet');
    expect(sets).toEqual([]);
  });

  it('reads afresh when the cookie names no theme, and falls back to Forest on an invalid one', async () => {
    await setInDatabase('graphite');
    const { cookies } = jar('neon');

    expect(await colourThemeFor(cookies, anonClient())).toBe('graphite');
  });

  it('falls back to Forest with a cookie of about a minute when the database cannot be read', async () => {
    const { cookies, sets } = jar();
    const unreachable = anonClient(() => Promise.reject(new Error('the database is down')));

    expect(await colourThemeFor(cookies, unreachable)).toBe('forest');
    expect(sets).toEqual([{ value: 'forest', maxAge: 60 }]);
  });
});
