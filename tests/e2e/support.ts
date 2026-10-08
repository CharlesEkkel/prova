// Browser-test support: real people with real sessions, without going through Google.
import { createServerClient } from '@supabase/ssr';
import type { BrowserContext, Locator, Page } from '@playwright/test';
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

/** Signs in an approved Singer who also holds the given Permissions. */
export const signInAsSingerWith = async (
  context: BrowserContext,
  extra: readonly Parameters<typeof grantRole>[1][number][],
): Promise<TestSinger> => {
  const singer = await signInAsApprovedSinger(context);
  await grantRole(singer, extra);
  return singer;
};

/** The desktop layout starts at `lg`, 1024 px. */
export const isDesktopLayout = (page: Page): boolean => (page.viewportSize()?.width ?? 0) >= 1024;

/**
 * The main navigation, opening the drawer first on a phone. On desktop the sidebar is always there.
 */
export const openNavigation = async (page: Page): Promise<Locator> => {
  if (!isDesktopLayout(page)) {
    // A click before the page has hydrated is lost, so let it settle first.
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Open menu' }).click();
  }
  return page.getByRole('navigation', { name: 'Main' });
};

/** Signs out through the user menu, in the sidebar or the drawer. */
export const signOutFromMenu = async (page: Page): Promise<void> => {
  await openNavigation(page);
  await page.getByRole('button', { name: /^User menu for/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
};
