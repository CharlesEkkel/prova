import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { serviceClient } from '../contract/support';
import {
  isDesktopLayout,
  openNavigation,
  signInAsApprovedSinger,
  signInAsSingerWith,
} from './support';

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

/** A Performance holding these Pieces in this order, arranged by the service role. */
const newPerformance = async (
  name: string,
  pieceIds: readonly string[] = [],
  startsAt = '2030-06-01T18:00:00Z',
  endsAt = '2030-06-01T20:00:00Z',
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

const openOverview = async (page: Page, id: string) => {
  await page.goto(`/repertoire?overview=${id}`);
  await settle(page);
};

test.describe('the Performance Overview', () => {
  test('lists the Pieces in order, with no menus for a Singer with only read', async ({
    page,
    context,
  }) => {
    const name = `Read only ${unique()}`;
    const [first, second] = [`One ${unique()}`, `Two ${unique()}`];
    const id = await newPerformance(name, [await newPiece(first), await newPiece(second)]);
    await signInAsApprovedSinger(context);

    await openOverview(page, id);

    const overview = page.getByRole('dialog', { name });
    await expect(overview.getByRole('listitem')).toHaveText([
      new RegExp(`1.*${first}`),
      new RegExp(`2.*${second}`),
    ]);
    await expect(overview.getByRole('button', { name: /^Actions for/ })).toHaveCount(0);
  });

  test('opens a Piece from its row', async ({ page, context }) => {
    const name = `Rows ${unique()}`;
    const title = `Opened ${unique()}`;
    const id = await newPerformance(name, [await newPiece(title)]);
    await signInAsApprovedSinger(context);
    await openOverview(page, id);

    await page
      .getByRole('dialog', { name })
      .getByRole('link', { name: new RegExp(title) })
      .click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('lets a Singer with update remove a Piece from this Performance', async ({
    page,
    context,
  }) => {
    const name = `Remove ${unique()}`;
    const [kept, gone] = [`Kept ${unique()}`, `Gone ${unique()}`];
    const id = await newPerformance(name, [await newPiece(kept), await newPiece(gone)]);
    await signInAsSingerWith(context, ['update']);
    await openOverview(page, id);

    const overview = page.getByRole('dialog', { name });
    await overview.getByRole('button', { name: `Actions for ${gone}` }).click();
    await page.getByRole('menuitem', { name: 'Remove from this Performance' }).click();

    await expect(overview.getByRole('listitem')).toHaveText([new RegExp(`1.*${kept}`)]);
  });

  test('lets a Singer with update reorder the Pieces from the keyboard, and keeps the order', async ({
    page,
    context,
  }) => {
    const name = `Order ${unique()}`;
    const [first, second] = [`First ${unique()}`, `Second ${unique()}`];
    const id = await newPerformance(name, [await newPiece(first), await newPiece(second)]);
    await signInAsSingerWith(context, ['update']);
    await openOverview(page, id);

    const saved = page.waitForResponse(
      (response) => response.url().includes('?/reorder') && response.request().method() === 'POST',
    );
    await page.getByLabel(`Drag to reorder ${second}`).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    expect((await saved).ok()).toBe(true);

    await page.reload();
    await settle(page);
    await expect(page.getByRole('dialog', { name }).getByRole('listitem')).toHaveText([
      new RegExp(`1.*${second}`),
      new RegExp(`2.*${first}`),
    ]);
  });

  test('lets a Singer with update edit a past Performance', async ({ page, context }) => {
    const name = `Past ${unique()}`;
    const renamed = `Renamed ${unique()}`;
    made.performances.push(renamed);
    const id = await newPerformance(name, [], '2020-06-01T18:00:00Z', '2020-06-01T20:00:00Z');
    await signInAsSingerWith(context, ['update']);
    await openOverview(page, id);

    await page.getByRole('button', { name: `Actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Edit Performance…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Performance' });
    await dialog.getByLabel('Name').fill(renamed);
    // Entered and shown in the Choir Time Zone, whichever it is.
    await dialog.getByLabel('Starts').fill('2020-06-01T18:00');
    await dialog.getByLabel('Ends').fill('2020-06-01T20:00');
    await dialog.getByLabel('Venue (optional)').fill('Chapel');
    await dialog.getByRole('button', { name: 'Save Performance' }).click();

    await expect(dialog).toBeHidden();
    const overview = page.getByRole('dialog', { name: renamed });
    await expect(overview.getByText('Mon 1 Jun 2020, 18:00–20:00 · Chapel')).toBeVisible();
  });

  test('shows an end before the start inside the edit dialog', async ({ page, context }) => {
    const name = `Backwards ${unique()}`;
    const id = await newPerformance(name);
    await signInAsSingerWith(context, ['update']);
    await openOverview(page, id);

    await page.getByRole('button', { name: `Actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Edit Performance…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Performance' });
    await dialog.getByLabel('Ends').fill('2030-06-01T17:00');
    await dialog.getByRole('button', { name: 'Save Performance' }).click();

    await expect(dialog.getByRole('alert')).toHaveText(/end must come after its start/);
  });

  test('lets a Singer with delete delete it, after saying its Pieces stay', async ({
    page,
    context,
  }) => {
    const name = `Doomed ${unique()}`;
    const title = `Survivor ${unique()}`;
    const id = await newPerformance(name, [await newPiece(title)]);
    await signInAsSingerWith(context, ['delete']);
    await openOverview(page, id);

    await page.getByRole('button', { name: `Actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Delete Performance…' }).click();
    const confirm = page.getByRole('alertdialog', { name: `Delete ${name}?` });
    await expect(confirm).toContainText('Its Pieces stay in the Repertoire.');
    await confirm.getByRole('button', { name: 'Delete Performance' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/\/repertoire$/);
    await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  });
});

const openPiece = async (page: Page, id: string) => {
  await page.goto(`/repertoire/${id}`);
  await settle(page);
};

test.describe('a Piece and its Performances', () => {
  test('lets a Singer with update add a Piece to several Performances, at the end of each', async ({
    page,
    context,
  }) => {
    const title = `Added ${unique()}`;
    const held = `Held ${unique()}`;
    const piece = await newPiece(title);
    const [soon, later, past, already] = [
      `Soon ${unique()}`,
      `Later ${unique()}`,
      `Past ${unique()}`,
      `Already ${unique()}`,
    ];
    const soonId = await newPerformance(
      soon,
      [await newPiece(held)],
      '2030-01-01T18:00:00Z',
      '2030-01-01T20:00:00Z',
    );
    await newPerformance(later, [], '2030-02-01T18:00:00Z', '2030-02-01T20:00:00Z');
    await newPerformance(past, [], '2020-01-01T18:00:00Z', '2020-01-01T20:00:00Z');
    await newPerformance(already, [piece], '2030-03-01T18:00:00Z', '2030-03-01T20:00:00Z');
    await signInAsSingerWith(context, ['update']);
    await openPiece(page, piece);

    await page.getByRole('button', { name: `Actions for ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Add to a Performance…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add to a Performance' });
    // Upcoming first, soonest first, then past ones.
    const offered = dialog
      .locator('label')
      .filter({ hasText: new RegExp(`${soon}|${later}|${already}|${past}`) });
    await expect(offered).toHaveText([
      new RegExp(soon),
      new RegExp(later),
      new RegExp(already),
      new RegExp(past),
    ]);
    await expect(dialog.getByRole('checkbox', { name: new RegExp(already) })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: new RegExp(already) })).toBeDisabled();
    await dialog.getByRole('checkbox', { name: new RegExp(soon) }).click();
    await dialog.getByRole('checkbox', { name: new RegExp(past) }).click();
    await dialog.getByRole('button', { name: 'Add' }).click();

    await expect(dialog).toBeHidden();
    const listed = page.getByRole('region', { name: 'In Performances' }).getByRole('link');
    await expect(listed).toHaveText([soon, already, past]);

    await openPieceOverview(page, soonId);
    await expect(page.getByRole('dialog', { name: soon }).getByRole('listitem')).toHaveText([
      new RegExp(`1.*${held}`),
      new RegExp(`2.*${title}`),
    ]);
  });

  test('does not offer Add to a Performance without update', async ({ page, context }) => {
    const title = `Not mine ${unique()}`;
    const piece = await newPiece(title);
    await signInAsSingerWith(context, ['append']);
    await openPiece(page, piece);

    await expect(page.getByRole('button', { name: `Actions for ${title}` })).toHaveCount(0);
  });

  test('lists the Performances a Piece is in on its page, each opening its Overview', async ({
    page,
    context,
  }) => {
    const title = `Listed ${unique()}`;
    const name = `Gala ${unique()}`;
    const piece = await newPiece(title);
    await newPerformance(name, [piece]);
    await signInAsApprovedSinger(context);
    await openPiece(page, piece);

    await page.getByRole('region', { name: 'In Performances' }).getByRole('link', { name }).click();

    await expect(page.getByRole('dialog', { name })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
});

const openPieceOverview = async (page: Page, id: string) => {
  await page.goto(`${new URL(page.url()).pathname}?overview=${id}`);
  await settle(page);
};

test.describe('the sidebar', () => {
  test('lists upcoming Performances first and past ones as archived', async ({ page, context }) => {
    const [past, upcoming] = [`Was ${unique()}`, `Will ${unique()}`];
    await newPerformance(past, [], '2020-01-01T18:00:00Z', '2020-01-01T20:00:00Z');
    await newPerformance(upcoming, [], '2030-01-01T18:00:00Z', '2030-01-01T20:00:00Z');
    await signInAsApprovedSinger(context);
    await page.goto('/repertoire');

    const navigation = await openNavigation(page);
    const links = navigation
      .getByRole('link')
      .filter({ hasText: new RegExp(`${past}|${upcoming}`) });
    await expect(links).toHaveText([new RegExp(upcoming), new RegExp(`${past}.*archived`)]);
    await expect(navigation.getByRole('button', { name: 'New Performance' })).toHaveCount(0);
  });
});

test.describe('the Choir Time Zone', () => {
  // Every test file shares the one setting, so only one project changes it, and puts it back.
  test.skip(({ page }) => !isDesktopLayout(page), 'one project changes the shared setting');

  test.afterEach(async () => {
    await serviceClient()
      .from('site_settings')
      .update({ choir_time_zone: 'UTC' })
      .not('choir_time_zone', 'is', null);
  });

  test('is set in Appearance by a Singer with manage-users, and Performance times follow it', async ({
    page,
    context,
  }) => {
    const name = `Sydney ${unique()}`;
    const id = await newPerformance(name, [], '2030-06-01T18:00:00Z', '2030-06-01T20:00:00Z');
    await signInAsSingerWith(context, ['manage-users']);
    await page.goto('/admin/appearance');
    await settle(page);

    await page.getByLabel('Choir Time Zone').selectOption('Australia/Sydney');
    const saved = page.waitForResponse(
      (response) => response.url().includes('?/timeZone') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save time zone' }).click();
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect(page.getByLabel('Choir Time Zone')).toHaveValue('Australia/Sydney');

    await openOverview(page, id);
    await expect(
      page.getByRole('dialog', { name }).getByText('Sun 2 Jun 2030, 04:00–06:00'),
    ).toBeVisible();
  });
});
