import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { serviceClient } from '../contract/support';
import { signInAsApprovedSinger, signInAsSingerWith } from './support';

const unique = (): string => randomUUID().slice(0, 8);

/** What a test adds, removed afterwards so the shared database is left as it was found. */
const made: { performances: string[]; pieces: string[] } = { performances: [], pieces: [] };

test.afterEach(async () => {
  await serviceClient().from('performances').delete().in('name', made.performances);
  await serviceClient().from('pieces').delete().in('title', made.pieces);
  made.performances = [];
  made.pieces = [];
});

const voicePartId = async (name: string): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('voice_parts')
    .select('id')
    .eq('name', name)
    .single();
  if (error) throw error;
  return data.id;
};

type Track = { readonly part?: string; readonly kind?: 'part-only' | 'part-predominant' };

/** A Piece with these Practice Tracks listed (Home reads them, never plays them, so no file is stored). */
const newPiece = async (title: string, tracks: readonly Track[] = []): Promise<string> => {
  made.pieces.push(title);
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  for (const track of tracks) {
    const added = await serviceClient()
      .from('practice_tracks')
      .insert({
        piece_id: data.id,
        object_path: `${data.id}/${randomUUID()}.mp3`,
        label: '',
        voice_part_id: track.part === undefined ? null : await voicePartId(track.part),
        kind: track.kind ?? null,
      });
    if (added.error) throw added.error;
  }
  return data.id;
};

/** A Performance holding these Pieces in this order, arranged by the service role. */
const newPerformance = async (
  name: string,
  startsAt: string,
  endsAt: string,
  pieceIds: readonly string[] = [],
): Promise<string> => {
  made.performances.push(name);
  const { data, error } = await serviceClient()
    .from('performances')
    .insert({ name, starts_at: startsAt, ends_at: endsAt })
    .select('id')
    .single();
  if (error) throw error;
  if (pieceIds.length > 0) {
    const entries = await serviceClient()
      .from('performance_pieces')
      .insert(
        pieceIds.map((piece_id, index) => ({
          performance_id: data.id,
          piece_id,
          position: index + 1,
        })),
      );
    if (entries.error) throw entries.error;
  }
  return data.id;
};

const openHome = async (page: Page): Promise<void> => {
  await page.goto('/');
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

// Far in the future, so it is never the next Performance whatever else the shared database holds.
const later = ['2090-06-01T18:00:00Z', '2090-06-01T20:00:00Z'] as const;

test.describe('Home', () => {
  test('lists each Performance’s Pieces with what the Singer would hear, and opens its Overview', async ({
    page,
    context,
  }) => {
    const name = `Gala ${unique()}`;
    const [combined, mine, empty] = [`All ${unique()}`, `Mine ${unique()}`, `Bare ${unique()}`];
    await newPerformance(name, ...later, [
      await newPiece(combined, [{ part: 'Alto', kind: 'part-only' }, {}]),
      await newPiece(mine, [{ part: 'Alto', kind: 'part-predominant' }]),
      await newPiece(empty),
    ]);
    await signInAsApprovedSinger(context);

    await openHome(page);

    const tile = page.getByRole('main').getByRole('link', { name: new RegExp(name) });
    await expect(tile.getByRole('listitem')).toHaveText([
      new RegExp(`1\\s*${combined}\\s*All`),
      new RegExp(`2\\s*${mine}\\s*Alto \\+ mix`),
      new RegExp(`3\\s*${empty}\\s*No tracks yet`),
    ]);

    await expect(page.getByRole('main').getByRole('button', { name: /^Actions for/ })).toHaveCount(
      0,
    );
    await tile.click();
    await expect(page.getByRole('dialog', { name })).toBeVisible();
  });

  test('offers New Performance only to a Singer with append', async ({ page, context }) => {
    await signInAsApprovedSinger(context);
    await openHome(page);
    const newPerformanceButton = page
      .getByRole('main')
      .getByRole('button', { name: 'New Performance' });
    await expect(newPerformanceButton).toHaveCount(0);

    await context.clearCookies();
    await signInAsSingerWith(context, ['append']);
    await openHome(page);
    await newPerformanceButton.click();
    await expect(page.getByRole('dialog', { name: 'New Performance' })).toBeVisible();
  });

  test('gives a Singer with update and delete a menu on each Performance', async ({
    page,
    context,
  }) => {
    const name = `Managed ${unique()}`;
    await newPerformance(name, ...later);
    await signInAsSingerWith(context, ['update', 'delete']);

    await openHome(page);

    await page
      .getByRole('main')
      .getByRole('button', { name: `Actions for ${name}` })
      .click();
    await expect(page.getByRole('menuitem')).toHaveText([
      'Edit Performance…',
      'Delete Performance…',
    ]);
    await page.getByRole('menuitem', { name: 'Edit Performance…' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Edit Performance' }).getByLabel('Name'),
    ).toHaveValue(name);
  });

  test('shows a Performance in progress as the next one, largest', async ({ page, context }) => {
    // Only one Performance can be the next, and both layouts share the database, so this runs once.
    test.skip(test.info().project.name !== 'desktop', 'the next Performance is shared state');
    const name = `Under way ${unique()}`;
    const hour = 60 * 60 * 1000;
    await newPerformance(
      name,
      new Date(Date.now() - hour).toISOString(),
      new Date(Date.now() + hour).toISOString(),
    );
    await signInAsApprovedSinger(context);

    await openHome(page);

    await expect(
      page
        .getByRole('main')
        .getByRole('link', { name: new RegExp(`^Next Performance · On now ${name}`) }),
    ).toBeVisible();
  });

  test('keeps past Performances collapsed above the Today marker until asked', async ({
    page,
    context,
  }) => {
    const name = `Old ${unique()}`;
    await newPerformance(name, '1990-06-01T18:00:00Z', '1990-06-01T20:00:00Z');
    await signInAsApprovedSinger(context);

    await openHome(page);

    const main = page.getByRole('main');
    await expect(main.getByText(/^Today/)).toBeVisible();
    const tile = main.getByRole('link', { name: new RegExp(name) });
    await expect(tile).toBeHidden();

    await main.getByRole('button', { name: /^\d+ past Performances?$/ }).click();
    await tile.click();
    await expect(page.getByRole('dialog', { name })).toBeVisible();
  });
});
