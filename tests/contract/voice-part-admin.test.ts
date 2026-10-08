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
import {
  combinedTrackLabel,
  shortLabelMaxLength,
  voicePartNameMaxLength,
} from '../../src/lib/core/voice-parts';

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

  it.each([
    combinedTrackLabel,
    combinedTrackLabel.toLowerCase(),
    combinedTrackLabel.toUpperCase(),
    ` ${combinedTrackLabel.toLowerCase()} `,
  ])('keeps %j for the Combined Track, as a label', async (label) => {
    const manager = await signInNewManager();

    const { error } = await addAs(manager, `Everyone ${unique()}`, label);

    expect(error).toMatchObject({ code: '22023', hint: 'reserved' });
  });

  it('keeps the Combined Track’s label for it, as a name', async () => {
    const manager = await signInNewManager();

    const { error } = await addAs(manager, combinedTrackLabel.toLowerCase(), freshLabel());

    expect(error).toMatchObject({ code: '22023', hint: 'reserved' });
  });

  it.each(['', '   ', 'A'.repeat(shortLabelMaxLength + 1), 'A 1', 'A-1', 'É'])(
    'refuses the short label %j',
    async (label) => {
      const manager = await signInNewManager();

      const { error } = await addAs(manager, `Odd label ${unique()}`, label);

      expect(error).toMatchObject({ code: '22023', hint: 'invalid' });
    },
  );

  it.each(['', '   ', 'x'.repeat(voicePartNameMaxLength + 1)])(
    'refuses the name %j',
    async (name) => {
      const manager = await signInNewManager();

      const { error } = await addAs(manager, name, freshLabel());

      expect(error).toMatchObject({ code: '22023', hint: 'invalid' });
    },
  );

  // These limits are written in the database and in core/voice-parts.ts. Taking the boundaries from
  // core here is what stops the two drifting apart.
  it('accepts the longest name and short label the core rules allow', async () => {
    const manager = await signInNewManager();
    const before = await countParts();
    const longestName = `${'x'.repeat(voicePartNameMaxLength - unique().length)}${unique()}`;
    const longestLabel = `T${'1'.repeat(shortLabelMaxLength - 1)}`;

    const { error } = await addAs(manager, longestName, longestLabel);

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

/** Every Voice Part id in list order, as the admin portal reads it. */
const orderedIds = async (singer: Pick<TestSinger, 'client'>): Promise<readonly string[]> => {
  const { data } = await singer.client.rpc('admin_voice_parts');
  return (data ?? []).map(({ id }) => id);
};

describe('reordering the Voice Parts', () => {
  it('sets the whole list to the order it is given, and every picker follows', async () => {
    const manager = await signInNewManager();
    const first = await addPart(manager);
    const second = await addPart(manager);
    const before = await orderedIds(manager);
    const swapped = before.map((id) => (id === first ? second : id === second ? first : id));

    const { error } = await manager.client.rpc('admin_reorder_voice_parts', {
      ordered: [...swapped],
    });

    expect(error).toBeNull();
    expect(await orderedIds(manager)).toEqual(swapped);
    const listed = await manager.client.from('voice_parts').select('id').order('position');
    expect((listed.data ?? []).map(({ id }) => id)).toEqual(swapped);
  });

  it('leaves the seeded parts in their order when a new part moves to the front', async () => {
    const manager = await signInNewManager();
    const id = await addPart(manager);
    const before = await orderedIds(manager);

    await manager.client.rpc('admin_reorder_voice_parts', {
      ordered: [id, ...before.filter((other) => other !== id)],
    });

    const names = await serviceClient().from('voice_parts').select('name').order('position');
    const seededInOrder = (names.data ?? [])
      .map(({ name }) => name)
      .filter((name) => ['Soprano', 'Alto', 'Tenor', 'Bass'].includes(name));
    expect(seededInOrder).toEqual(['Soprano', 'Alto', 'Tenor', 'Bass']);
    expect(await positionOf(id)).toBe(1);
  });

  it.each([
    ['leaves a part out', (ids: readonly string[]) => ids.slice(1)],
    ['repeats a part', (ids: readonly string[]) => [...ids, ids[0] ?? '']],
    [
      'names a part that does not exist',
      (ids: readonly string[]) => [...ids.slice(1), randomUUID()],
    ],
    ['is empty', () => []],
  ])('refuses a list that %s, as out of date', async (_what, spoil) => {
    const manager = await signInNewManager();
    const current = await orderedIds(manager);

    const { error } = await manager.client.rpc('admin_reorder_voice_parts', {
      ordered: [...spoil(current)],
    });

    expect(error).toMatchObject({ code: '22023', hint: 'stale-list' });
    expect(await orderedIds(manager)).toEqual(current);
  });

  it('is refused to a Singer without manage-users', async () => {
    const manager = await signInNewManager();
    const singer = await signInNewSinger();
    await grantRole(singer, ['read', 'update']);
    const current = await orderedIds(manager);

    const { error } = await singer.client.rpc('admin_reorder_voice_parts', {
      ordered: [...current].reverse(),
    });

    expect(error?.code).toBe('42501');
    expect(await orderedIds(manager)).toEqual(current);
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
    const seededInOrder = (data ?? [])
      .map(({ name }) => name)
      .filter((name) => ['Soprano', 'Alto', 'Tenor', 'Bass'].includes(name));
    expect(seededInOrder).toEqual(['Soprano', 'Alto', 'Tenor', 'Bass']);
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
