import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { serviceClient } from '../contract/support';
import { openNavigation, signInAsApprovedSinger, signInAsSingerWith } from './support';

const unique = (): string => randomUUID().slice(0, 8);

const removePiecesTitled = async (titles: readonly string[]): Promise<void> => {
  await serviceClient().from('pieces').delete().in('title', titles);
};

const openRepertoire = async (page: Page): Promise<void> => {
  await page.goto('/repertoire');
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

const rowOf = (page: Page, title: string) => page.getByTestId('piece').filter({ hasText: title });

test.describe('the Repertoire', () => {
  test('is reached from the navigation and lists Pieces A to Z, marking those with no Practice Track', async ({
    page,
    context,
  }) => {
    const suffix = unique();
    const titles = [`Zzz ${suffix}`, `Aaa ${suffix}`];
    try {
      await serviceClient()
        .from('pieces')
        .insert(titles.map((title) => ({ title, composer: 'Composer' })));
      await signInAsApprovedSinger(context);
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const navigation = await openNavigation(page);
      await navigation.getByRole('link', { name: 'Repertoire' }).click();

      await expect(page).toHaveURL(/\/repertoire$/);
      await expect(rowOf(page, `Aaa ${suffix}`)).toContainText('No Practice Track yet');
      await expect(rowOf(page, `Aaa ${suffix}`)).toContainText('Composer');
      const listed = await page.getByTestId('piece').locator('.font-medium').allTextContents();
      expect(listed.indexOf(`Aaa ${suffix}`)).toBeLessThan(listed.indexOf(`Zzz ${suffix}`));
    } finally {
      await removePiecesTitled(titles);
    }
  });

  test('shows a Singer holding only read no New Piece button and no row actions', async ({
    page,
    context,
  }) => {
    const title = `Readonly ${unique()}`;
    try {
      await serviceClient().from('pieces').insert({ title, composer: 'Anon' });
      await signInAsApprovedSinger(context);
      await openRepertoire(page);

      await expect(rowOf(page, title)).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Piece' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Actions for/ })).toHaveCount(0);
    } finally {
      await removePiecesTitled([title]);
    }
  });

  test('offers Edit for update and Delete for delete, and only those', async ({
    page,
    context,
  }) => {
    const title = `Actions ${unique()}`;
    try {
      await serviceClient().from('pieces').insert({ title, composer: 'Anon' });
      await signInAsSingerWith(context, ['update']);
      await openRepertoire(page);

      await page.getByRole('button', { name: `Actions for ${title}` }).click();

      await expect(page.getByRole('menuitem', { name: /^Edit/ })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /^Delete/ })).toHaveCount(0);
    } finally {
      await removePiecesTitled([title]);
    }
  });

  test('adds a Piece with a Conductor’s Note and opens its page', async ({ page, context }) => {
    const title = `New ${unique()}`;
    try {
      await signInAsSingerWith(context, ['append']);
      await openRepertoire(page);

      await page.getByRole('button', { name: 'New Piece' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Title').fill(title);
      await dialog.getByLabel('Composer').fill('Biebl');
      await dialog.getByLabel('Conductor’s Notes').fill('Sing brightly');
      await dialog.getByRole('button', { name: 'Add Piece' }).click();

      await expect(page).toHaveURL(/\/repertoire\/[0-9a-f-]{36}$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.getByText('Biebl')).toBeVisible();
      await expect(page.getByText('Sing brightly')).toBeVisible();
      await expect(page.getByText('No Practice Track for this Piece yet.')).toBeVisible();
      await expect(page.getByRole('button', { name: /Start/ })).toHaveCount(0);
    } finally {
      await removePiecesTitled([title]);
    }
  });

  test('shows a clash with an existing title and composer inside the dialog', async ({
    page,
    context,
  }) => {
    const title = `Clash ${unique()}`;
    try {
      await serviceClient().from('pieces').insert({ title, composer: 'Bach' });
      await signInAsSingerWith(context, ['append']);
      await openRepertoire(page);

      await page.getByRole('button', { name: 'New Piece' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Title').fill(title.toUpperCase());
      await dialog.getByLabel('Composer').fill(' bach ');
      await dialog.getByRole('button', { name: 'Add Piece' }).click();

      await expect(dialog.getByRole('alert')).toContainText('already has a Piece');
    } finally {
      await removePiecesTitled([title]);
    }
  });

  test('edits a Piece', async ({ page, context }) => {
    const title = `Before ${unique()}`;
    const renamed = `After ${unique()}`;
    try {
      await serviceClient().from('pieces').insert({ title, composer: 'Anon' });
      await signInAsSingerWith(context, ['update']);
      await openRepertoire(page);

      await page.getByRole('button', { name: `Actions for ${title}` }).click();
      await page.getByRole('menuitem', { name: /^Edit/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Title').fill(renamed);
      await dialog.getByLabel('Composer').fill('Elgar');
      await dialog.getByRole('button', { name: 'Save Piece' }).click();

      await expect(rowOf(page, renamed)).toContainText('Elgar');
      await expect(rowOf(page, title)).toHaveCount(0);
    } finally {
      await removePiecesTitled([title, renamed]);
    }
  });

  test('asks before deleting and says what goes with the Piece', async ({ page, context }) => {
    const title = `Doomed ${unique()}`;
    try {
      await serviceClient().from('pieces').insert({ title, composer: 'Anon' });
      await signInAsSingerWith(context, ['delete']);
      await openRepertoire(page);

      await page.getByRole('button', { name: `Actions for ${title}` }).click();
      await page.getByRole('menuitem', { name: /^Delete/ }).click();
      const confirmation = page.getByRole('alertdialog');
      await expect(confirmation).toContainText(
        '0 Practice Tracks and 0 Scores, and is in 0 Performances',
      );

      await confirmation.getByRole('button', { name: 'Cancel' }).click();
      await expect(rowOf(page, title)).toBeVisible();

      await page.getByRole('button', { name: `Actions for ${title}` }).click();
      await page.getByRole('menuitem', { name: /^Delete/ }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete Piece' }).click();

      await expect(rowOf(page, title)).toHaveCount(0);
    } finally {
      await removePiecesTitled([title]);
    }
  });

  test('answers 404 for a Piece that does not exist', async ({ page, context }) => {
    await signInAsApprovedSinger(context);

    const response = await page.goto(`/repertoire/${randomUUID()}`);

    expect(response?.status()).toBe(404);
  });
});
