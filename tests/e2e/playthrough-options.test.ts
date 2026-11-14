import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { serviceClient } from '../contract/support';
import { signInAsApprovedSinger } from './support';

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

/** A Practice Track for a Voice Part, or the Combined Track when no part is given. */
type Track = { readonly part?: string };

/** A Piece with these Practice Tracks listed (the Overview reads them, never plays them, so no file is stored). */
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
        kind: track.part === undefined ? null : 'part-only',
      });
    if (added.error) throw added.error;
  }
  return data.id;
};

/** A Performance holding these Pieces in this order, arranged by the service role. */
const newPerformance = async (name: string, pieceIds: readonly string[] = []): Promise<string> => {
  made.performances.push(name);
  const { data, error } = await serviceClient()
    .from('performances')
    .insert({ name, starts_at: '2030-06-01T18:00:00Z', ends_at: '2030-06-01T20:00:00Z' })
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

const openOverview = async (page: Page, id: string) => {
  await page.goto(`/?overview=${id}`);
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

/** A Performance whose three Pieces an Alto hears differently: All, nothing at all, and no Alto track. */
const mixedPerformance = async () => {
  const name = `Spring ${unique()}`;
  const [both, empty, tenor] = [`Both ${unique()}`, `Empty ${unique()}`, `Tenor ${unique()}`];
  const id = await newPerformance(name, [
    await newPiece(both, [{ part: 'Alto' }, {}]),
    await newPiece(empty),
    await newPiece(tenor, [{ part: 'Tenor' }]),
  ]);
  return { id, name, both, empty, tenor };
};

test.describe('the Play-through options in the Overview', () => {
  test('change what each Piece plays, which are skipped and the count, live, and Play starts with them', async ({
    page,
    context,
  }) => {
    const { id, name, both, empty, tenor } = await mixedPerformance();
    await signInAsApprovedSinger(context);
    await openOverview(page, id);

    const overview = page.getByRole('dialog', { name });
    const row = (title: string) => overview.getByRole('listitem').filter({ hasText: title });
    const skipEmpty = overview.getByRole('switch', { name: 'Skip Pieces with nothing to play' });
    const preferVoicePart = overview.getByRole('switch', { name: 'Prefer my Voice Part' });
    const play = overview.getByRole('link', { name: /^Play through/ });

    // Both start off on a device that has never changed them.
    await expect(skipEmpty).not.toBeChecked();
    await expect(preferVoicePart).not.toBeChecked();
    await expect(row(both)).toContainText('All');
    await expect(row(empty)).toContainText('No tracks yet');
    await expect(row(tenor)).toContainText('No Alto track');
    await expect(play).toHaveText('Play through · 3 Pieces');

    await preferVoicePart.click();
    await expect(row(both)).toContainText('Alto only');
    await expect(play).toHaveText('Play through · 3 Pieces');

    await skipEmpty.click();
    await expect(row(empty)).toContainText('Skipped · No tracks yet');
    await expect(row(tenor)).toContainText('Skipped · No Alto track');
    await expect(row(both)).not.toContainText('Skipped');
    await expect(play).toHaveText('Play through · 1 Piece');

    await play.click();

    await expect(page).toHaveURL(`/performances/${id}/play?skip-empty=1&prefer-voice-part=1`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Play-through of ${name}`);
    await expect(page.getByText(`First: ${both} · Alto only`)).toBeVisible();

    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page.getByRole('dialog', { name })).toBeVisible();
  });

  test('are remembered on this device, for every Performance', async ({ page, context }) => {
    const { id, name } = await mixedPerformance();
    const other = `Autumn ${unique()}`;
    const otherId = await newPerformance(other, [await newPiece(`Solo ${unique()}`, [{}])]);
    await signInAsApprovedSinger(context);
    await openOverview(page, id);

    await page
      .getByRole('dialog', { name })
      .getByRole('switch', { name: 'Skip Pieces with nothing to play' })
      .click();
    await page.keyboard.press('Escape');
    await openOverview(page, otherId);

    const overview = page.getByRole('dialog', { name: other });
    await expect(
      overview.getByRole('switch', { name: 'Skip Pieces with nothing to play' }),
    ).toBeChecked();
    await expect(overview.getByRole('switch', { name: 'Prefer my Voice Part' })).not.toBeChecked();
  });

  test('start off when what the device remembers cannot be read', async ({ page, context }) => {
    const { id, name } = await mixedPerformance();
    await signInAsApprovedSinger(context);
    await context.addInitScript(() => {
      localStorage.setItem('prova-playthrough-options', 'not options');
    });
    await openOverview(page, id);

    const overview = page.getByRole('dialog', { name });
    await expect(
      overview.getByRole('switch', { name: 'Skip Pieces with nothing to play' }),
    ).not.toBeChecked();
    await expect(overview.getByRole('switch', { name: 'Prefer my Voice Part' })).not.toBeChecked();
  });

  test('leave Play disabled only when there is nothing to stop at', async ({ page, context }) => {
    const name = `Empty ${unique()}`;
    const id = await newPerformance(name, [await newPiece(`Nothing ${unique()}`)]);
    await signInAsApprovedSinger(context);
    await openOverview(page, id);

    const overview = page.getByRole('dialog', { name });
    // With skip-empty off, a Play-through still starts and pauses at the empty Piece.
    await expect(overview.getByRole('link', { name: 'Play through · 1 Piece' })).toBeVisible();

    await overview.getByRole('switch', { name: 'Skip Pieces with nothing to play' }).click();

    await expect(overview.getByRole('button', { name: 'Play through · 0 Pieces' })).toBeDisabled();
  });
});
