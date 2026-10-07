import { expect, test } from '@playwright/test';
import { grantRole } from '../contract/support';
import { signInAsNewSinger } from './support';

test.describe('signed out', () => {
  test('a visitor to any page is sent to sign-in, remembering where they were headed', async ({
    page,
  }) => {
    await page.goto('/piece/3?tab=score');

    await expect(page).toHaveURL('/sign-in?next=%2Fpiece%2F3%3Ftab%3Dscore');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('Continue with Google starts Google sign-in through Supabase and remembers the destination', async ({
    page,
    context,
  }) => {
    // Stop at the hand-off to Supabase: Google itself is never involved in these tests.
    await page.route('**/auth/v1/authorize**', (route) => route.abort());
    const handOff = page.waitForRequest((request) => request.url().includes('/auth/v1/authorize'));

    await page.goto('/sign-in?next=%2Fpiece%2F3');
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    const authorize = new URL((await handOff).url());
    expect(authorize.searchParams.get('provider')).toBe('google');
    expect(authorize.searchParams.get('redirect_to')).toBe('http://localhost:4173/auth/callback');
    expect(authorize.searchParams.get('code_challenge')).not.toBeNull();
    const cookies = await context.cookies();
    expect(cookies.find(({ name }) => name === 'prova-next')?.value).toBe('/piece/3');
  });

  test('a hostile next address is never remembered as the destination', async ({
    page,
    context,
  }) => {
    await page.route('**/auth/v1/authorize**', (route) => route.abort());
    const handOff = page.waitForRequest((request) => request.url().includes('/auth/v1/authorize'));

    await page.goto('/sign-in?next=https%3A%2F%2Fevil.example%2Fsteal');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await handOff;

    const cookies = await context.cookies();
    expect(cookies.find(({ name }) => name === 'prova-next')?.value).toBe('/');
  });

  test('a cancelled Google sign-in says so and offers to try again', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied');

    await expect(page).toHaveURL('/sign-in?error=cancelled');
    await expect(page.getByRole('alert')).toContainText('Sign-in was cancelled');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('a failed Google sign-in shows a plain message, not the provider error', async ({
    page,
  }) => {
    await page.goto('/auth/callback?error=server_error&error_description=secret+details');

    await expect(page.getByRole('alert')).toContainText('We could not sign you in with Google');
    await expect(page.getByText('secret details')).toHaveCount(0);
  });

  test('a callback with no code does not sign anyone in', async ({ page }) => {
    await page.goto('/auth/callback');

    await expect(page).toHaveURL('/sign-in?error=failed');
  });

  test('the sign-in screen uses the Display Mode saved on this device', async ({ page }) => {
    await page.goto('/sign-in');
    await page.evaluate(() => {
      localStorage.setItem('prova-display-mode', 'dark');
    });
    await page.reload();

    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});

test.describe('a new Singer', () => {
  test('chooses their Voice Part before anything else, then lands where they were headed', async ({
    page,
    context,
  }) => {
    const singer = await signInAsNewSinger(context);
    await grantRole(singer, ['read']);

    await page.goto('/anywhere');
    await expect(page).toHaveURL('/choose-part?next=%2Fanywhere');
    await expect(page.getByRole('heading', { name: 'Which part do you sing?' })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(4);

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('alert')).toContainText('Choose your Voice Part');

    await page.getByRole('radio', { name: /Tenor/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL('/anywhere');

    const saved = await singer.client.rpc('my_default_voice_part');
    expect(saved.data).toMatchObject({ name: 'Tenor', short_label: 'T' });
  });

  test('cannot skip the choice by opening another page', async ({ page, context }) => {
    await signInAsNewSinger(context);

    await page.goto('/waiting');

    await expect(page).toHaveURL('/choose-part');
  });
});

test.describe('a Pending Singer', () => {
  test('sees only the waiting screen, with their name, email and part', async ({
    page,
    context,
  }) => {
    const singer = await signInAsNewSinger(context);
    await page.goto('/choose-part');
    await page.getByRole('radio', { name: /Bass/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL('/waiting');
    await expect(page.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible();
    await expect(page.getByText('contact an Admin')).toBeVisible();
    await expect(page.getByText('Test Singer')).toBeVisible();
    await expect(page.getByText(singer.email)).toBeVisible();
    await expect(page.getByText('Bass', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);

    await page.goto('/');
    await expect(page).toHaveURL('/waiting');
  });

  test('is taken into the app by Check again once an Admin has approved them', async ({
    page,
    context,
  }) => {
    const singer = await signInAsNewSinger(context);
    await page.goto('/choose-part');
    await page.getByRole('radio', { name: /Alto/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL('/waiting');

    await page.getByRole('button', { name: 'Check again' }).click();
    // Let that check finish, so the approval below is only seen by the next one.
    await expect(page.getByRole('button', { name: 'Check again' })).toBeEnabled();
    await expect(page).toHaveURL('/waiting');

    await grantRole(singer, ['read']);
    await page.getByRole('button', { name: 'Check again' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Prova' })).toBeVisible();
  });

  test('re-checks by itself when the Singer comes back to the tab', async ({ page, context }) => {
    const singer = await signInAsNewSinger(context);
    await page.goto('/choose-part');
    await page.getByRole('radio', { name: /Alto/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL('/waiting');
    await expect(page.getByRole('button', { name: 'Check again' })).toBeEnabled();

    await grantRole(singer, ['read']);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    await expect(page).toHaveURL('/');
  });

  test('can sign out from the waiting screen, and is then signed out', async ({
    page,
    context,
  }) => {
    await signInAsNewSinger(context);
    await page.goto('/choose-part');
    await page.getByRole('radio', { name: /Soprano/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/sign-in');

    await page.goto('/');
    await expect(page).toHaveURL('/sign-in');
  });
});
