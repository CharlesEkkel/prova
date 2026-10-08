// Backend contract seam: Roles and the admin portal's operations, enforced in the database.
import { randomUUID } from 'node:crypto';
import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  adminRoleId,
  createRoleAs,
  grantRole,
  ownerRoleId,
  roleIdNamed,
  rolesHeldBy,
  serviceClient,
  signInNewAdmin,
  signInNewManager,
  signInNewOwner,
  signInNewSinger,
  type TestSinger,
} from './support';

const rowsOf = Schema.decodeUnknownSync(Schema.Array(Schema.Record(Schema.String, Schema.Unknown)));

const roleName = () => `Role ${randomUUID()}`;

describe('the seeded Roles', () => {
  it('has Editor, Contributor and Reader beside the built-in Admin and Owner', async () => {
    const { data } = await serviceClient()
      .from('roles')
      .select('name, is_builtin, role_permissions(permission)');
    const byName = Object.fromEntries(
      (data ?? []).map((role) => [
        role.name,
        {
          builtin: role.is_builtin,
          permissions: role.role_permissions.map((p) => p.permission).toSorted(),
        },
      ]),
    );

    expect(byName['Editor']).toEqual({ builtin: false, permissions: ['append', 'read', 'update'] });
    expect(byName['Contributor']).toEqual({ builtin: false, permissions: ['append', 'read'] });
    expect(byName['Reader']).toEqual({ builtin: false, permissions: ['read'] });
    expect(byName['Admin']).toEqual({
      builtin: true,
      permissions: ['append', 'delete', 'manage-users', 'read', 'update'],
    });
    expect(byName['Owner']?.permissions).toHaveLength(6);
  });
});

describe('manage-admins', () => {
  it('cannot be put in a Role, even by an Owner', async () => {
    const owner = await signInNewOwner();

    const { error } = await owner.client.rpc('admin_create_role', {
      role_name: roleName(),
      perms: ['read', 'manage-admins'],
    });

    expect(error).not.toBeNull();
  });

  it('cannot be inserted into a custom Role by any other route either', async () => {
    const role = await serviceClient()
      .from('roles')
      .insert({ name: roleName() })
      .select('id')
      .single();
    if (role.error) throw role.error;

    const { error } = await serviceClient()
      .from('role_permissions')
      .insert({ role_id: role.data.id, permission: 'manage-admins' });

    expect(error).not.toBeNull();
  });

  it('is not granted by being given the Owner Role', async () => {
    const singer = await signInNewSinger();

    const { error } = await serviceClient()
      .from('singer_roles')
      .insert({ singer_id: singer.id, role_id: await ownerRoleId() });

    expect(error).not.toBeNull();
  });
});

describe('a Singer without manage-admins', () => {
  it('cannot create a Role that includes manage-users', async () => {
    const admin = await signInNewAdmin();

    const { error } = await admin.client.rpc('admin_create_role', {
      role_name: roleName(),
      perms: ['read', 'manage-users'],
    });

    expect(error?.code).toBe('42501');
  });

  it('cannot edit a Role into, or out of, including manage-users', async () => {
    const admin = await signInNewAdmin();
    const owner = await signInNewOwner();
    const plain = await createRoleAs(owner, roleName(), ['read']);
    const powerful = await createRoleAs(owner, roleName(), ['read', 'manage-users']);

    const into = await admin.client.rpc('admin_update_role', {
      target: plain,
      role_name: roleName(),
      perms: ['read', 'manage-users'],
    });
    const outOf = await admin.client.rpc('admin_update_role', {
      target: powerful,
      role_name: roleName(),
      perms: ['read'],
    });
    const remove = await admin.client.rpc('admin_delete_role', { target: powerful });

    expect([into.error?.code, outOf.error?.code, remove.error?.code]).toEqual([
      '42501',
      '42501',
      '42501',
    ]);
  });

  it('cannot assign a Role that includes manage-users, including Admin', async () => {
    const admin = await signInNewAdmin();
    const target = await signInNewSinger();

    const { error } = await admin.client.rpc('admin_set_singer_roles', {
      target: target.id,
      role_ids: [await adminRoleId()],
    });

    expect(error?.code).toBe('42501');
    expect(await rolesHeldBy(target)).toEqual([]);
  });

  it('cannot remove a Role that includes manage-users from a Singer', async () => {
    const admin = await signInNewAdmin();
    const other = await signInNewAdmin();

    const { error } = await admin.client.rpc('admin_set_singer_roles', {
      target: other.id,
      role_ids: [],
    });

    expect(error?.code).toBe('42501');
    expect(await rolesHeldBy(other)).toEqual([await adminRoleId()]);
  });

  it('cannot remove, or change the Roles of, a Singer who holds manage-users', async () => {
    const manager = await signInNewManager();
    const holder = await signInNewAdmin();
    const readerId = await roleIdNamed('Reader');

    const change = await manager.client.rpc('admin_set_singer_roles', {
      target: holder.id,
      role_ids: [readerId],
    });
    const remove = await manager.client.rpc('admin_remove_singer', { target: holder.id });

    expect([change.error?.code, remove.error?.code]).toEqual(['42501', '42501']);
    expect(
      (await serviceClient().from('singers').select('id').eq('id', holder.id)).data,
    ).toHaveLength(1);
  });

  it('can still do everything else: assign other Roles, build Roles, remove ordinary Singers', async () => {
    const admin = await signInNewAdmin();
    const target = await signInNewSinger();
    const readerId = await roleIdNamed('Reader');

    const assign = await admin.client.rpc('admin_set_singer_roles', {
      target: target.id,
      role_ids: [readerId],
    });
    const create = await admin.client.rpc('admin_create_role', {
      role_name: roleName(),
      perms: ['read', 'append', 'update', 'delete'],
    });
    const remove = await admin.client.rpc('admin_remove_singer', { target: target.id });

    expect([assign.error, create.error, remove.error]).toEqual([null, null, null]);
  });
});

describe('an Owner managing Admins', () => {
  it('can grant and take away Admin, and create Roles that include manage-users', async () => {
    const owner = await signInNewOwner();
    const target = await signInNewSinger();

    const grant = await owner.client.rpc('admin_set_singer_roles', {
      target: target.id,
      role_ids: [await adminRoleId()],
    });
    const create = await owner.client.rpc('admin_create_role', {
      role_name: roleName(),
      perms: ['manage-users', 'read'],
    });
    const rolesWhileAdmin = await rolesHeldBy(target);
    const revoke = await owner.client.rpc('admin_set_singer_roles', {
      target: target.id,
      role_ids: [],
    });

    expect([grant.error, create.error, revoke.error]).toEqual([null, null, null]);
    expect(rolesWhileAdmin).toEqual([await adminRoleId()]);
    expect(await rolesHeldBy(target)).toEqual([]);
  });

  it('can remove an Admin', async () => {
    const owner = await signInNewOwner();
    const admin = await signInNewAdmin();

    const { error } = await owner.client.rpc('admin_remove_singer', { target: admin.id });

    expect(error).toBeNull();
  });
});

describe('an Owner in the app', () => {
  it('cannot be removed, or have their Roles changed, even by another Owner', async () => {
    const actor = await signInNewOwner();
    const owner = await signInNewOwner();

    const remove = await actor.client.rpc('admin_remove_singer', { target: owner.id });
    const change = await actor.client.rpc('admin_set_singer_roles', {
      target: owner.id,
      role_ids: [],
    });

    expect([remove.error?.code, change.error?.code]).toEqual(['42501', '42501']);
    expect(await rolesHeldBy(owner)).toEqual([await adminRoleId()]);
  });
});

describe('a Role', () => {
  it('needs a name that is trimmed, and at least one Permission', async () => {
    const manager = await signInNewManager();

    const blank = await manager.client.rpc('admin_create_role', {
      role_name: '   ',
      perms: ['read'],
    });
    const empty = await manager.client.rpc('admin_create_role', {
      role_name: roleName(),
      perms: [],
    });
    const name = roleName();
    const padded = await manager.client.rpc('admin_create_role', {
      role_name: `  ${name}  `,
      perms: ['read'],
    });

    expect([blank.error?.code, empty.error?.code, padded.error]).toEqual(['22023', '22023', null]);
    // Stored trimmed: looking it up by the trimmed name finds it.
    expect(await roleIdNamed(name)).toBeTruthy();
  });

  it('has a name unique ignoring case, with Admin and Owner reserved', async () => {
    const manager = await signInNewManager();
    const name = roleName();
    await manager.client.rpc('admin_create_role', { role_name: name, perms: ['read'] });

    const again = await manager.client.rpc('admin_create_role', {
      role_name: name.toUpperCase(),
      perms: ['read'],
    });
    const admin = await manager.client.rpc('admin_create_role', {
      role_name: ' admin ',
      perms: ['read'],
    });
    const owner = await manager.client.rpc('admin_create_role', {
      role_name: 'OWNER',
      perms: ['read'],
    });

    expect([again.error?.code, admin.error?.code, owner.error?.code]).toEqual([
      '23505',
      '23505',
      '23505',
    ]);
  });

  it('can be renamed and have its Permissions changed, keeping a unique name', async () => {
    const manager = await signInNewManager();
    const target = await createRoleAs(manager, roleName(), ['read']);
    const name = roleName();

    const update = await manager.client.rpc('admin_update_role', {
      target,
      role_name: name,
      perms: ['read', 'append'],
    });
    const clash = await manager.client.rpc('admin_update_role', {
      target,
      role_name: 'reader',
      perms: ['read'],
    });
    const sameName = await manager.client.rpc('admin_update_role', {
      target,
      role_name: name.toLowerCase(),
      perms: ['read'],
    });

    expect([update.error, clash.error?.code, sameName.error]).toEqual([null, '23505', null]);
  });

  it('cannot be built-in Admin or Owner edited or deleted', async () => {
    const owner = await signInNewOwner();

    const results = await Promise.all(
      [await adminRoleId(), await ownerRoleId()].flatMap((target) => [
        owner.client.rpc('admin_update_role', { target, role_name: roleName(), perms: ['read'] }),
        owner.client.rpc('admin_delete_role', { target }),
      ]),
    );

    expect(results.map(({ error }) => error?.code)).toEqual(['22023', '22023', '22023', '22023']);
  });

  it('when deleted, is taken from every Singer who held it', async () => {
    const manager = await signInNewManager();
    const holders = await Promise.all([signInNewSinger(), signInNewSinger()]);
    const roleId = await createRoleAs(manager, roleName(), ['read']);
    await Promise.all(
      holders.map((holder) =>
        manager.client.rpc('admin_set_singer_roles', { target: holder.id, role_ids: [roleId] }),
      ),
    );

    const { error } = await manager.client.rpc('admin_delete_role', { target: roleId });

    expect(error).toBeNull();
    expect(await Promise.all(holders.map(rolesHeldBy))).toEqual([[], []]);
    expect((await holders[0].client.rpc('my_permissions')).data).toEqual([]);
  });
});

describe('a Singer with manage-users', () => {
  it('lists Pending Singers with name, email, Voice Part and how they signed up', async () => {
    const manager = await signInNewManager();
    const pending = await signInNewSinger({ metadata: { full_name: 'Pat Pending' } });
    const alto =
      (await serviceClient().from('voice_parts').select('id').eq('name', 'Alto')).data?.[0]?.id ??
      '';
    await pending.client.rpc('set_my_default_voice_part', { chosen: alto });

    const { data, error } = await manager.client.rpc('admin_singers');

    expect(error).toBeNull();
    const listed = rowsOf(data).find((s) => s['id'] === pending.id);
    expect(listed).toMatchObject({
      display_name: 'Pat Pending',
      email: pending.email,
      voice_part: 'Alto',
      signed_up_via: 'Direct',
      permissions: [],
      roles: [],
      is_owner: false,
    });
  });

  it('approves a Pending Singer by assigning a Role, who then holds its Permissions', async () => {
    const manager = await signInNewManager();
    const pending = await signInNewSinger();
    const editorId = await roleIdNamed('Editor');

    const { error } = await manager.client.rpc('admin_set_singer_roles', {
      target: pending.id,
      role_ids: [editorId],
    });

    expect(error).toBeNull();
    expect((await pending.client.rpc('my_permissions')).data?.toSorted()).toEqual([
      'append',
      'read',
      'update',
    ]);
  });

  it('lists the Roles with their Permissions and how many Singers hold each', async () => {
    const manager = await signInNewManager();
    const roleId = await createRoleAs(manager, roleName(), ['read', 'delete']);
    await manager.client.rpc('admin_set_singer_roles', {
      target: (await signInNewSinger()).id,
      role_ids: [roleId],
    });

    const { data, error } = await manager.client.rpc('admin_roles');

    expect(error).toBeNull();
    const roles = rowsOf(data);
    expect(roles.find((r) => r['id'] === roleId)).toMatchObject({
      is_builtin: false,
      permissions: ['read', 'delete'],
      singer_count: 1,
    });
    expect(roles.filter((r) => r['is_builtin'] === true).map((r) => r['name'])).toEqual([
      'Owner',
      'Admin',
    ]);
  });

  it('removes a Singer and their sign-in, who then starts fresh if they sign in again', async () => {
    const manager = await signInNewManager();
    const leaver = await signInNewSinger();
    await grantRole(leaver, ['read']);

    const { error } = await manager.client.rpc('admin_remove_singer', { target: leaver.id });

    expect(error).toBeNull();
    expect((await serviceClient().from('singers').select('id').eq('id', leaver.id)).data).toEqual(
      [],
    );
    expect((await serviceClient().auth.admin.getUserById(leaver.id)).data.user).toBeNull();
  });

  it('is refused for a Role or Singer that does not exist', async () => {
    const manager = await signInNewManager();
    const nobody = randomUUID();

    const results = await Promise.all([
      manager.client.rpc('admin_set_singer_roles', { target: nobody, role_ids: [] }),
      manager.client.rpc('admin_remove_singer', { target: nobody }),
      manager.client.rpc('admin_delete_role', { target: nobody }),
      manager.client.rpc('admin_update_role', {
        target: nobody,
        role_name: roleName(),
        perms: ['read'],
      }),
      manager.client.rpc('admin_set_singer_roles', { target: manager.id, role_ids: [nobody] }),
    ]);

    expect(results.map(({ error }) => error !== null)).toEqual([true, true, true, true, true]);
  });
});

describe('a Singer without manage-users', () => {
  const everyOperation = (client: TestSinger['client'], target: string) =>
    [
      ['admin_singers', client.rpc('admin_singers')],
      ['admin_roles', client.rpc('admin_roles')],
      [
        'admin_create_role',
        client.rpc('admin_create_role', { role_name: roleName(), perms: ['read'] }),
      ],
      [
        'admin_update_role',
        client.rpc('admin_update_role', { target, role_name: roleName(), perms: ['read'] }),
      ],
      ['admin_delete_role', client.rpc('admin_delete_role', { target })],
      ['admin_set_singer_roles', client.rpc('admin_set_singer_roles', { target, role_ids: [] })],
      ['admin_remove_singer', client.rpc('admin_remove_singer', { target })],
    ] as const;

  it.each([
    ['a Pending Singer', [] as const],
    ['a Singer with every other Permission', ['read', 'append', 'update', 'delete'] as const],
  ])('is refused every admin operation: %s', async (_label, permissions) => {
    const singer = await signInNewSinger();
    if (permissions.length > 0) await grantRole(singer, permissions);
    const bystander = await signInNewSinger();
    const readerId = await roleIdNamed('Reader');

    const verdicts = await Promise.all(
      everyOperation(singer.client, readerId).map(async ([name, call]) => [
        name,
        (await call).error?.code,
      ]),
    );

    expect(verdicts.map(([, code]) => code)).toEqual(Array(7).fill('42501'));
    expect(
      (await serviceClient().from('singers').select('id').eq('id', bystander.id)).data,
    ).toHaveLength(1);
    expect(await roleIdNamed('Reader')).toBe(readerId);
  });

  it('cannot approve themselves', async () => {
    const singer = await signInNewSinger();
    const readerId = await roleIdNamed('Reader');

    const { error } = await singer.client.rpc('admin_set_singer_roles', {
      target: singer.id,
      role_ids: [readerId],
    });

    expect(error?.code).toBe('42501');
    expect(await rolesHeldBy(singer)).toEqual([]);
  });
});
