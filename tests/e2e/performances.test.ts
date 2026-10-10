import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { serviceClient } from '../contract/support';
import { openNavigation, signInAsSingerWith } from './support';

const unique = (): string => randomUUID().slice(0, 8);

/** What a test adds, removed afterwards so the shared database is left as it was found. */
const made: { performances: string[]; pieces: string[] } = { performances: [], pieces: [] };

test.afterEach(async () => {
  await serviceClient().from('performances').delete().in('name', made.performances);
  await serviceClient().from('pieces').delete().in('title', made.pieces);
  made.performances = [];
  made.pieces = [];
});

const newPiece = async (title: string): Promise<string> => {
  made.pieces.push(title);
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

const settle = async (page: Page): Promise<void> => {
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

test.describe('creating a Performance', () => {
  test('lets a Singer with append create one from the sidebar, with its first Pieces', async ({
    page,
    context,
  }) => {
    const name = `Spring ${unique()}`;
    made.performances.push(name);
    const [first, second] = [`Ave ${unique()}`, `Gloria ${unique()}`];
    await newPiece(first);
    await newPiece(second);
    await signInAsSingerWith(context, ['append']);
    await page.goto('/repertoire');
    await settle(page);

    const navigation = await openNavigation(page);
    await navigation.getByRole('button', { name: 'New Performance' }).click();
    const dialog = page.getByRole('dialog', { name: 'New Performance' });
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('Starts').fill('2030-05-01T19:00');
    await dialog.getByLabel('Ends').fill('2030-05-01T21:00');
    await dialog.getByLabel('Venue (optional)').fill('Town Hall');
    await dialog.getByLabel('Find Pieces').fill(second);
    await dialog.getByRole('checkbox', { name: new RegExp(second) }).click();
    await dialog.getByLabel('Find Pieces').fill(first);
    await dialog.getByRole('checkbox', { name: new RegExp(first) }).click();
    await dialog.getByRole('button', { name: 'Add Performance' }).click();

    await expect(dialog).toBeHidden();
    const overview = page.getByRole('dialog', { name });
    await expect(overview.getByText('Wed 1 May 2030, 19:00–21:00 · Town Hall')).toBeVisible();
    await expect(overview.getByRole('listitem')).toHaveText([
      new RegExp(`1.*${second}`),
      new RegExp(`2.*${first}`),
    ]);
  });
});
