// Backend contract seam: who may edit the Voice Part list, and what the list's rules refuse.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  grantRole,
  serviceClient,
  signInNewManager,
  signInNewSinger,
  type TestSinger,
} from './support';

/** Every Voice Part a test adds, so the shared list is left as the seed left it. */
const created: string[] = [];

afterAll(async () => {
  await serviceClient().from('voice_parts').delete().in('id', created);
});

const unique = (): string => randomUUID().slice(0, 8);
/** Three characters from a uuid: letters a-f and digits, so never "all" and never a seeded label. */
const freshLabel = (): string => randomUUID().slice(0, 3);

const addAs = async (singer: Pick<TestSinger, 'client'>, name: string, label: string) => {
  const reply = await singer.client.rpc('admin_add_voice_part', {
    part_name: name,
    part_label: label,
  });
  if (reply.data !== null) created.push(reply.data);
  return reply;
};

const stored = async (id: string) => {
  const { data } = await serviceClient()
    .from('voice_parts')
    .select('name, short_label, position')
    .eq('id', id)
    .maybeSingle();
  return data;
};

describe('adding a Voice Part', () => {
  it('lets a Singer with manage-users add one at the end of the list', async () => {
    const manager = await signInNewManager();
    const name = `Descant ${unique()}`;
    const label = freshLabel();

    const { data: id, error } = await addAs(manager, name, label);

    expect(error).toBeNull();
    const last = await serviceClient()
      .from('voice_parts')
      .select('id')
      .order('position', { ascending: false })
      .limit(1)
      .single();
    expect(id).toBe(last.data?.id);
    expect(await stored(id ?? '')).toMatchObject({ name, short_label: label });
  });

  it.each([
    ['read, append, update and delete', ['read', 'append', 'update', 'delete'] as const],
    ['nothing at all (a Pending Singer)', [] as const],
  ])('refuses a Singer holding %s', async (_held, permissions) => {
    const singer = await signInNewSinger();
    if (permissions.length > 0) await grantRole(singer, permissions);
    const name = `Refused ${unique()}`;

    const { error } = await addAs(singer, name, freshLabel());

    expect(error?.code).toBe('42501');
    const found = await serviceClient().from('voice_parts').select('id').eq('name', name);
    expect(found.data).toEqual([]);
  });

  it('refuses someone who has not signed in', async () => {
    const { error } = await anonClient().rpc('admin_add_voice_part', {
      part_name: `Anon ${unique()}`,
      part_label: freshLabel(),
    });

    expect(error).not.toBeNull();
  });
});

const countParts = async (): Promise<number> => {
  const { count } = await serviceClient()
    .from('voice_parts')
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
};

describe('the rules for a Voice Part’s name and short label', () => {
  it('trims both before saving them', async () => {
    const manager = await signInNewManager();
    const name = `Trimmed ${unique()}`;
    const label = freshLabel();

    const { data: id } = await addAs(manager, `  ${name} `, ` ${label}  `);

    expect(await stored(id ?? '')).toMatchObject({ name, short_label: label });
  });

  it('refuses a name already taken, ignoring case', async () => {
    const manager = await signInNewManager();
    const name = `Taken ${unique()}`;
    await addAs(manager, name, freshLabel());

    const { error } = await addAs(manager, name.toUpperCase(), freshLabel());

    expect(error).toMatchObject({ code: '23505', hint: 'name-taken' });
  });

  it('refuses a short label already taken, ignoring case', async () => {
    const manager = await signInNewManager();

    const { error } = await addAs(manager, `Baritone ${unique()}`, 'b');

    expect(error).toMatchObject({ code: '23505', hint: 'label-taken' });
  });

  it.each(['All', 'all', 'ALL', ' aLl '])(
    'keeps %j for the Combined Track, as a label',
    async (label) => {
      const manager = await signInNewManager();

      const { error } = await addAs(manager, `Everyone ${unique()}`, label);

      expect(error).toMatchObject({ code: '22023', hint: 'reserved' });
    },
  );

  it('keeps All for the Combined Track, as a name', async () => {
    const manager = await signInNewManager();

    const { error } = await addAs(manager, 'all', freshLabel());

    expect(error).toMatchObject({ code: '22023', hint: 'reserved' });
  });

  it.each(['', '   ', 'ABCD', 'A 1', 'A-1', 'É'])('refuses the short label %j', async (label) => {
    const manager = await signInNewManager();

    const { error } = await addAs(manager, `Odd label ${unique()}`, label);

    expect(error).toMatchObject({ code: '22023', hint: 'invalid' });
  });

  it.each(['', '   ', 'x'.repeat(41)])('refuses the name %j', async (name) => {
    const manager = await signInNewManager();

    const { error } = await addAs(manager, name, freshLabel());

    expect(error).toMatchObject({ code: '22023', hint: 'invalid' });
  });

  it('accepts a name of exactly 40 characters and a three-character numbered label', async () => {
    const manager = await signInNewManager();
    const before = await countParts();

    const { error } = await addAs(manager, 'x'.repeat(30) + unique().padEnd(10, 'y'), 'T12');

    expect(error).toBeNull();
    expect(await countParts()).toBe(before + 1);
  });
});

const addPart = async (manager: TestSinger, name = `Part ${unique()}`): Promise<string> => {
  const { data, error } = await addAs(manager, name, freshLabel());
  if (error !== null) throw new Error('could not add a Voice Part');
  return data;
};

describe('editing a Voice Part', () => {
  it('changes its name and short label, and keeps its place in the list', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);
    const before = await stored(id);
    const name = `Renamed ${unique()}`;
    const label = freshLabel();

    const { error } = await manager.client.rpc('admin_update_voice_part', {
      target: id,
      part_name: name,
      part_label: label,
    });

    expect(error).toBeNull();
    expect(await stored(id)).toEqual({ name, short_label: label, position: before?.position });
  });

  it('allows a Voice Part to keep its own name and label while changing the other', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);
    const before = await stored(id);

    const { error } = await manager.client.rpc('admin_update_voice_part', {
      target: id,
      part_name: before?.name ?? '',
      part_label: freshLabel(),
    });

    expect(error).toBeNull();
  });

  it('applies the same rules as adding: a label another part holds is refused', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);

    const { error } = await manager.client.rpc('admin_update_voice_part', {
      target: id,
      part_name: `Fine ${unique()}`,
      part_label: 'a',
    });

    expect(error).toMatchObject({ code: '23505', hint: 'label-taken' });
  });

  it('refuses a Voice Part that does not exist', async () => {
    const manager = await signInNewManager();

    const { error } = await manager.client.rpc('admin_update_voice_part', {
      target: randomUUID(),
      part_name: `Ghost ${unique()}`,
      part_label: freshLabel(),
    });

    expect(error?.code).toBe('P0002');
  });

  it('is refused to a Singer without manage-users', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);
    const singer = await signInNewSinger();
    await grantRole(singer, ['read', 'update']);
    const before = await stored(id);

    const { error } = await singer.client.rpc('admin_update_voice_part', {
      target: id,
      part_name: `Hijack ${unique()}`,
      part_label: freshLabel(),
    });

    expect(error?.code).toBe('42501');
    expect(await stored(id)).toEqual(before);
  });
});

const positionOf = async (id: string): Promise<number> => (await stored(id))?.position ?? -1;

describe('moving a Voice Part', () => {
  it('moves it up and down past its neighbour, and every picker follows', async () => {
    const manager = await signInNewManager();
    const first = await addPart(manager);
    const second = await addPart(manager);
    expect(await positionOf(first)).toBeLessThan(await positionOf(second));

    const up = await manager.client.rpc('admin_move_voice_part', {
      target: second,
      direction: 'up',
    });
    expect(up.error).toBeNull();
    expect(await positionOf(second)).toBeLessThan(await positionOf(first));
    const listed = await manager.client.from('voice_parts').select('id').order('position');
    const ids = (listed.data ?? []).map(({ id }) => id);
    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first));

    const down = await manager.client.rpc('admin_move_voice_part', {
      target: second,
      direction: 'down',
    });
    expect(down.error).toBeNull();
    expect(await positionOf(first)).toBeLessThan(await positionOf(second));
  });

  it('leaves the seeded parts in their order when a new part moves up', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);

    await manager.client.rpc('admin_move_voice_part', { target: id, direction: 'up' });

    const names = await serviceClient().from('voice_parts').select('name').order('position');
    const seededInOrder = (names.data ?? [])
      .map(({ name }) => name)
      .filter((name) => ['Soprano', 'Alto', 'Tenor', 'Bass'].includes(name));
    expect(seededInOrder).toEqual(['Soprano', 'Alto', 'Tenor', 'Bass']);
  });

  it('refuses a direction that is not up or down, an unknown part, and a Singer without manage-users', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);
    const singer = await signInNewSinger();
    await grantRole(singer, ['read', 'update']);
    const before = await positionOf(id);

    const sideways = await manager.client.rpc('admin_move_voice_part', {
      target: id,
      direction: 'sideways',
    });
    const ghost = await manager.client.rpc('admin_move_voice_part', {
      target: randomUUID(),
      direction: 'up',
    });
    const refused = await singer.client.rpc('admin_move_voice_part', {
      target: id,
      direction: 'up',
    });

    expect(sideways.error?.code).toBe('22023');
    expect(ghost.error?.code).toBe('P0002');
    expect(refused.error?.code).toBe('42501');
    expect(await positionOf(id)).toBe(before);
  });
});

const chooseVoicePart = async (singer: TestSinger, id: string): Promise<void> => {
  const { error } = await singer.client.rpc('set_my_default_voice_part', { chosen: id });
  if (error !== null) throw new Error('could not choose a Voice Part');
};

describe('the Voice Part list as the admin portal reads it', () => {
  it('gives each part with how many Singers have it as their default', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager, `Counted ${unique()}`);
    await chooseVoicePart(await signInNewSinger(), id);
    await chooseVoicePart(await signInNewSinger(), id);

    const { data, error } = await manager.client.rpc('admin_voice_parts');

    expect(error).toBeNull();
    const ours = (data ?? []).find((part) => part.id === id);
    expect(ours).toMatchObject({ id, singer_count: 2 });
    expect((data ?? []).map(({ name }) => name).slice(0, 4)).toEqual([
      'Soprano',
      'Alto',
      'Tenor',
      'Bass',
    ]);
  });

  it('is refused to a Singer without manage-users', async () => {
    const singer = await signInNewSinger();
    await grantRole(singer, ['read', 'update']);

    const { error } = await singer.client.rpc('admin_voice_parts');

    expect(error?.code).toBe('42501');
  });
});

describe('removing a Voice Part', () => {
  it('removes it and sends the Singers who had it back to choose again', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);
    const singer = await signInNewSinger();
    await chooseVoicePart(singer, id);

    const { error } = await manager.client.rpc('admin_remove_voice_part', { target: id });

    expect(error).toBeNull();
    expect(await stored(id)).toBeNull();
    const reported = await singer.client.rpc('my_default_voice_part');
    expect(reported.data).toBeNull();
  });

  it('refuses an unknown part and a Singer without manage-users', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);
    const singer = await signInNewSinger();
    await grantRole(singer, ['read', 'delete']);

    const ghost = await manager.client.rpc('admin_remove_voice_part', { target: randomUUID() });
    const refused = await singer.client.rpc('admin_remove_voice_part', { target: id });

    expect(ghost.error?.code).toBe('P0002');
    expect(refused.error?.code).toBe('42501');
    expect(await stored(id)).not.toBeNull();
  });
});
