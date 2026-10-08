import { expect, test } from '@playwright/test';
import { isDesktopLayout, openNavigation, signInAsApprovedSinger } from './support';

test.describe('Display Mode', () => {
  test('Light, Dark and System are offered, remembered on the device, and applied', async ({
    page,
    context,
  }) => {
    await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);
    const group = page.getByRole('group', { name: 'Display Mode' });

    await group.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(group.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('prova-display-mode'))).toBe('dark');

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);
    await page
      .getByRole('group', { name: 'Display Mode' })
      .getByRole('button', { name: 'Light' })
      .click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('System follows the device live', async ({ page, context }) => {
    await signInAsApprovedSinger(context);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('an explicit choice is not changed by the device', async ({ page, context }) => {
    await signInAsApprovedSinger(context);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);
    await page
      .getByRole('group', { name: 'Display Mode' })
      .getByRole('button', { name: 'Light' })
      .click();

    await page.emulateMedia({ colorScheme: 'dark' });

    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('phones get a quick button in the header that flips light and dark', async ({
    page,
    context,
  }) => {
    test.skip(isDesktopLayout(page), 'the quick button is only in the phone header');
    await signInAsApprovedSinger(context);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('native controls follow the chosen mode, even against the device setting', async ({
    page,
    context,
  }) => {
    await signInAsApprovedSinger(context);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);

    await page
      .getByRole('group', { name: 'Display Mode' })
      .getByRole('button', { name: 'Dark' })
      .click();

    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
      'dark',
    );
  });

  test('the choice still applies when the device will not remember it', async ({
    page,
    context,
  }) => {
    await signInAsApprovedSinger(context);
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error('storage is blocked');
      };
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);

    await page
      .getByRole('group', { name: 'Display Mode' })
      .getByRole('button', { name: 'Dark' })
      .click();

    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('an unreadable saved value means System, before first paint too', async ({
    page,
    context,
  }) => {
    await signInAsApprovedSinger(context);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('prova-display-mode', 'sepia');
    });
    await page.route('**/_app/**', (route) => route.abort());
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('the saved Display Mode is applied before first paint', async ({ page, context }) => {
    await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('prova-display-mode', 'dark');
    });
    // Block the app's own scripts: only the inline script in app.html can set the class.
    await page.route('**/_app/**', (route) => route.abort());
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});

test('the pdf.js WebAssembly decoders are served', async ({ request }) => {
  const res = await request.get('/pdfjs/wasm/openjpeg.wasm');
  expect(res.ok()).toBe(true);
});
