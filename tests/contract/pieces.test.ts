// Backend contract seam: who may read, add, edit and delete Pieces, and what the Repertoire refuses.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { anonClient, grantRole, serviceClient, signInNewSinger, type TestSinger } from './support';
import { composerMaxLength, notesMaxLength, titleMaxLength } from '../../src/lib/core/pieces';

/** Every Piece a test adds, so the shared Repertoire is left as it was found. */
const created: string[] = [];

afterAll(async () => {
  await serviceClient().from('pieces').delete().in('id', created);
});

const unique = (): string => randomUUID().slice(0, 8);

const addAs = async (
  singer: Pick<TestSinger, 'client'>,
  title: string,
  composer = 'Anon',
  notes = '',
) => {
  const reply = await singer.client.rpc('add_piece', {
    piece_title: title,
    piece_composer: composer,
    piece_notes: notes,
  });
  if (reply.data !== null) created.push(reply.data);
  return reply;
};

const stored = async (id: string) => {
  const { data } = await serviceClient()
    .from('pieces')
    .select('title, composer, notes')
    .eq('id', id)
    .maybeSingle();
  return data;
};

const singerHolding = async (...held: Parameters<typeof grantRole>[1][number][]) => {
  const singer = await signInNewSinger();
  if (held.length > 0) await grantRole(singer, held);
  return singer;
};

/** A Piece added by the service role, to be edited or deleted by the Singer under test. */
const existingPiece = async (title = `Piece ${unique()}`, composer = 'Anon') => {
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title, composer })
    .select('id')
    .single();
  if (error) throw error;
  created.push(data.id);
  return data.id;
};

describe('reading the Repertoire', () => {
  it('lets a Singer with read see every Piece', async () => {
    const reader = await singerHolding('read');
    const first = await existingPiece(`First ${unique()}`);
    const second = await existingPiece(`Second ${unique()}`, 'Someone');

    const listed = await reader.client.rpc('repertoire');
    const direct = await reader.client.from('pieces').select('id');

    const ids = (listed.data ?? []).map(({ id }) => id);
    expect(ids).toEqual(expect.arrayContaining([first, second]));
    expect((direct.data ?? []).map(({ id }) => id)).toEqual(
      expect.arrayContaining([first, second]),
    );
    expect(listed.data?.find(({ id }) => id === first)).toMatchObject({
      practice_tracks: 0,
      scores: 0,
      performances: 0,
    });
  });

  it('shows a Pending Singer and a visitor nothing', async () => {
    const pending = await singerHolding();
    await existingPiece();

    expect((await pending.client.rpc('repertoire')).error?.code).toBe('42501');
    expect((await pending.client.from('pieces').select('id')).data).toEqual([]);
    expect((await anonClient().from('pieces').select('id')).data ?? []).toEqual([]);
    expect((await anonClient().rpc('repertoire')).error).not.toBeNull();
  });

  it('can narrow to one Piece', async () => {
    const reader = await singerHolding('read');
    const id = await existingPiece();

    const { data } = await reader.client.rpc('repertoire', { only_piece: id });

    expect(data?.map((row) => row.id)).toEqual([id]);
  });
});

describe('adding a Piece', () => {
  it('lets a Singer with append add one, tidying its text and setting the notes', async () => {
    const adder = await singerHolding('read', 'append');
    const title = `Ave   Maria ${unique()}`;

    const { data: id, error } = await addAs(adder, title, '  Franz   Biebl ', ' Sing brightly. ');

    expect(error).toBeNull();
    expect(await stored(id ?? '')).toEqual({
      title: title.replace(/\s+/g, ' '),
      composer: 'Franz Biebl',
      notes: 'Sing brightly.',
    });
  });

  it.each([
    ['read, update and delete', ['read', 'update', 'delete'] as const],
    ['nothing at all', [] as const],
  ])('refuses a Singer holding %s', async (_held, held) => {
    const singer = await singerHolding(...held);
    const title = `Refused ${unique()}`;

    const { error } = await addAs(singer, title);

    expect(error?.code).toBe('42501');
    expect((await serviceClient().from('pieces').select('id').eq('title', title)).data).toEqual([]);
  });

  it('refuses writing the table directly, even with every Permission', async () => {
    const singer = await singerHolding('read', 'append', 'update', 'delete');

    const insert = await singer.client
      .from('pieces')
      .insert({ title: `Direct ${unique()}`, composer: 'Anon' });

    expect(insert.error).not.toBeNull();
  });

  it('accepts a title and composer at their limits and refuses ones over', async () => {
    const adder = await singerHolding('read', 'append');
    const long = (length: number, mark: string) => mark + 'x'.repeat(length - mark.length);

    expect(
      (
        await addAs(
          adder,
          long(titleMaxLength, unique()),
          long(composerMaxLength, 'c'),
          'n'.repeat(notesMaxLength),
        )
      ).error,
    ).toBeNull();
    expect((await addAs(adder, 'x'.repeat(titleMaxLength + 1))).error?.code).toBe('22023');
    expect(
      (await addAs(adder, `T ${unique()}`, 'x'.repeat(composerMaxLength + 1))).error?.code,
    ).toBe('22023');
    expect(
      (await addAs(adder, `T ${unique()}`, 'Anon', 'x'.repeat(notesMaxLength + 1))).error?.code,
    ).toBe('22023');
  });

  it('refuses a blank title and a blank composer', async () => {
    const adder = await singerHolding('read', 'append');

    expect((await addAs(adder, '   ')).error?.code).toBe('22023');
    expect((await addAs(adder, `T ${unique()}`, '')).error?.code).toBe('22023');
    expect((await addAs(adder, `T ${unique()}`, '   ')).error?.code).toBe('22023');
  });

  it('refuses writing a Piece with no composer straight into the table', async () => {
    const { error } = await serviceClient()
      .from('pieces')
      .insert({ title: `Bare ${unique()}`, composer: '' });

    expect(error).not.toBeNull();
  });
});

describe('the title and composer rule', () => {
  it('refuses the same title and composer ignoring case and extra spaces', async () => {
    const adder = await singerHolding('read', 'append');
    const title = `Magnificat ${unique()}`;
    await addAs(adder, title, 'J. S. Bach');

    const again = await addAs(
      adder,
      `  ${title.toUpperCase().replace(' ', '   ')} `,
      'j. s.  bach',
    );

    expect(again.error?.code).toBe('23505');
  });

  it('allows the same title with a different composer', async () => {
    const adder = await singerHolding('read', 'append');
    const title = `Gloria ${unique()}`;

    expect((await addAs(adder, title, 'Vivaldi')).error).toBeNull();
    expect((await addAs(adder, title, 'Poulenc')).error).toBeNull();
  });

  it('holds on Edit too, but a Piece may keep its own title and composer', async () => {
    const editor = await singerHolding('read', 'update');
    const title = `Sanctus ${unique()}`;
    const first = await existingPiece(title, 'Fauré');
    const second = await existingPiece(title, 'Duruflé');

    const clash = await editor.client.rpc('update_piece', {
      target: second,
      piece_title: title.toUpperCase(),
      piece_composer: 'fauré',
      piece_notes: '',
    });
    const same = await editor.client.rpc('update_piece', {
      target: first,
      piece_title: title,
      piece_composer: 'Fauré',
      piece_notes: 'Slowly',
    });

    expect(clash.error?.code).toBe('23505');
    expect(same.error).toBeNull();
  });
});

describe('editing a Piece', () => {
  it('lets a Singer with update change the title, composer and notes', async () => {
    const editor = await singerHolding('read', 'update');
    const id = await existingPiece();
    const title = `Renamed ${unique()}`;

    const { error } = await editor.client.rpc('update_piece', {
      target: id,
      piece_title: title,
      piece_composer: 'Elgar',
      piece_notes: 'Breathe together',
    });

    expect(error).toBeNull();
    expect(await stored(id)).toEqual({ title, composer: 'Elgar', notes: 'Breathe together' });
  });

  it('refuses append alone: it cannot modify an existing Piece', async () => {
    const adder = await singerHolding('read', 'append');
    const id = await existingPiece();
    const before = await stored(id);

    const { error } = await adder.client.rpc('update_piece', {
      target: id,
      piece_title: 'Hijacked',
      piece_composer: 'Anon',
      piece_notes: '',
    });
    // No update policy exists, so a direct write matches no rows rather than changing one.
    await adder.client.from('pieces').update({ title: 'Hijacked' }).eq('id', id);

    expect(error?.code).toBe('42501');
    expect(await stored(id)).toEqual(before);
  });

  it('says so when the Piece is gone', async () => {
    const editor = await singerHolding('read', 'update');

    const { error } = await editor.client.rpc('update_piece', {
      target: randomUUID(),
      piece_title: 'Nothing',
      piece_composer: 'Anon',
      piece_notes: '',
    });

    expect(error?.code).toBe('P0002');
  });
});

describe('deleting a Piece', () => {
  it('lets a Singer with delete remove one', async () => {
    const remover = await singerHolding('read', 'delete');
    const id = await existingPiece();

    const { error } = await remover.client.rpc('delete_piece', { target: id });

    expect(error).toBeNull();
    expect(await stored(id)).toBeNull();
  });

  it.each([
    ['read, append and update', ['read', 'append', 'update'] as const],
    ['nothing at all', [] as const],
  ])('refuses a Singer holding %s', async (_held, held) => {
    const singer = await singerHolding(...held);
    const id = await existingPiece();

    const { error } = await singer.client.rpc('delete_piece', { target: id });

    expect(error?.code).toBe('42501');
    expect(await stored(id)).not.toBeNull();
  });
});
