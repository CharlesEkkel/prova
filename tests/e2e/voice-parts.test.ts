import { expect, test } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { serviceClient } from '../contract/support';
import { openNavigation, signInAsApprovedSinger, signInAsSingerWith } from './support';

/** A name and the short label it suggests, such as "Mezzo 42" and "M42", unlikely to clash. */
const freshPart = () => {
  const number = randomInt(10, 100).toString();
  return { name: `Mezzo ${number}`, label: `M${number}` };
};

const removePartsNamed = async (names: readonly string[]): Promise<void> => {
  await serviceClient().from('voice_parts').delete().in('name', names);
};

const openVoiceParts = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/admin/voice-parts');
  // Interacting before the page has hydrated loses the click.
  await page.waitForLoadState('networkidle');
};

const rowOf = (page: import('@playwright/test').Page, name: string) =>
  page.getByTestId('voice-part').filter({ hasText: name });

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

  test('edits a name and short label, and moves a part up', async ({ page, context }) => {
    const part = freshPart();
    const renamed = `${part.name} Solo`;
    try {
      await signInAsSingerWith(context, ['manage-users']);
      await openVoiceParts(page);
      await page.getByRole('button', { name: 'New Voice Part' }).click();
      await page.getByRole('dialog').getByLabel('Name').fill(part.name);
      await page.getByRole('dialog').getByRole('button', { name: 'Add Voice Part' }).click();
      await expect(rowOf(page, part.name)).toBeVisible();

      await page.getByRole('button', { name: `Actions for ${part.name}` }).click();
      await page.getByRole('menuitem', { name: /^Edit Voice Part/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Name').fill(renamed);
      // Renaming leaves the short label as it was.
      await expect(dialog.getByLabel('Short label')).toHaveValue(part.label);
      await dialog.getByRole('button', { name: 'Save Voice Part' }).click();
      await expect(rowOf(page, renamed)).toContainText(part.label);

      await page.getByRole('button', { name: `Move ${renamed} up` }).click();

      const names = page.getByTestId('voice-part');
      await expect(names.nth(-2)).toContainText(renamed);
    } finally {
      await removePartsNamed([part.name, renamed]);
    }
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
