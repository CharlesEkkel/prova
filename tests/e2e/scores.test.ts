import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { defaultScoreUploadLimitMiB, uploadLimitBytes } from '../../src/lib/core/upload-rules';
import { silentMp3 } from '../audio-fixtures';
import { pdfOfSize, samplePdf } from '../pdf-fixtures';
import { serviceClient } from '../contract/support';
import { isDesktopLayout, signInAsApprovedSinger, signInAsSingerWith } from './support';

const bucket = 'scores';

/** Everything a test arranges, removed at the end. */
const pieces: string[] = [];
const files: string[] = [];
const trackFiles: string[] = [];

test.afterAll(async () => {
  const admin = serviceClient();
  await admin.storage.from(bucket).remove(files);
  await admin.storage.from('practice-tracks').remove(trackFiles);
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

/** Adds a Score the way the app would have, arranged with the service role. */
const addScore = async (
  piece: string,
  options: { readonly label?: string; readonly pages?: number; readonly choir?: boolean } = {},
): Promise<string> => {
  const admin = serviceClient();
  const path = `${piece}/${randomUUID()}.pdf`;
  const stored = await admin.storage
    .from(bucket)
    .upload(path, samplePdf(options.pages ?? 3), { contentType: 'application/pdf' });
  if (stored.error) throw stored.error;
  files.push(path);
  const { data, error } = await admin
    .from('scores')
    .insert({
      piece_id: piece,
      object_path: path,
      label: options.label ?? 'Full score',
      is_choir_score: options.choir ?? false,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

/** A short Practice Track, so the audio can be started and can end. */
const addTrack = async (piece: string, seconds: number): Promise<void> => {
  const admin = serviceClient();
  const path = `${piece}/${randomUUID()}.mp3`;
  const stored = await admin.storage
    .from('practice-tracks')
    .upload(path, silentMp3(seconds), { contentType: 'audio/mpeg' });
  if (stored.error) throw stored.error;
  trackFiles.push(path);
  const { error } = await admin
    .from('practice_tracks')
    .insert({ piece_id: piece, object_path: path, duration_seconds: seconds });
  if (error) throw error;
};

const openPiece = async (page: Page, id: string): Promise<void> => {
  await page.goto(`/repertoire/${id}`);
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

/** Taps a Score's row in the open panel, which opens it full screen. */
const tapScore = async (page: Page, label: string): Promise<void> => {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
};

test.describe('a Score is opt-in', () => {
  test('is never opened on its own: the panel is collapsed, then lists the Scores, and a page appears only when one is chosen', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { label: 'Piano reduction' });
    await addScore(piece.id, { label: 'Full score', choir: true });
    await signInAsApprovedSinger(context);
    const pdfRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/scores/')) pdfRequests.push(request.url());
    });
    await openPiece(page, piece.id);

    await expect(page.getByTestId('scores-panel-trigger')).toContainText('Scores');
    await expect(page.getByTestId('scores-panel-trigger')).toContainText('2');
    await expect(page.getByTestId('score').first()).toBeHidden();
    await expect(page.getByTestId('score-page')).toHaveCount(0);

    await page.getByTestId('scores-panel-trigger').click();
    const rows = page.getByTestId('score');
    await expect(rows).toHaveCount(2);
    // The choir score is first and marked.
    await expect(rows.first()).toContainText('Full score');
    await expect(rows.first().getByTestId('choir-badge')).toHaveText('Choir score');
    await expect(rows.last().getByTestId('choir-badge')).toHaveCount(0);
    // Still nothing is shown or fetched, and there is no inline preview or separate open button.
    await expect(page.getByTestId('score-page')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open full screen' })).toHaveCount(0);
    expect(pdfRequests).toEqual([]);

    // Tapping a row opens that Score full screen straight away.
    await tapScore(page, 'Piano reduction');
    const viewer = page.getByTestId('score-viewer');
    await expect(viewer).toBeVisible();
    await expect(viewer).toContainText('Piano reduction');
    await expect(viewer.getByTestId('score-page')).toHaveAttribute('data-drawn', /\|1$/);
    await expect(viewer.getByTestId('page-indicator')).toHaveText('Page 1 of 3');
    expect(pdfRequests.length).toBeGreaterThan(0);
  });

  test('opens the choir score from its row too, even though it carries a badge', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { label: 'Full score', choir: true });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);
    await page.getByTestId('scores-panel-trigger').click();

    await tapScore(page, 'Full score');

    await expect(page.getByTestId('score-viewer')).toContainText('Full score');
  });

  test('shows a Piece without Scores no list rows and no upload button to a reader', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    await page.getByTestId('scores-panel-trigger').click();

    await expect(page.getByText('No Scores yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Score' })).toHaveCount(0);
  });
});

test.describe('the full-screen viewer', () => {
  const openViewer = async (page: Page, label = 'Full score') => {
    await page.getByTestId('scores-panel-trigger').click();
    await tapScore(page, label);
    const viewer = page.getByTestId('score-viewer');
    await expect(viewer).toBeVisible();
    await expect(viewer.getByTestId('score-page')).toHaveAttribute('data-drawn', /\|1$/);
    return viewer;
  };

  test('turns pages by tapping the right or left half, the edge buttons and the keys, without counting a button twice', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { pages: 5 });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);
    const viewer = await openViewer(page);
    const stage = viewer.getByTestId('score-stage');
    const indicator = viewer.getByTestId('page-indicator');
    const box = await stage.boundingBox();
    if (box === null) throw new Error('the viewer has no stage');
    const y = box.y + box.height / 2;

    await expect(indicator).toHaveText('Page 1 of 5');

    await page.mouse.click(box.x + box.width * 0.75, y);
    await expect(indicator).toHaveText('Page 2 of 5');
    await page.mouse.click(box.x + box.width * 0.75, y);
    await expect(indicator).toHaveText('Page 3 of 5');
    await page.mouse.click(box.x + box.width * 0.25, y);
    await expect(indicator).toHaveText('Page 2 of 5');

    // An edge button turns exactly one page.
    await viewer.getByRole('button', { name: 'Next page' }).click();
    await expect(indicator).toHaveText('Page 3 of 5');
    await viewer.getByRole('button', { name: 'Previous page' }).click();
    await expect(indicator).toHaveText('Page 2 of 5');

    for (const [key, expected] of [
      ['ArrowRight', 'Page 3 of 5'],
      ['PageDown', 'Page 4 of 5'],
      ['ArrowDown', 'Page 5 of 5'],
      ['ArrowRight', 'Page 5 of 5'],
      ['ArrowLeft', 'Page 4 of 5'],
      ['PageUp', 'Page 3 of 5'],
      ['ArrowUp', 'Page 2 of 5'],
    ] as const) {
      await page.keyboard.press(key);
      await expect(indicator).toHaveText(expected);
    }
    await expect(viewer.getByTestId('score-page')).toHaveAttribute('data-drawn', /\|2$/);
  });

  test('turns pages by swiping, once', async ({ page, context }) => {
    const piece = await newPiece();
    await addScore(piece.id, { pages: 4 });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);
    const viewer = await openViewer(page);
    const box = await viewer.getByTestId('score-stage').boundingBox();
    if (box === null) throw new Error('the viewer has no stage');
    const y = box.y + box.height / 2;
    const indicator = viewer.getByTestId('page-indicator');

    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, y, { steps: 5 });
    await page.mouse.up();
    await expect(indicator).toHaveText('Page 2 of 4');

    await page.mouse.move(box.x + box.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, y, { steps: 5 });
    await page.mouse.up();
    await expect(indicator).toHaveText('Page 1 of 4');
  });

  test('remembers the page for each Score when it is reopened, and closes on Esc and the close button', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { label: 'Full score', pages: 4 });
    await addScore(piece.id, { label: 'Piano reduction', pages: 4 });
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);
    let viewer = await openViewer(page, 'Full score');
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await expect(viewer.getByTestId('page-indicator')).toHaveText('Page 3 of 4');

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();

    // Reopening the Score returns to the page it was on.
    await tapScore(page, 'Full score');
    viewer = page.getByTestId('score-viewer');
    await expect(viewer.getByTestId('page-indicator')).toHaveText('Page 3 of 4');
    await viewer.getByRole('button', { name: 'Close' }).click();
    await expect(viewer).toBeHidden();

    // Another Score has its own page.
    await tapScore(page, 'Piano reduction');
    await expect(viewer.getByTestId('page-indicator')).toHaveText('Page 1 of 4');
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await tapScore(page, 'Full score');
    await expect(viewer.getByTestId('page-indicator')).toHaveText('Page 3 of 4');
  });

  test('has the playback controls beneath, offers Start when nothing plays, and leaves when the song ends', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id);
    await addTrack(piece.id, 2);
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    const viewer = await openViewer(page);
    await viewer.getByRole('button', { name: 'Start' }).click();
    await expect(viewer.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(viewer.getByRole('slider', { name: 'Seek' })).toBeVisible();

    // The 2-second track ends and the viewer goes with it.
    await expect(viewer).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('score').first()).toBeVisible();
  });

  test('stays when the Singer reopens it after the song has ended', async ({ page, context }) => {
    const piece = await newPiece();
    await addScore(piece.id);
    await addTrack(piece.id, 1);
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const viewer = await openViewer(page);

    await expect(viewer).toBeVisible();
    await expect(viewer.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });
});

test.describe('uploading a Score', () => {
  const openUpload = async (page: Page) => {
    await page.getByTestId('scores-panel-trigger').click();
    await page.getByRole('button', { name: 'Upload Score' }).click();
    return page.getByRole('dialog');
  };

  test('states the type and the limit first, starts the label as the file name, and makes the first Score the choir score', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);

    const dialog = await openUpload(page);
    await expect(dialog.getByTestId('upload-rules')).toHaveText('PDF, up to 20 MB.');
    await expect(dialog.getByRole('button', { name: 'Upload', exact: true })).toBeDisabled();
    const choir = dialog.getByRole('checkbox', { name: /Make this the choir score/ });
    await expect(choir).toBeChecked();

    await dialog.getByLabel('PDF file').setInputFiles({
      name: 'Requiem full score.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(samplePdf(2)),
    });
    await expect(dialog.getByLabel('Label')).toHaveValue('Requiem full score');
    await dialog.getByLabel('Label').fill('Full score');
    await dialog.getByRole('button', { name: 'Upload', exact: true }).click();

    await expect(dialog).toBeHidden();
    const row = page.getByTestId('score');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Full score');
    await expect(row.getByTestId('choir-badge')).toBeVisible();
  });

  test('does not offer the choir score to append alone once the Piece has one, and a second upload is an ordinary Score', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { label: 'Full score', choir: true });
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);

    const dialog = await openUpload(page);
    await expect(dialog.getByRole('checkbox')).toHaveCount(0);
    await dialog.getByLabel('PDF file').setInputFiles({
      name: 'Piano.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(samplePdf(1)),
    });
    await dialog.getByRole('button', { name: 'Upload', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('score')).toHaveCount(2);
    await expect(page.getByTestId('choir-badge')).toHaveCount(1);
    await expect(page.getByTestId('score').first()).toContainText('Full score');
  });

  test('lets a Singer who may also update replace the choir score at upload, starting unticked', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { label: 'Old edition', choir: true });
    await signInAsSingerWith(context, ['append', 'update']);
    await openPiece(page, piece.id);

    const dialog = await openUpload(page);
    const choir = dialog.getByRole('checkbox', { name: /Make this the choir score/ });
    await expect(choir).not.toBeChecked();
    await dialog.getByLabel('PDF file').setInputFiles({
      name: 'New edition.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(samplePdf(1)),
    });
    await choir.click();
    await dialog.getByRole('button', { name: 'Upload', exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('score').first()).toContainText('New edition');
    await expect(page.getByTestId('score').first().getByTestId('choir-badge')).toBeVisible();
    await expect(page.getByTestId('choir-badge')).toHaveCount(1);
  });

  test('refuses a wrong type and a file over the limit before sending, with a clear message', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);
    const dialog = await openUpload(page);
    const upload = dialog.getByRole('button', { name: 'Upload', exact: true });

    await dialog.getByLabel('PDF file').setInputFiles({
      name: 'take.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from(silentMp3(1)),
    });
    await expect(dialog.getByTestId('file-problem')).toContainText('not a PDF');
    await expect(upload).toBeDisabled();

    await dialog.getByLabel('PDF file').setInputFiles({
      name: 'huge.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(pdfOfSize(uploadLimitBytes(defaultScoreUploadLimitMiB) + 1)),
    });
    await expect(dialog.getByTestId('file-problem')).toContainText('over 20 MB');
    await expect(upload).toBeDisabled();

    await dialog.getByLabel('PDF file').setInputFiles({
      name: 'fine.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(samplePdf(1)),
    });
    await expect(dialog.getByTestId('file-problem')).toHaveCount(0);
    await expect(upload).toBeEnabled();
  });

  test('darkens the Browse button when the mouse is over it', async ({ page, context }) => {
    test.skip(!isDesktopLayout(page), 'a touch screen has no hover');
    const piece = await newPiece();
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);
    const dialog = await openUpload(page);
    const field = dialog.getByLabel('PDF file');
    const background = () =>
      field.evaluate(
        (element) => getComputedStyle(element, '::file-selector-button').backgroundColor,
      );
    // Park the mouse away from the field first, then over the button at its left end.
    await page.mouse.move(0, 0);
    await expect.poll(background).not.toBe('');
    const resting = await background();

    await field.hover({ position: { x: 12, y: 12 } });

    await expect.poll(background).not.toBe(resting);
  });

  test('shows a focus ring on the Browse button when the file field has keyboard focus', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece.id);
    const dialog = await openUpload(page);
    const field = dialog.getByLabel('PDF file');

    await field.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    await expect(field).toBeFocused();
    const ring = await field.evaluate((element) => {
      const button = getComputedStyle(element, '::file-selector-button');
      return { style: button.outlineStyle, width: button.outlineWidth };
    });
    expect(ring).toEqual({ style: 'solid', width: '2px' });
  });

  test('shows a Singer holding only read no upload button and no row actions', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id);
    await signInAsApprovedSinger(context);
    await openPiece(page, piece.id);

    await page.getByTestId('scores-panel-trigger').click();

    await expect(page.getByTestId('score')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Upload Score' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Actions for/ })).toHaveCount(0);
  });
});

test.describe('managing Scores', () => {
  test('lets a Singer with update rename a label and make another Score the choir score', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { label: 'Old name', choir: true });
    await addScore(piece.id, { label: 'Piano' });
    await signInAsSingerWith(context, ['update']);
    await openPiece(page, piece.id);
    await page.getByTestId('scores-panel-trigger').click();

    await page.getByRole('button', { name: /^Actions for Old name/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Delete…' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Make this the choir score' })).toBeDisabled();
    await page.getByRole('menuitem', { name: 'Rename label…' }).click();
    const rename = page.getByRole('dialog');
    await rename.getByLabel('Label').fill('New name');
    await rename.getByRole('button', { name: 'Save label' }).click();
    await expect(rename).toBeHidden();
    await expect(page.getByTestId('score').first()).toContainText('New name');

    await page.getByRole('button', { name: /^Actions for Piano/ }).click();
    await page.getByRole('menuitem', { name: 'Make this the choir score' }).click();
    const promote = page.getByRole('dialog');
    await expect(promote).toContainText('replaces New name');
    await promote.getByRole('button', { name: 'Make choir score' }).click();
    await expect(promote).toBeHidden();
    await expect(page.getByTestId('score').first()).toContainText('Piano');
    await expect(page.getByTestId('score').first().getByTestId('choir-badge')).toBeVisible();
    await expect(page.getByTestId('choir-badge')).toHaveCount(1);
  });

  test('lets a Singer with delete remove the choir score, leaving the Piece without one', async ({
    page,
    context,
  }) => {
    const piece = await newPiece();
    await addScore(piece.id, { label: 'Choir copy', choir: true });
    await addScore(piece.id, { label: 'Piano' });
    await signInAsSingerWith(context, ['delete']);
    await openPiece(page, piece.id);
    await page.getByTestId('scores-panel-trigger').click();

    await page.getByRole('button', { name: /^Actions for Choir copy/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Rename label…' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('without a choir score');
    await confirm.getByRole('button', { name: 'Delete Score' }).click();

    await expect(page.getByTestId('score')).toHaveCount(1);
    await expect(page.getByTestId('score')).toContainText('Piano');
    // Nothing is promoted in its place.
    await expect(page.getByTestId('choir-badge')).toHaveCount(0);
  });
});

test.describe('the Score address', () => {
  test('serves a signed-in Singer with seeking and a one-hour private cache, and nobody else', async ({
    context,
    playwright,
    baseURL,
  }) => {
    const piece = await newPiece();
    const score = await addScore(piece.id);
    await signInAsApprovedSinger(context);
    const path = `/repertoire/${piece.id}/scores/${score}/file`;

    const signedIn = await context.request.get(path, { headers: { range: 'bytes=0-4' } });
    expect(signedIn.status()).toBe(206);
    expect(signedIn.headers()['content-type']).toBe('application/pdf');
    expect(signedIn.headers()['accept-ranges']).toBe('bytes');
    expect(signedIn.headers()['cache-control']).toBe('private, max-age=3600');
    expect((await signedIn.body()).toString()).toBe('%PDF-');
    expect((await context.request.get(path)).status()).toBe(200);

    const stranger = await playwright.request.newContext({ baseURL: baseURL ?? '' });
    const refused = await stranger.get(path, { maxRedirects: 0 });
    expect(refused.status()).toBe(303);
    expect(refused.headers()['content-type'] ?? '').not.toContain('pdf');
    await stranger.dispose();
  });

  test('is not found for a Score on another Piece', async ({ context }) => {
    const piece = await newPiece();
    const other = await newPiece();
    const score = await addScore(piece.id);
    await signInAsApprovedSinger(context);

    const missing = await context.request.get(`/repertoire/${other.id}/scores/${score}/file`);

    expect(missing.status()).toBe(404);
  });
});

test.describe('scanned scores', () => {
  test('are decoded with the WebAssembly files the app serves', async ({ context }) => {
    await signInAsApprovedSinger(context);

    for (const file of ['jbig2.wasm', 'openjpeg.wasm', 'qcms_bg.wasm']) {
      const response = await context.request.get(`/pdfjs/wasm/${file}`);
      expect(response.status(), file).toBe(200);
      expect(response.headers()['content-type'], file).toContain('wasm');
    }
  });
});
