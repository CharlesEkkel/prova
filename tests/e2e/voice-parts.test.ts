import { expect, test, type Locator, type Page } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { serviceClient } from '../contract/support';
import {
  isDesktopLayout,
  openNavigation,
  signInAsApprovedSinger,
  signInAsSingerWith,
} from './support';

/** A name and the short label it suggests, such as "Mezzo 42" and "M42", unlikely to clash. */
const freshPart = () => {
  const number = randomInt(10, 100).toString();
  return { name: `Mezzo ${number}`, label: `M${number}` };
};

const removePartsNamed = async (names: readonly string[]): Promise<void> => {
  await serviceClient().from('voice_parts').delete().in('name', names);
};

const openVoiceParts = async (page: Page): Promise<void> => {
  await page.goto('/admin/voice-parts');
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

const rowOf = (page: Page, name: string) =>
  page.getByTestId('voice-part').filter({ hasText: name });

/** Adds a Voice Part through the dialog and waits for it to be listed. */
const addPart = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('button', { name: 'New Voice Part' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(name);
  await page.getByRole('dialog').getByRole('button', { name: 'Add Voice Part' }).click();
  await expect(rowOf(page, name)).toBeVisible();
};

/** The names of the listed Voice Parts, top to bottom. */
const orderOf = async (page: Page): Promise<readonly string[]> =>
  (await page.getByTestId('voice-part').locator('.font-medium').allTextContents()).map((text) =>
    text.trim(),
  );

/** Whether `first` is listed, and above `second`. */
/** Resolves once the new order has been sent to the server and answered. */
const orderSaved = (page: Page) =>
  page.waitForResponse(
    (response) => response.url().includes('?/reorder') && response.request().method() === 'POST',
  );

const isAbove = (names: readonly string[], first: string, second: string): boolean =>
  names.includes(first) && names.indexOf(first) < names.indexOf(second);

/**
 * Drags `handle` up to the top half of `target` with a real mouse. The library starts a drag a
 * moment after the button goes down and follows the pointer move by move, so this is paced.
 */
const dragTo = async (page: Page, handle: Locator, target: Locator): Promise<void> => {
  const from = await centreOf(handle);
  const to = await centreOf(target);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const steps = 15;
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(from.x, from.y + ((to.y - 15 - from.y) * step) / steps);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
};

const centreOf = async (target: Locator): Promise<{ readonly x: number; readonly y: number }> => {
  const box = await target.boundingBox();
  if (box === null) throw new Error('the element is not on screen');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test.describe('the Voice Parts tab', () => {
  test('refuses a Singer without manage-users', async ({ page, context }) => {
    await signInAsSingerWith(context, ['append', 'update', 'delete']);

    const response = await page.goto('/admin/voice-parts');

    expect(response?.status()).toBe(403);
  });

  test('lists the seeded parts, adds one with a suggested short label, and removes it', async ({
    page,
    context,
  }) => {
    const part = freshPart();
    try {
      await signInAsSingerWith(context, ['manage-users']);
      await openVoiceParts(page);
      for (const seeded of ['Soprano', 'Alto', 'Tenor', 'Bass']) {
        await expect(rowOf(page, seeded).first()).toBeVisible();
      }

      await page.getByRole('button', { name: 'New Voice Part' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Name').fill(part.name);
      await expect(dialog.getByLabel('Short label')).toHaveValue(part.label);
      await dialog.getByRole('button', { name: 'Add Voice Part' }).click();

      await expect(rowOf(page, part.name)).toContainText(part.label);
      await expect(rowOf(page, part.name)).toContainText('0 Singers');

      await page.getByRole('button', { name: `Actions for ${part.name}` }).click();
      await page.getByRole('menuitem', { name: /^Remove Voice Part/ }).click();
      await expect(page.getByRole('alertdialog')).toContainText(
        'No Singer has this as their default',
      );
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Remove Voice Part' })
        .click();

      await expect(rowOf(page, part.name)).toHaveCount(0);
    } finally {
      await removePartsNamed([part.name]);
    }
  });

  test('keeps a typed short label rather than following the name, and shows a clash in the dialog', async ({
    page,
    context,
  }) => {
    const part = freshPart();
    try {
      await signInAsSingerWith(context, ['manage-users']);
      await openVoiceParts(page);

      await page.getByRole('button', { name: 'New Voice Part' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Short label').fill('S');
      await dialog.getByLabel('Name').fill(part.name);
      await expect(dialog.getByLabel('Short label')).toHaveValue('S');
      await dialog.getByRole('button', { name: 'Add Voice Part' }).click();

      await expect(dialog.getByRole('alert')).toContainText('already has that short label');
      await expect(rowOf(page, part.name)).toHaveCount(0);

      await dialog.getByLabel('Short label').fill(part.label);
      await dialog.getByRole('button', { name: 'Add Voice Part' }).click();
      await expect(rowOf(page, part.name)).toBeVisible();
    } finally {
      await removePartsNamed([part.name]);
    }
  });

  test('edits a name and short label', async ({ page, context }) => {
    const part = freshPart();
    const renamed = `${part.name} Solo`;
    try {
      await signInAsSingerWith(context, ['manage-users']);
      await openVoiceParts(page);
      await addPart(page, part.name);

      await page.getByRole('button', { name: `Actions for ${part.name}` }).click();
      await page.getByRole('menuitem', { name: /^Edit Voice Part/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Name').fill(renamed);
      // Renaming leaves the short label as it was.
      await expect(dialog.getByLabel('Short label')).toHaveValue(part.label);
      await dialog.getByRole('button', { name: 'Save Voice Part' }).click();

      await expect(rowOf(page, renamed)).toContainText(part.label);
    } finally {
      await removePartsNamed([part.name, renamed]);
    }
  });

  // Reordering sends the whole list, and the database refuses a list made from an out-of-date page.
  // The phone and desktop projects also add and remove parts at the same time, so a run may need a retry.
  test.describe('reordering', () => {
    test.describe.configure({ retries: 2 });
    // Two reorders at once would each refuse the other's stale list, so only one project runs them.
    test.skip(({ page }) => !isDesktopLayout(page), 'one project reorders at a time');

    test('reorders by dragging a part by its four dots, and the order is kept', async ({
      page,
      context,
    }) => {
      const part = freshPart();
      try {
        await signInAsSingerWith(context, ['manage-users']);
        await openVoiceParts(page);
        await addPart(page, part.name);
        expect(isAbove(await orderOf(page), 'Bass', part.name)).toBe(true);

        const saved = orderSaved(page);
        await dragTo(
          page,
          page.getByLabel(`Drag to reorder ${part.name}`),
          rowOf(page, 'Bass').first(),
        );

        await expect.poll(async () => isAbove(await orderOf(page), part.name, 'Bass')).toBe(true);
        expect((await saved).ok()).toBe(true);
        await page.reload();
        await page.waitForLoadState('networkidle');
        expect(isAbove(await orderOf(page), part.name, 'Bass')).toBe(true);
        expect(isAbove(await orderOf(page), 'Tenor', 'Bass')).toBe(true);
      } finally {
        await removePartsNamed([part.name]);
      }
    });

    test('reorders from the keyboard too', async ({ page, context }) => {
      const part = freshPart();
      try {
        await signInAsSingerWith(context, ['manage-users']);
        await openVoiceParts(page);
        await addPart(page, part.name);
        const before = await orderOf(page);
        const above = before[before.indexOf(part.name) - 1] ?? '';
        expect(above).not.toBe('');

        const saved = orderSaved(page);
        await page.getByLabel(`Drag to reorder ${part.name}`).focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter');
        expect((await saved).ok()).toBe(true);

        await expect.poll(async () => isAbove(await orderOf(page), part.name, above)).toBe(true);
        await page.reload();
        await page.waitForLoadState('networkidle');
        expect(isAbove(await orderOf(page), part.name, above)).toBe(true);
      } finally {
        await removePartsNamed([part.name]);
      }
    });
  });

  test('says how many Singers a removal sends back to choose again', async ({ page, context }) => {
    const part = freshPart();
    try {
      const manager = await signInAsSingerWith(context, ['manage-users']);
      await openVoiceParts(page);
      await page.getByRole('button', { name: 'New Voice Part' }).click();
      await page.getByRole('dialog').getByLabel('Name').fill(part.name);
      await page.getByRole('dialog').getByRole('button', { name: 'Add Voice Part' }).click();
      await expect(rowOf(page, part.name)).toBeVisible();
      const added = await serviceClient().from('voice_parts').select('id').eq('name', part.name);
      const id = added.data?.[0]?.id ?? '';
      await manager.client.rpc('set_my_default_voice_part', { chosen: id });
      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(rowOf(page, part.name)).toContainText('1 Singer');
      await page.getByRole('button', { name: `Actions for ${part.name}` }).click();
      await page.getByRole('menuitem', { name: /^Remove Voice Part/ }).click();
      await expect(page.getByRole('alertdialog')).toContainText(
        '1 Singer has this as their default and will be asked to choose again',
      );
    } finally {
      await removePartsNamed([part.name]);
    }
  });
});

test.describe('changing the default Voice Part', () => {
  test('is an item in the user menu that opens the profile and returns to the page they were on', async ({
    page,
    context,
  }) => {
    const singer = await signInAsApprovedSinger(context);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await openNavigation(page);

    await page.getByRole('button', { name: /^User menu for/ }).click();
    await page.getByRole('menuitem', { name: 'Change default Voice Part' }).click();

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('radio', { name: /Alto/ })).toBeChecked();
    // The picker is built from the configured list, with each part's short label.
    await expect(page.getByRole('radio', { name: /Tenor/ })).toContainText('T');
    await page.waitForLoadState('networkidle');
    await page.getByRole('radio', { name: /Tenor/ }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page).toHaveURL('/');
    const saved = await singer.client.rpc('my_default_voice_part');
    expect(saved.data).toMatchObject({ name: 'Tenor' });
    await openNavigation(page);
    await expect(page.getByRole('button', { name: /^User menu for/ })).toContainText('Tenor');
  });
});
