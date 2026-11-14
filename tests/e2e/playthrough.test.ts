import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { silentMp3 } from '../audio-fixtures';
import { serviceClient } from '../contract/support';
import { signInAsApprovedSinger } from './support';

const unique = (): string => randomUUID().slice(0, 8);

/** Everything a test arranges, removed at the end so the shared database is left as it was found. */
const made: { performances: string[]; pieces: string[]; files: string[] } = {
  performances: [],
  pieces: [],
  files: [],
};

test.afterEach(async () => {
  const admin = serviceClient();
  await admin.from('performances').delete().in('name', made.performances);
  await admin.from('pieces').delete().in('title', made.pieces);
  if (made.files.length > 0) await admin.storage.from('practice-tracks').remove(made.files);
  made.performances = [];
  made.pieces = [];
  made.files = [];
});

/** A Piece with a Combined Track of a silent MP3 this many seconds long, or with no track at all. */
const newPiece = async (title: string, seconds: number | null): Promise<string> => {
  made.pieces.push(title);
  const admin = serviceClient();
  const { data, error } = await admin
    .from('pieces')
    .insert({ title, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  if (seconds !== null) {
    const path = `${data.id}/${randomUUID()}.mp3`;
    const stored = await admin.storage
      .from('practice-tracks')
      .upload(path, silentMp3(seconds), { contentType: 'audio/mpeg' });
    if (stored.error) throw stored.error;
    made.files.push(path);
    const added = await admin
      .from('practice_tracks')
      .insert({ piece_id: data.id, object_path: path, duration_seconds: seconds });
    if (added.error) throw added.error;
  }
  return data.id;
};

/** A Performance holding these Pieces in this order. */
const newPerformance = async (name: string, pieceIds: readonly string[]): Promise<string> => {
  made.performances.push(name);
  const admin = serviceClient();
  const { data, error } = await admin
    .from('performances')
    .insert({ name, starts_at: '2030-06-01T18:00:00Z', ends_at: '2030-06-01T20:00:00Z' })
    .select('id')
    .single();
  if (error) throw error;
  const entries = await admin.from('performance_pieces').insert(
    pieceIds.map((piece_id, index) => ({
      performance_id: data.id,
      piece_id,
      position: index + 1,
    })),
  );
  if (entries.error) throw entries.error;
  return data.id;
};

/** Opens the Performance's Overview and presses Play, as a Singer starts every Play-through. */
const playThrough = async (page: Page, id: string, name: string): Promise<void> => {
  await page.goto(`/?overview=${id}`);
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('dialog', { name })
    .getByRole('link', { name: /^Play through/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/performances/${id}/play`));
};

const player = (page: Page) => page.getByTestId('player');

test.describe('a Play-through', () => {
  test('plays from the Overview, pauses at an empty Piece until Continue, and finishes', async ({
    page,
    context,
  }) => {
    const name = `Concert ${unique()}`;
    const [first, empty, last] = [`First ${unique()}`, `Empty ${unique()}`, `Last ${unique()}`];
    const id = await newPerformance(name, [
      await newPiece(first, 2),
      await newPiece(empty, null),
      await newPiece(last, 1),
    ]);
    await signInAsApprovedSinger(context);

    await playThrough(page, id, name);

    // It plays at once, without a second tap.
    await expect(player(page)).toContainText('Piece 1 of 3');
    await expect(player(page).getByRole('heading', { level: 1 })).toHaveText(first);
    await expect(page.getByTestId('up-next')).toContainText(`Up next: ${empty} · No tracks yet`);
    await expect(player(page).getByRole('button', { name: 'Pause' })).toBeVisible();

    // The track ends and the run pauses at the empty Piece, as skip-empty is off.
    const card = page.getByTestId('pause-card');
    await expect(card).toContainText('No tracks yet', { timeout: 15_000 });
    await expect(player(page)).toContainText('Piece 2 of 3');

    await card.getByRole('button', { name: 'Continue to next Piece' }).click();

    await expect(player(page).getByRole('heading', { level: 1 })).toHaveText(last);
    await expect(page.getByTestId('up-next')).toHaveText('Last Piece');
    await expect(page.getByRole('heading', { name: `That’s the end of ${name}` })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('jumps from the running order, and plays it again from the first Piece', async ({
    page,
    context,
  }) => {
    const name = `Recital ${unique()}`;
    const [first, second, third] = [`One ${unique()}`, `Two ${unique()}`, `Three ${unique()}`];
    const id = await newPerformance(name, [
      await newPiece(first, 3),
      await newPiece(second, 3),
      await newPiece(third, 1),
    ]);
    await signInAsApprovedSinger(context);
    await playThrough(page, id, name);
    await expect(player(page).getByRole('heading', { level: 1 })).toHaveText(first);

    const order = page.getByRole('region', { name: 'Running order' });
    await order.getByRole('button', { name: new RegExp(third) }).click();

    await expect(player(page)).toContainText('Piece 3 of 3');
    await expect(order.getByRole('button', { name: new RegExp(third) })).toHaveAttribute(
      'aria-current',
      'true',
    );

    const end = page.getByRole('heading', { name: `That’s the end of ${name}` });
    await expect(end).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Play it again' }).click();

    await expect(player(page)).toContainText('Piece 1 of 3');
    await expect(player(page).getByRole('heading', { level: 1 })).toHaveText(first);
    await expect(player(page).getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('keeps the options it was started with in its address, and changes them from Options', async ({
    page,
    context,
  }) => {
    const name = `Evensong ${unique()}`;
    const [first, empty] = [`Anthem ${unique()}`, `Psalm ${unique()}`];
    const id = await newPerformance(name, [await newPiece(first, 3), await newPiece(empty, null)]);
    await signInAsApprovedSinger(context);
    await playThrough(page, id, name);

    await page.getByRole('button', { name: 'Options' }).click();
    await page.getByRole('switch', { name: 'Skip Pieces with nothing to play' }).click();

    await expect(page).toHaveURL(`/performances/${id}/play?skip-empty=1&prefer-voice-part=0`);
    // The rest of the run follows the new option: the empty Piece is skipped, so this is the last.
    await expect(page.getByTestId('up-next')).toHaveText('Last Piece');
  });
});
