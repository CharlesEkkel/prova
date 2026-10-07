import { expect, test } from '@playwright/test';
import { signInAsApprovedSinger } from './support';

test('the app renders and a Bits UI dialog works in light and dark', async ({ page, context }) => {
  await signInAsApprovedSinger(context);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Prova' })).toBeVisible();

  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Light' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
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

test('the pdf.js WebAssembly decoders are served', async ({ request }) => {
  const res = await request.get('/pdfjs/wasm/openjpeg.wasm');
  expect(res.ok()).toBe(true);
});
