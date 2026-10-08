import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  createRoleAs,
  makeAdmin,
  signInNewManager,
  serviceClient,
  signInNewSinger,
} from '../contract/support';
import { openNavigation, signInAsApprovedSinger, signInAsSingerWith } from './support';

test.describe('without manage-users', () => {
  test('a Singer sees no Admin link and the admin routes refuse them', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['append', 'update', 'delete']);

    await page.goto('/');
    const nav = await openNavigation(page);
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    for (const path of ['/admin', '/admin/roles', '/admin/voice-parts', '/admin/appearance']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(403);
    }
  });
});

test.describe('with manage-users', () => {
  test('sees the Admin link and all four tabs', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = await openNavigation(page);
    await nav.getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL('/admin');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^Roles/ }).click();
    await page.waitForURL('/admin/roles');
    await page.getByRole('link', { name: 'Voice Parts' }).click();
    await page.waitForURL('/admin/voice-parts');
    await page.getByRole('link', { name: 'Appearance' }).click();
    await page.waitForURL('/admin/appearance');
  });

  test('approves a Pending Singer with a Role picked from the list', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);
    const pending = await signInNewSinger({ metadata: { full_name: 'Pat Pending' } });

    await page.goto('/admin');
    // The Singers list can be long; interacting mid-hydration loses the click.
    await page.waitForLoadState('networkidle');
    const card = page.getByTestId('pending-singer').filter({ hasText: pending.email });
    await expect(card).toContainText('Pat Pending');
    await expect(card).toContainText('Direct');
    await card.getByRole('button', { name: 'Approve' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox', { name: /^Reader/ }).check();
    await dialog.getByRole('checkbox', { name: /^Contributor/ }).check();
    await dialog.getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByTestId('pending-singer').filter({ hasText: pending.email })).toHaveCount(
      0,
    );
    await expect(page.getByTestId('singer').filter({ hasText: pending.email })).toContainText(
      'Reader',
    );
    await expect(page.getByTestId('singer').filter({ hasText: pending.email })).toContainText(
      'Contributor',
    );
    expect((await pending.client.rpc('my_permissions')).data).toEqual(['read', 'append']);
  });

  test('shows a Role without read on the Pending row, and the Role picker keeps it ticked', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['manage-users']);
    const pending = await signInNewSinger();
    const roleName = `Append only ${randomUUID()}`;
    const roleId = await createRoleAs(await signInNewManager(), roleName, ['append']);
    await serviceClient().from('singer_roles').insert({ singer_id: pending.id, role_id: roleId });

    await page.goto('/admin');
    // The Singers list can be long; interacting mid-hydration loses the click.
    await page.waitForLoadState('networkidle');
    const card = page.getByTestId('pending-singer').filter({ hasText: pending.email });

    await expect(card.getByRole('list', { name: 'Roles' })).toContainText(roleName);
    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByRole('dialog').getByRole('checkbox', { name: roleName })).toBeChecked();
  });

  test('a Role that includes manage-users is shown but disabled, with the reason', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['manage-users']);
    await signInNewSinger();

    await page.goto('/admin');
    // The Singers list can be long; interacting mid-hydration loses the click.
    await page.waitForLoadState('networkidle');
    await page
      .getByTestId('pending-singer')
      .first()
      .getByRole('button', { name: 'Approve' })
      .click();
    const dialog = page.getByRole('dialog');

    await expect(dialog.getByRole('checkbox', { name: /^Admin/ })).toBeDisabled();
    await expect(dialog).toContainText('Only an Owner can grant or change anything that includes');
    await expect(dialog.getByRole('checkbox', { name: /^Owner/ })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto('/admin/roles');
    await page.getByRole('button', { name: 'New Role' }).click();
    await expect(page.getByRole('checkbox', { name: /^Manage users/ })).toBeDisabled();
  });

  test('declines a Pending Singer after confirming', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);
    const pending = await signInNewSinger();

    await page.goto('/admin');
    // The Singers list can be long; interacting mid-hydration loses the click.
    await page.waitForLoadState('networkidle');
    const card = page.getByTestId('pending-singer').filter({ hasText: pending.email });
    await card.getByRole('button', { name: 'Decline' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Decline' }).click();

    await expect(card).toHaveCount(0);
    expect((await serviceClient().from('singers').select('id').eq('id', pending.id)).data).toEqual(
      [],
    );
  });

  test('builds a Role, warns when it lacks read, and deletes it after a warning', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['manage-users']);
    const name = `Chorus ${Date.now().toString()}`;

    await page.goto('/admin/roles');
    await page.getByRole('button', { name: 'New Role' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Create Role' })).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
    await dialog.getByRole('checkbox', { name: /^Append/ }).check();
    await expect(dialog).toContainText('Singers with only this Role stay Pending');
    await expect(dialog.getByRole('checkbox', { name: /^Manage admins/ })).toHaveCount(0);
    await expect(dialog.getByRole('checkbox', { name: /^Manage users/ })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Create Role' }).click();

    const role = page.getByTestId('role').filter({ hasText: name });
    await expect(role).toContainText('Append');
    await role.getByRole('button', { name: /^Actions for/ }).click();
    await page.getByRole('menuitem', { name: /^Delete Role/ }).click();
    await expect(page.getByRole('alertdialog')).toContainText('0 Singers will lose this Role');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete Role' }).click();
    await expect(role).toHaveCount(0);
  });

  test('shows Admin and Owner as built in and locked', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);

    await page.goto('/admin/roles');

    for (const name of ['Admin', 'Owner']) {
      // "Manage admins" also contains "admin", so match the name at the start of the card.
      const role = page
        .getByTestId('role')
        .filter({ hasText: new RegExp(`^\\s*${name}\\s*Built in`) });
      await expect(role).toHaveCount(1);
      await expect(role.getByRole('button')).toHaveCount(0);
    }
  });

  test('a Singer who holds manage-users cannot be changed without manage-admins', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['manage-users']);
    const other = await signInNewSinger();
    await makeAdmin(other);

    await page.goto('/admin');
    // The Singers list can be long; interacting mid-hydration loses the click.
    await page.waitForLoadState('networkidle');
    const card = page.getByTestId('singer').filter({ hasText: other.email });

    await card.getByRole('button', { name: /^Actions for/ }).click();
    await expect(page.getByRole('menuitem', { name: /^Remove from the choir/ })).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: /^Edit Roles/ })).toBeDisabled();
  });
});

test('an approved Singer with only read cannot reach the admin portal', async ({
  page,
  context,
}) => {
  await signInAsApprovedSinger(context);

  const response = await page.goto('/admin');

  expect(response?.status()).toBe(403);
});
