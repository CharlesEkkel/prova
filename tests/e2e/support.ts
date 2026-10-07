// Browser-test support: real people with real sessions, without going through Google.
import { createServerClient } from '@supabase/ssr';
import type { BrowserContext } from '@playwright/test';
import { anonKey, grantRole, signInNewSinger, url, type TestSinger } from '../contract/support';

const appUrl = 'http://localhost:4173';

/** The cookies the app itself would have set after Google sent this person back. */
const sessionCookies = async (singer: TestSinger) => {
  const { data } = await singer.client.auth.getSession();
  if (data.session === null) throw new Error('the test Singer has no session');

  const jar = new Map<string, string>();
  const server = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => jar.set(name, value));
      },
    },
  });
  await server.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  return [...jar].map(([name, value]) => ({ name, value, url: appUrl }));
};

/** Signs a brand-new person in: no Voice Part chosen, no Roles. */
export const signInAsNewSinger = async (context: BrowserContext): Promise<TestSinger> => {
  const singer = await signInNewSinger();
  await context.addCookies(await sessionCookies(singer));
  return singer;
};

/** Signs in a Singer who has chosen a Voice Part and been approved with `read`. */
export const signInAsApprovedSinger = async (context: BrowserContext): Promise<TestSinger> => {
  const singer = await signInAsNewSinger(context);
  await grantRole(singer, ['read']);
  const voiceParts = await singer.client.from('voice_parts').select('id').eq('name', 'Alto');
  const alto = voiceParts.data?.[0]?.id;
  if (alto === undefined) throw new Error('the Alto Voice Part is not seeded');
  await singer.client.rpc('set_my_default_voice_part', { chosen: alto });
  return singer;
};
