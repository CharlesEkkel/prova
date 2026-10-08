// The site Colour Theme: delivered on <html> by a one-hour cookie, changed by an Admin. The setting
// is one row shared by every test, so these run one at a time, on one viewport, and put it back.
import { expect, test, type Page } from '@playwright/test';
import { serviceClient } from '../contract/support';
import { signInAsApprovedSinger, signInAsSingerWith } from './support';

test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(
    test.info().project.name !== 'desktop',
    'the setting is shared, so one viewport is enough; the layouts do not differ',
  );
});

const cookieName = 'prova-colour-theme';

const setInDatabase = async (theme: string): Promise<void> => {
  const { error } = await serviceClient()
    .from('site_settings')
    .update({ colour_theme: theme })
    .not('colour_theme', 'is', null);
  if (error) throw error;
};

test.afterEach(async () => {
  await setInDatabase('forest');
});

const accentOf = (page: Page): Promise<string | null> =>
  page.locator('html').getAttribute('data-accent');

test.describe('delivery', () => {
  test('a visitor with no cookie gets the theme on <html> and a cookie for an hour', async ({
    request,
  }) => {
    await setInDatabase('ocean');

    const response = await request.get('/sign-in');

    expect(await response.text()).toContain('<html lang="en" data-accent="ocean">');
    const cookie = response.headers()['set-cookie'] ?? '';
    expect(cookie).toContain(`${cookieName}=ocean`);
    expect(cookie).toContain('Max-Age=3600');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/');
  });

  test('a later request within the hour does not read the database', async ({ request }) => {
    const first = await request.get('/sign-in');
    expect(first.headers()['set-cookie']).toContain(`${cookieName}=forest`);

    await setInDatabase('sunset');
    const later = await request.get('/sign-in');

    // The request context keeps the cookie, so the change is not seen and no new cookie is set.
    expect(await later.text()).toContain('data-accent="forest"');
    expect(later.headers()['set-cookie']).toBeUndefined();
  });

  test('a missing, expired or invalid cookie is read afresh, and an invalid value means Forest', async ({
    playwright,
    baseURL,
  }) => {
    await setInDatabase('graphite');
    const visit = async (cookie: string | null): Promise<string> => {
      const context = await playwright.request.newContext({
        baseURL: baseURL ?? '',
        ...(cookie === null ? {} : { extraHTTPHeaders: { cookie } }),
      });
      const response = await context.get('/sign-in');
      const text = await response.text();
      await context.dispose();
      return text;
    };

    expect(await visit(null)).toContain('data-accent="graphite"');
    expect(await visit(`${cookieName}=neon`)).toContain('data-accent="graphite"');
    expect(await visit(`${cookieName}=`)).toContain('data-accent="graphite"');
    expect(await visit(`${cookieName}=violet`)).toContain('data-accent="violet"');
  });

  test('HTML is private, so a shared cache never keeps one theme for another visitor', async ({
    request,
  }) => {
    const page = await request.get('/sign-in');
    expect(page.headers()['cache-control']).toBe('private');
  });

  test('built assets stay cacheable', async ({ page }) => {
    const assets: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/_app/immutable/')) {
        assets.push(response.headers()['cache-control'] ?? '');
      }
    });
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    expect(assets.length).toBeGreaterThan(0);
    expect(assets.some((value) => value.includes('private'))).toBe(false);
  });
});

test.describe('Admin > Appearance', () => {
  test('a Singer without manage-users cannot open it', async ({ page, context }) => {
    await signInAsApprovedSinger(context);

    const response = await page.goto('/admin/appearance');

    expect(response?.status()).toBe(403);
  });

  test('lists the five themes with Forest marked Default and Reset to the default', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['manage-users']);

    await page.goto('/admin/appearance');

    const themes = page.getByTestId('colour-theme');
    await expect(themes).toHaveText([/Forest\s+Default/, /Violet/, /Ocean/, /Sunset/, /Graphite/]);
    await expect(page.getByRole('button', { name: 'Reset to the default' })).toBeDisabled();
  });

  test('the Admin who saves sees it at once; another visitor within the hour does not', async ({
    page,
    context,
    browser,
  }) => {
    await signInAsSingerWith(context, ['manage-users']);
    await page.goto('/admin/appearance');
    await page.waitForLoadState('networkidle');
    expect(await accentOf(page)).toBe('forest');

    await page.getByTestId('colour-theme').filter({ hasText: 'Violet' }).click();

    await expect.poll(() => accentOf(page)).toBe('violet');
    await expect(page.getByTestId('colour-theme').filter({ hasText: 'Violet' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const cookies = await context.cookies();
    expect(cookies.find(({ name }) => name === cookieName)?.value).toBe('violet');
    // It reaches the next page load too.
    await page.reload();
    expect(await accentOf(page)).toBe('violet');

    // Someone else whose cookie has not expired still sees Forest...
    const other = await browser.newContext();
    await other.addCookies([
      { name: cookieName, value: 'forest', url: 'http://localhost:4173', secure: true },
    ]);
    const visitor = await other.newPage();
    await visitor.goto('/sign-in');
    expect(await accentOf(visitor)).toBe('forest');
    // ...until it expires.
    await other.clearCookies({ name: cookieName });
    await visitor.reload();
    expect(await accentOf(visitor)).toBe('violet');
    await other.close();
  });

  test('a visitor who saw the old colour sees the new one in a fresh session once their cookie has expired', async ({
    page,
    context,
    browser,
  }) => {
    // The visitor opens the site first, and the server gives them Forest and its cookie.
    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await visitor.goto('/sign-in');
    expect(await accentOf(visitor)).toBe('forest');
    const issued = (await visitorContext.cookies()).find(({ name }) => name === cookieName);
    expect(issued?.value).toBe('forest');
    const hour = 60 * 60;
    expect(issued?.expires).toBeGreaterThan(Date.now() / 1000 + hour - 120);

    // Then an Admin changes the colour.
    await signInAsSingerWith(context, ['manage-users']);
    await page.goto('/admin/appearance');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('colour-theme').filter({ hasText: 'Violet' }).click();
    await expect.poll(() => accentOf(page)).toBe('violet');

    // The visitor, still inside the hour, keeps what they had.
    await visitor.reload();
    expect(await accentOf(visitor)).toBe('forest');

    // Their browser closes; later the cookie's hour is up, so the new session does not send it.
    const saved = await visitorContext.storageState();
    await visitorContext.close();
    const afterAnHour = {
      ...saved,
      cookies: saved.cookies.map((cookie) =>
        cookie.name === cookieName ? { ...cookie, expires: Date.now() / 1000 - 1 } : cookie,
      ),
    };
    const fresh = await browser.newContext({ storageState: afterAnHour });
    const returning = await fresh.newPage();
    await returning.goto('/sign-in');

    expect(await accentOf(returning)).toBe('violet');
    expect((await fresh.cookies()).find(({ name }) => name === cookieName)?.value).toBe('violet');
    await fresh.close();
  });

  test('Reset to the default puts Forest back', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);
    await setInDatabase('sunset');
    await page.goto('/admin/appearance');
    await page.waitForLoadState('networkidle');
    expect(await accentOf(page)).toBe('sunset');

    await page.getByRole('button', { name: 'Reset to the default' }).click();

    await expect.poll(() => accentOf(page)).toBe('forest');
    const { data } = await serviceClient().from('site_settings').select('colour_theme').single();
    expect(data?.colour_theme).toBe('forest');
  });
});
