import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  createRoleAs,
  makeAdmin,
  signInNewManager,
  serviceClient,
  signInNewSinger,
} from '../contract/support';
import { signInAsApprovedSinger, signInAsSingerWith } from './support';

test.describe('without manage-users', () => {
  test('a Singer sees no Admin link and the admin routes refuse them', async ({
    page,
    context,
  }) => {
    await signInAsSingerWith(context, ['append', 'update', 'delete']);

    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    for (const path of ['/admin', '/admin/roles']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(403);
    }
  });
});

test.describe('with manage-users', () => {
  test('sees the Admin link and both tabs', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);

    await page.goto('/');
    await page.getByRole('link', { name: 'Admin' }).click();

    await expect(page).toHaveURL('/admin');
    // The Singers list can be long; clicking mid-hydration loses the click.
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Roles' }).click();
    await page.waitForURL('/admin/roles');
    await expect(page.getByRole('link', { name: 'Appearance' })).toHaveCount(0);
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
    await card.getByRole('checkbox', { name: 'Reader' }).check();
    await card.getByRole('checkbox', { name: 'Contributor' }).check();
    await card.getByRole('button', { name: 'Approve' }).click();

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
    await expect(card.getByRole('checkbox', { name: roleName })).toBeChecked();
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
    const card = page.getByTestId('pending-singer').first();

    await expect(card.getByRole('checkbox', { name: /^Admin/ })).toBeDisabled();
    await expect(card).toContainText('Only an Owner can grant or change anything that includes');
    await expect(card.getByRole('checkbox', { name: /^Owner/ })).toHaveCount(0);

    await page.goto('/admin/roles');
    await page.getByRole('button', { name: 'New Role' }).click();
    await expect(page.getByRole('checkbox', { name: /^manage-users/ })).toBeDisabled();
  });

  test('declines a Pending Singer after confirming', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);
    const pending = await signInNewSinger();

    await page.goto('/admin');
    // The Singers list can be long; interacting mid-hydration loses the click.
    await page.waitForLoadState('networkidle');
    const card = page.getByTestId('pending-singer').filter({ hasText: pending.email });
    await card.getByRole('button', { name: 'Decline' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Decline' }).click();

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
    await expect(dialog.getByRole('button', { name: 'Save Role' })).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
    await dialog.getByRole('checkbox', { name: /^append/ }).check();
    await expect(dialog).toContainText('Singers with only this Role stay Pending');
    await expect(dialog.getByRole('checkbox', { name: /^manage-admins/ })).toHaveCount(0);
    await expect(dialog.getByRole('checkbox', { name: /^manage-users/ })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Save Role' }).click();

    const role = page.getByTestId('role').filter({ hasText: name });
    await expect(role).toContainText('append');
    await role.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).toContainText('0 Singers will lose this Role');
    await page.getByRole('dialog').getByRole('button', { name: 'Delete Role' }).click();
    await expect(role).toHaveCount(0);
  });

  test('shows Admin and Owner as built in and locked', async ({ page, context }) => {
    await signInAsSingerWith(context, ['manage-users']);

    await page.goto('/admin/roles');

    for (const name of ['Admin', 'Owner']) {
      const role = page.getByTestId('role').filter({ hasText: `${name} (built in, locked)` });
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

    await expect(card.getByRole('button', { name: 'Remove' })).toBeDisabled();
    await expect(card.getByRole('button', { name: 'Edit Roles' })).toBeDisabled();
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
