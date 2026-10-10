import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { serviceClient } from '../contract/support';
import { signInAsApprovedSinger, signInAsSingerWith } from './support';

const unique = (): string => randomUUID().slice(0, 8);

const removePiecesTitled = async (titles: readonly string[]): Promise<void> => {
  await serviceClient().from('pieces').delete().in('title', titles);
};

const newPiece = async (title: string): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

const openPiece = async (page: Page, id: string): Promise<void> => {
  await page.goto(`/repertoire/${id}`);
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

test.describe('editing a Piece from its own page', () => {
  test('lets a Singer with update change the title, composer and Conductor’s Notes', async ({
    page,
    context,
  }) => {
    const title = `Here ${unique()}`;
    const renamed = `There ${unique()}`;
    try {
      const id = await newPiece(title);
      await signInAsSingerWith(context, ['update']);
      await openPiece(page, id);

      await page.getByRole('button', { name: `Actions for ${title}` }).click();
      await page.getByRole('menuitem', { name: /^Edit/ }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel('Title')).toHaveValue(title);
      await dialog.getByLabel('Title').fill(renamed);
      await dialog.getByLabel('Composer').fill('Elgar');
      await dialog.getByLabel(/^Conductor’s Notes/).fill('Sing brightly.');
      await dialog.getByRole('button', { name: 'Save Piece' }).click();

      await expect(dialog).toBeHidden();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(renamed);
      await expect(page.getByText('Elgar')).toBeVisible();
      await expect(page.getByText('Sing brightly.')).toBeVisible();
    } finally {
      await removePiecesTitled([title, renamed]);
    }
  });

  test('shows a clash with another Piece inside the dialog and keeps the page as it was', async ({
    page,
    context,
  }) => {
    const title = `Mine ${unique()}`;
    const taken = `Taken ${unique()}`;
    try {
      await serviceClient().from('pieces').insert({ title: taken, composer: 'Bach' });
      const id = await newPiece(title);
      await signInAsSingerWith(context, ['update']);
      await openPiece(page, id);

      await page.getByRole('button', { name: `Actions for ${title}` }).click();
      await page.getByRole('menuitem', { name: /^Edit/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Title').fill(taken);
      await dialog.getByLabel('Composer').fill('Bach');
      await dialog.getByRole('button', { name: 'Save Piece' }).click();

      await expect(dialog.getByRole('alert')).toContainText('already has a Piece');
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    } finally {
      await removePiecesTitled([title, taken]);
    }
  });

  test('offers no edit menu to a Singer without update', async ({ page, context }) => {
    const title = `Plain ${unique()}`;
    try {
      const id = await newPiece(title);
      await signInAsApprovedSinger(context);
      await openPiece(page, id);

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.getByRole('button', { name: `Actions for ${title}` })).toHaveCount(0);
    } finally {
      await removePiecesTitled([title]);
    }
  });
});
