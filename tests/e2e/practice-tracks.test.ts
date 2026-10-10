import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { defaultUploadLimitMiB, uploadLimitBytes } from '../../src/lib/core/upload-rules';
import { bytesOfSize, silentMp3 } from '../audio-fixtures';
import { serviceClient } from '../contract/support';
import { signInAsApprovedSinger, signInAsSingerWith } from './support';

const bucket = 'practice-tracks';

/** Everything a test arranges, removed at the end. */
const pieces: string[] = [];
const files: string[] = [];

test.afterAll(async () => {
  const admin = serviceClient();
  await admin.storage.from(bucket).remove(files);
  await admin.from('pieces').delete().in('id', pieces);
});

const newPiece = async (): Promise<{ readonly id: string; readonly title: string }> => {
  const title = `Piece ${randomUUID().slice(0, 8)}`;
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  pieces.push(data.id);
  return { id: data.id, title };
};

const voicePartId = async (name: string): Promise<string> => {
  const { data } = await serviceClient().from('voice_parts').select('id').eq('name', name).single();
  return data?.id ?? '';
};

/** Adds a track the way the app would have, arranged with the service role. */
const addTrack = async (
  piece: string,
  options: {
    readonly part?: string;
    readonly kind?: 'part-only' | 'part-predominant';
    readonly label?: string;
    readonly seconds?: number;
  } = {},
): Promise<string> => {
  const admin = serviceClient();
  const path = `${piece}/${randomUUID()}.mp3`;
  const stored = await admin.storage
    .from(bucket)
    .upload(path, silentMp3(options.seconds ?? 30), { contentType: 'audio/mpeg' });
  if (stored.error) throw stored.error;
  files.push(path);
  const { data, error } = await admin
    .from('practice_tracks')
    .insert({
      piece_id: piece,
      object_path: path,
      label: options.label ?? '',
      voice_part_id: options.part ?? null,
      kind: options.kind ?? null,
    })
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

const positionSeconds = async (page: Page): Promise<number> => {
  const [minutes = '0', seconds = '0'] = ((await page.getByTestId('position').textContent()) ?? '')
    .trim()
    .split(':');
  return Number(minutes) * 60 + Number(seconds);
};

test.describe('uploading a Practice Track', () => {
  test('states the types and the limit first, uploads a part track with its kind and label, and plays it', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);

    await page.getByTestId('tracks-panel-trigger').click();
    await page.getByRole('button', { name: 'Upload Practice Track' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('upload-rules')).toHaveText('MP3 or M4A, up to 10 MB.');
    await expect(dialog.getByRole('button', { name: 'Upload', exact: true })).toBeDisabled();

    await dialog.getByLabel('Audio file').setInputFiles({
      name: 'alto.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from(silentMp3(30)),
    });
    // A part track needs its kind before it can be sent.
    await expect(dialog.getByRole('button', { name: 'Upload', exact: true })).toBeDisabled();
    await dialog.getByRole('radio', { name: /Part \+ mix/ }).click();
    await dialog.getByLabel(/^Label/).fill('slow tempo');
    await dialog.getByRole('button', { name: 'Upload', exact: true }).click();

    await expect(dialog).toBeHidden();
    const row = page.getByTestId('track');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('slow tempo');
    await expect(row.getByTestId('kind-badge')).toHaveText('Part + mix');
    await expect(row).toContainText(/\d:\d\d/);

    // Alto is the Singer's part and the Piece has no Combined Track, so it plays by default.
    await expect(page.getByTestId('part-indicator')).toContainText('Alto + mix');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect.poll(() => positionSeconds(page)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Forward 10 seconds' }).click();
    await expect.poll(() => positionSeconds(page)).toBeGreaterThanOrEqual(10);
    await page.getByRole('slider', { name: 'Seek' }).fill('25');
    await expect.poll(() => positionSeconds(page)).toBeGreaterThanOrEqual(25);
    await page.getByRole('button', { name: 'Back 10 seconds' }).click();
    await expect.poll(() => positionSeconds(page)).toBeLessThan(25);
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('uploads a Combined Track', async ({ page, context }) => {
    const piece = await newPiece();
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);

    await page.getByTestId('tracks-panel-trigger').click();
    await page.getByRole('button', { name: 'Upload Practice Track' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: /^All parts/ }).click();
    await dialog.getByLabel('Audio file').setInputFiles({
      name: 'everyone.m4a',
      mimeType: 'audio/mp4',
      buffer: Buffer.from(silentMp3(5)),
    });
    await dialog.getByRole('button', { name: 'Upload', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('track').getByTestId('kind-badge')).toHaveText('Combined');
    await expect(page.getByTestId('part-indicator')).toContainText('All');
  });

  test('refuses a wrong type and a file over the limit before sending, with a clear message', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);

    await page.getByTestId('tracks-panel-trigger').click();
    await page.getByRole('button', { name: 'Upload Practice Track' }).click();
    const dialog = page.getByRole('dialog');
    const upload = dialog.getByRole('button', { name: 'Upload', exact: true });
    await dialog.getByRole('radio', { name: /^All parts/ }).click();

    await dialog.getByLabel('Audio file').setInputFiles({
      name: 'take.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.from(silentMp3(1)),
    });
    await expect(dialog.getByTestId('file-problem')).toContainText('not an MP3 or M4A file');
    await expect(upload).toBeDisabled();

    await dialog.getByLabel('Audio file').setInputFiles({
      name: 'huge.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from(bytesOfSize(uploadLimitBytes(defaultUploadLimitMiB) + 1)),
    });
    await expect(dialog.getByTestId('file-problem')).toContainText('over 10 MB');
    await expect(upload).toBeDisabled();

    await dialog.getByLabel('Audio file').setInputFiles({
      name: 'fine.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from(silentMp3(1)),
    });
    await expect(dialog.getByTestId('file-problem')).toHaveCount(0);
    await expect(upload).toBeEnabled();
  });

  test('shows a Singer holding only read no upload button and no row actions, but lets them play', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addTrack(piece.id, { label: 'everyone' });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    await page.getByTestId('tracks-panel-trigger').click();
    await expect(page.getByTestId('track')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Upload Practice Track' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Actions for/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect.poll(() => positionSeconds(page)).toBeGreaterThan(0);
  });
});

test.describe('which track plays', () => {
  test('plays the Combined Track first, and any other track once from the part indicator', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addTrack(piece.id, { part: await voicePartId('Alto'), kind: 'part-only' });
    await addTrack(piece.id, { part: await voicePartId('Bass'), kind: 'part-predominant' });
    await addTrack(piece.id, { label: 'everyone' });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    const indicator = page.getByTestId('part-indicator');
    await expect(indicator).toContainText('All');

    await indicator.click();
    await page.getByRole('radio', { name: 'Alto', exact: true }).click();
    await expect(indicator).toContainText('Alto only');
    await page.getByRole('radio', { name: 'Bass', exact: true }).click();
    await expect(indicator).toContainText('Bass + mix');
    await page.getByRole('radio', { name: /^All parts/ }).click();
    await expect(indicator).toContainText('All');
    // Tenor has no track on this Piece.
    await expect(page.getByRole('radio', { name: 'Tenor', exact: true })).toBeDisabled();
  });

  test('falls back to the Singer’s own part when there is no Combined Track', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addTrack(piece.id, { part: await voicePartId('Tenor'), kind: 'part-only' });
    await addTrack(piece.id, { part: await voicePartId('Alto'), kind: 'part-predominant' });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    await expect(page.getByTestId('part-indicator')).toContainText('Alto + mix');
  });

  test('plays the first uploaded when a Piece has several tracks for the same part', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    const alto = await voicePartId('Alto');
    await addTrack(piece.id, { part: alto, kind: 'part-only', label: 'first' });
    await addTrack(piece.id, { part: alto, kind: 'part-predominant', label: 'second' });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    await expect(page.getByTestId('part-indicator')).toContainText('Alto only');
  });

  test('never starts by itself', async ({ page, context }) => {
    const piece = await newPiece();
    await addTrack(piece.id);
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0);
    await expect(page.getByTestId('player')).not.toContainText('Running order');
  });
});

test.describe('managing Practice Tracks', () => {
  test('lets a Singer with update rename a label', async ({ page, context }) => {
    const piece = await newPiece();
    await addTrack(piece.id, { label: 'old name' });
    await signInAsSingerWith(context, ['update']);
    await openPiece(page, piece.id);

    await page.getByTestId('tracks-panel-trigger').click();
    await page.getByRole('button', { name: /^Actions for old name/ }).click();
    await page.getByRole('menuitem', { name: 'Rename label…' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Label').fill('new name');
    await dialog.getByRole('button', { name: 'Save label' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('track')).toContainText('new name');
    await expect(page.getByRole('menuitem', { name: 'Delete…' })).toHaveCount(0);
  });

  test('lets a Singer with delete remove a track, and shows only the action they may use', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addTrack(piece.id, { label: 'wrong one' });
    await signInAsSingerWith(context, ['delete']);
    await openPiece(page, piece.id);

    await page.getByTestId('tracks-panel-trigger').click();
    await page.getByRole('button', { name: /^Actions for wrong one/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Rename label…' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete track' }).click();

    await expect(page.getByTestId('track')).toHaveCount(0);
    await expect(page.getByText('No Practice Track for this Piece yet.')).toBeVisible();
  });
});

test.describe('the audio address', () => {
  test('serves a signed-in Singer with seeking and a one-hour private cache, and nobody else', async ({
    context,
    playwright,
    baseURL,
  }) => {
    const piece = await newPiece();
    const track = await addTrack(piece.id);
    await signInAsApprovedSinger(context);
    const path = `/repertoire/${piece.id}/tracks/${track}/audio`;

    const signedIn = await context.request.get(path, { headers: { range: 'bytes=0-99' } });
    expect(signedIn.status()).toBe(206);
    expect(signedIn.headers()['content-range']).toMatch(/^bytes 0-99\//);
    expect(signedIn.headers()['accept-ranges']).toBe('bytes');
    expect(signedIn.headers()['cache-control']).toBe('private, max-age=3600');
    expect((await signedIn.body()).byteLength).toBe(100);

    const whole = await context.request.get(path);
    expect(whole.status()).toBe(200);

    const stranger = await playwright.request.newContext({ baseURL: baseURL ?? '' });
    const refused = await stranger.get(path, { maxRedirects: 0 });
    expect(refused.status()).toBe(303);
    expect(refused.headers()['content-type'] ?? '').not.toContain('audio');
    await stranger.dispose();
  });

  test('is not found for a track on another Piece', async ({ context }) => {
    const piece = await newPiece();
    const other = await newPiece();
    const track = await addTrack(piece.id);
    await signInAsApprovedSinger(context);

    const missing = await context.request.get(`/repertoire/${other.id}/tracks/${track}/audio`);

    expect(missing.status()).toBe(404);
  });
});
