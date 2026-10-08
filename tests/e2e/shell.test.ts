import { expect, test } from '@playwright/test';
import {
  isDesktopLayout,
  openNavigation,
  signInAsApprovedSinger,
  signInAsNewSinger,
  signInAsSingerWith,
} from './support';

test.describe('the app shell', () => {
  test('is a sidebar from 1024 px up and a header with a drawer below', async ({
    page,
    context,
  }) => {
    await signInAsApprovedSinger(context);
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    const nav = page.getByRole('navigation', { name: 'Main' });

    if (isDesktopLayout(page)) {
      await expect(nav).toBeVisible();
      await expect(menuButton).toBeHidden();
    } else {
      await expect(menuButton).toBeVisible();
      await expect(nav).toBeHidden();
    }
  });

  test('shows the Singer and their part in the user menu, and Performances', async ({
    page,
    context,
  }) => {
    await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = await openNavigation(page);

    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('button', { name: 'Performances' })).toBeVisible();
    await expect(nav.getByText('No Performances yet.')).toBeVisible();
    const menu = page.getByRole('button', { name: /^User menu for Test Singer/ });
    await expect(menu).toContainText('Alto');
  });

  test('the drawer opens from the header and closes when a link is followed', async ({
    page,
    context,
  }) => {
    test.skip(isDesktopLayout(page), 'the drawer is only on phones');
    await signInAsSingerWith(context, ['manage-users']);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = await openNavigation(page);
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
    await nav.getByRole('link', { name: 'Admin' }).click();

    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });

  test('following a link to the page you are already on closes the drawer too', async ({
    page,
    context,
  }) => {
    test.skip(isDesktopLayout(page), 'the drawer is only on phones');
    await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = await openNavigation(page);
    await nav.getByRole('link', { name: 'Home' }).click();

    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });

  test('the drawer does not linger when the window grows to the desktop layout', async ({
    page,
    context,
  }) => {
    test.skip(isDesktopLayout(page), 'the drawer is only on phones');
    await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);

    await page.setViewportSize({ width: 1280, height: 800 });

    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  test('the drawer can be closed without navigating', async ({ page, context }) => {
    test.skip(isDesktopLayout(page), 'the drawer is only on phones');
    await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openNavigation(page);
    await page.getByRole('button', { name: 'Close menu' }).click();

    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });

  test('has touch targets of at least 44 px and a label on every icon button', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['manage-users']);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);

    const targets = page
      .locator('header, aside, [role="dialog"]')
      .locator('a:visible, button:visible');
    const sizes = await targets.evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return {
          label: element.getAttribute('aria-label') ?? element.textContent.trim(),
          width,
          height,
        };
      }),
    );

    expect(sizes.length).toBeGreaterThan(3);
    expect(sizes.filter(({ label }) => label === '')).toEqual([]);
    expect(sizes.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);
  });

  test('keeps a slot for the Major Performance banner across the top', async ({
    page,
    context,
  }) => {
    await signInAsApprovedSinger(context);
    await page.goto('/');

    await expect(page.locator('#major-performance-banner')).toBeAttached();
  });

  test('offers no controls whose pages do not exist yet', async ({ page, context }) => {
    await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = await openNavigation(page);

    await expect(page.getByRole('button', { name: /search/i })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Repertoire' })).toHaveCount(0);
    await page.getByRole('button', { name: /^User menu for/ }).click();
    await expect(page.getByRole('menuitem')).toHaveText(['Change default Voice Part', 'Sign out']);
  });

  test('is not shown on the waiting-for-approval screen', async ({ page, context }) => {
    await signInAsNewSinger(context);
    await page.goto('/choose-part');
    await page.getByRole('radio', { name: /Soprano/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL('/waiting');
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0);
  });
});
