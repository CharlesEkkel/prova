// Backend contract seam: who may create, change and delete Performances, and what they refuse.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { grantRole, serviceClient, signInNewSinger, type TestSinger } from './support';

/** Every Performance a test adds, so the shared database is left as it was found. */
const created: string[] = [];

/** Every Piece a test adds, likewise. */
const createdPieces: string[] = [];

afterAll(async () => {
  await serviceClient().from('performances').delete().in('id', created);
  await serviceClient().from('pieces').delete().in('id', createdPieces);
});

const unique = (): string => randomUUID().slice(0, 8);

const singerHolding = async (...held: Parameters<typeof grantRole>[1][number][]) => {
  const singer = await signInNewSinger();
  if (held.length > 0) await grantRole(singer, held);
  return singer;
};

type NewPerformance = {
  readonly name?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly venue?: string;
  readonly isMajor?: boolean;
  readonly pieceIds?: readonly string[];
};

const createAs = async (singer: Pick<TestSinger, 'client'>, input: NewPerformance = {}) => {
  const reply = await singer.client.rpc('add_performance', {
    performance_name: input.name ?? `Concert ${unique()}`,
    performance_starts_at: input.startsAt ?? '2027-03-01T19:00:00Z',
    performance_ends_at: input.endsAt ?? '2027-03-01T21:00:00Z',
    performance_venue: input.venue ?? '',
    performance_is_major: input.isMajor ?? false,
    first_piece_ids: [...(input.pieceIds ?? [])],
  });
  if (reply.data !== null) created.push(reply.data);
  return reply;
};

const stored = async (id: string) => {
  const { data } = await serviceClient()
    .from('performances')
    .select('name, starts_at, ends_at, venue, is_major')
    .eq('id', id)
    .maybeSingle();
  return data;
};

/** A Piece in the Repertoire, added by the service role. */
const existingPiece = async () => {
  const { data, error } = await serviceClient()
    .from('pieces')
    .insert({ title: `Piece ${unique()}`, composer: 'Anon' })
    .select('id')
    .single();
  if (error) throw error;
  createdPieces.push(data.id);
  return data.id;
};

/** The Pieces in a Performance, in running order. */
const runningOrder = async (performance: string): Promise<readonly string[]> => {
  const { data, error } = await serviceClient()
    .from('performance_pieces')
    .select('piece_id')
    .eq('performance_id', performance)
    .order('position');
  if (error) throw error;
  return data.map(({ piece_id }) => piece_id);
};

describe('creating a Performance', () => {
  it('lets a Singer with append create one with a name, times and venue', async () => {
    const appender = await singerHolding('read', 'append');
    const name = `Spring concert ${unique()}`;

    const reply = await createAs(appender, {
      name,
      startsAt: '2027-03-01T19:00:00Z',
      endsAt: '2027-03-01T21:00:00Z',
      venue: 'St Mary’s',
    });

    expect(reply.error).toBeNull();
    expect(await stored(reply.data ?? '')).toEqual({
      name,
      starts_at: '2027-03-01T19:00:00+00:00',
      ends_at: '2027-03-01T21:00:00+00:00',
      venue: 'St Mary’s',
      is_major: false,
    });
  });

  it('lets a Singer with append add its first Pieces, in the order given, and mark it major', async () => {
    const appender = await singerHolding('read', 'append');
    const [first, second, third] = [
      await existingPiece(),
      await existingPiece(),
      await existingPiece(),
    ];

    const reply = await createAs(appender, { pieceIds: [second, third, first], isMajor: true });

    expect(reply.error).toBeNull();
    expect(await runningOrder(reply.data ?? '')).toEqual([second, third, first]);
    expect((await stored(reply.data ?? ''))?.is_major).toBe(true);
  });

  it('refuses the same Piece twice among its first Pieces', async () => {
    const appender = await singerHolding('read', 'append');
    const piece = await existingPiece();

    const reply = await createAs(appender, { pieceIds: [piece, piece] });

    expect(reply.error?.code).toBe('23505');
  });

  it('refuses a Singer with only read', async () => {
    const reader = await singerHolding('read');

    const reply = await createAs(reader);

    expect(reply.error).not.toBeNull();
    expect(reply.data).toBeNull();
  });

  it('refuses a Pending Singer', async () => {
    const pending = await singerHolding();

    const reply = await createAs(pending);

    expect(reply.error).not.toBeNull();
    expect(reply.data).toBeNull();
  });
});

describe('a Performance’s name and start', () => {
  it('may not both repeat, ignoring case and extra spaces', async () => {
    const appender = await singerHolding('read', 'append');
    const name = `Gala ${unique()}`;
    const first = await createAs(appender, {
      name,
      startsAt: '2027-04-01T18:00:00Z',
      endsAt: '2027-04-01T20:00:00Z',
    });

    const again = await createAs(appender, {
      name: `  ${name.toUpperCase().replace(' ', '   ')} `,
      startsAt: '2027-04-01T18:00:00Z',
      endsAt: '2027-04-01T19:00:00Z',
    });

    expect(first.error).toBeNull();
    expect(again.error?.code).toBe('23505');
  });

  it('may repeat the name alone', async () => {
    const appender = await singerHolding('read', 'append');
    const name = `Carols ${unique()}`;
    await createAs(appender, {
      name,
      startsAt: '2027-12-01T18:00:00Z',
      endsAt: '2027-12-01T20:00:00Z',
    });

    const later = await createAs(appender, {
      name,
      startsAt: '2027-12-08T18:00:00Z',
      endsAt: '2027-12-08T20:00:00Z',
    });

    expect(later.error).toBeNull();
  });
});

describe('the end of a Performance', () => {
  it('must come after the start, and the function says so', async () => {
    const appender = await singerHolding('read', 'append');

    const before = await createAs(appender, {
      startsAt: '2027-03-01T21:00:00Z',
      endsAt: '2027-03-01T19:00:00Z',
    });
    const same = await createAs(appender, {
      startsAt: '2027-03-01T19:00:00Z',
      endsAt: '2027-03-01T19:00:00Z',
    });

    expect(before.error?.code).toBe('22023');
    expect(same.error?.code).toBe('22023');
  });

  it('is also held by the table, whoever writes to it', async () => {
    const { data, error } = await serviceClient()
      .from('performances')
      .insert({
        name: `Backwards ${unique()}`,
        starts_at: '2027-03-01T21:00:00Z',
        ends_at: '2027-03-01T19:00:00Z',
      })
      .select('id');
    if (data !== null) created.push(...data.map(({ id }) => id));

    expect(error).not.toBeNull();
  });
});

/** A Performance added by the service role, to be changed or deleted by the Singer under test. */
const existingPerformance = async (
  startsAt = '2027-05-01T18:00:00Z',
  endsAt = '2027-05-01T20:00:00Z',
) => {
  const { data, error } = await serviceClient()
    .from('performances')
    .insert({ name: `Existing ${unique()}`, starts_at: startsAt, ends_at: endsAt })
    .select('id')
    .single();
  if (error) throw error;
  created.push(data.id);
  return data.id;
};

const editAs = (
  singer: Pick<TestSinger, 'client'>,
  target: string,
  input: Required<Pick<NewPerformance, 'name' | 'startsAt' | 'endsAt' | 'venue'>>,
) =>
  singer.client.rpc('update_performance', {
    target,
    performance_name: input.name,
    performance_starts_at: input.startsAt,
    performance_ends_at: input.endsAt,
    performance_venue: input.venue,
  });

describe('editing a Performance', () => {
  const edit = () => ({
    name: `Renamed ${unique()}`,
    startsAt: '2027-06-01T17:00:00Z',
    endsAt: '2027-06-01T19:30:00Z',
    venue: 'Town Hall',
  });

  it('lets a Singer with update change its name, times and venue', async () => {
    const updater = await singerHolding('read', 'update');
    const target = await existingPerformance();
    const change = edit();

    const reply = await editAs(updater, target, change);

    expect(reply.error).toBeNull();
    expect(await stored(target)).toEqual({
      name: change.name,
      starts_at: '2027-06-01T17:00:00+00:00',
      ends_at: '2027-06-01T19:30:00+00:00',
      venue: 'Town Hall',
      is_major: false,
    });
  });

  it('lets a Singer with update change a past Performance', async () => {
    const updater = await singerHolding('read', 'update');
    const target = await existingPerformance('2020-05-01T18:00:00Z', '2020-05-01T20:00:00Z');

    const reply = await editAs(updater, target, edit());

    expect(reply.error).toBeNull();
  });

  it('refuses a Singer with append but not update', async () => {
    const appender = await singerHolding('read', 'append');
    const target = await existingPerformance();
    const before = await stored(target);

    const reply = await editAs(appender, target, edit());

    expect(reply.error).not.toBeNull();
    expect(await stored(target)).toEqual(before);
  });

  it('refuses an end before the start, and a name and start another Performance has', async () => {
    const updater = await singerHolding('read', 'update');
    const target = await existingPerformance();
    const other = await stored(
      await existingPerformance('2027-07-01T18:00:00Z', '2027-07-01T20:00:00Z'),
    );

    const backwards = await editAs(updater, target, {
      ...edit(),
      startsAt: '2027-06-01T19:00:00Z',
      endsAt: '2027-06-01T18:00:00Z',
    });
    const clash = await editAs(updater, target, {
      ...edit(),
      name: other?.name ?? '',
      startsAt: '2027-07-01T18:00:00Z',
      endsAt: '2027-07-01T19:00:00Z',
    });

    expect(backwards.error?.code).toBe('22023');
    expect(clash.error?.code).toBe('23505');
  });

  it('keeps its own name and start when only the venue changes', async () => {
    const updater = await singerHolding('read', 'update');
    const target = await existingPerformance();
    const current = await stored(target);

    const reply = await editAs(updater, target, {
      name: current?.name ?? '',
      startsAt: current?.starts_at ?? '',
      endsAt: current?.ends_at ?? '',
      venue: 'Cathedral',
    });

    expect(reply.error).toBeNull();
  });
});

/** A Performance holding these Pieces in this order, arranged by the service role. */
const performanceHolding = async (...pieceIds: readonly string[]) => {
  const performance = await existingPerformance();
  if (pieceIds.length > 0) {
    const { error } = await serviceClient()
      .from('performance_pieces')
      .insert(
        pieceIds.map((piece_id, index) => ({
          performance_id: performance,
          piece_id,
          position: index + 1,
        })),
      );
    if (error) throw error;
  }
  return performance;
};

const addToAs = (
  singer: Pick<TestSinger, 'client'>,
  piece: string,
  performances: readonly string[],
) =>
  singer.client.rpc('add_piece_to_performances', {
    target_piece: piece,
    performance_ids: [...performances],
  });

describe('adding a Piece to Performances', () => {
  it('lets a Singer with update add a Piece with no uploads to several at once, at the end of each', async () => {
    const updater = await singerHolding('read', 'update');
    const [held, piece] = [await existingPiece(), await existingPiece()];
    const [one, two] = [await performanceHolding(held), await performanceHolding()];

    const reply = await addToAs(updater, piece, [one, two]);

    expect(reply.error).toBeNull();
    expect(await runningOrder(one)).toEqual([held, piece]);
    expect(await runningOrder(two)).toEqual([piece]);
  });

  it('refuses a Piece already in one of them, and adds it to none', async () => {
    const updater = await singerHolding('read', 'update');
    const piece = await existingPiece();
    const [already, fresh] = [await performanceHolding(piece), await performanceHolding()];

    const reply = await addToAs(updater, piece, [fresh, already]);

    expect(reply.error?.code).toBe('23505');
    expect(await runningOrder(fresh)).toEqual([]);
    expect(await runningOrder(already)).toEqual([piece]);
  });

  it('refuses a Singer with append but not update', async () => {
    const appender = await singerHolding('read', 'append');
    const piece = await existingPiece();
    const performance = await performanceHolding();

    const reply = await addToAs(appender, piece, [performance]);

    expect(reply.error).not.toBeNull();
    expect(await runningOrder(performance)).toEqual([]);
  });
});

const removeFromAs = (singer: Pick<TestSinger, 'client'>, performance: string, piece: string) =>
  singer.client.rpc('remove_piece_from_performance', {
    target_performance: performance,
    target_piece: piece,
  });

describe('removing a Piece from a Performance', () => {
  it('lets a Singer with update take it out of that Performance only', async () => {
    const updater = await singerHolding('read', 'update');
    const [first, second, third] = [
      await existingPiece(),
      await existingPiece(),
      await existingPiece(),
    ];
    const performance = await performanceHolding(first, second, third);
    const other = await performanceHolding(second);

    const reply = await removeFromAs(updater, performance, second);

    expect(reply.error).toBeNull();
    expect(await runningOrder(performance)).toEqual([first, third]);
    expect(await runningOrder(other)).toEqual([second]);
  });

  it('refuses a Singer with append but not update', async () => {
    const appender = await singerHolding('read', 'append');
    const piece = await existingPiece();
    const performance = await performanceHolding(piece);

    const reply = await removeFromAs(appender, performance, piece);

    expect(reply.error).not.toBeNull();
    expect(await runningOrder(performance)).toEqual([piece]);
  });
});

const reorderAs = (
  singer: Pick<TestSinger, 'client'>,
  performance: string,
  ordered: readonly string[],
) => singer.client.rpc('reorder_performance', { target: performance, ordered: [...ordered] });

describe('reordering a Performance', () => {
  it('lets a Singer with update set the whole running order, which belongs to that Performance', async () => {
    const updater = await singerHolding('read', 'update');
    const [first, second, third] = [
      await existingPiece(),
      await existingPiece(),
      await existingPiece(),
    ];
    const performance = await performanceHolding(first, second, third);
    const other = await performanceHolding(first, second, third);

    const reply = await reorderAs(updater, performance, [third, first, second]);

    expect(reply.error).toBeNull();
    expect(await runningOrder(performance)).toEqual([third, first, second]);
    expect(await runningOrder(other)).toEqual([first, second, third]);
  });

  it('refuses a stale list: one missing a Piece, holding an extra one, or naming one twice', async () => {
    const updater = await singerHolding('read', 'update');
    const [first, second, outsider] = [
      await existingPiece(),
      await existingPiece(),
      await existingPiece(),
    ];
    const performance = await performanceHolding(first, second);

    const missing = await reorderAs(updater, performance, [second]);
    const extra = await reorderAs(updater, performance, [second, first, outsider]);
    const twice = await reorderAs(updater, performance, [second, second]);

    for (const reply of [missing, extra, twice]) {
      expect(reply.error?.code).toBe('22023');
      expect(reply.error?.hint).toBe('stale-list');
    }
    expect(await runningOrder(performance)).toEqual([first, second]);
  });

  it('refuses a Singer with append but not update', async () => {
    const appender = await singerHolding('read', 'append');
    const [first, second] = [await existingPiece(), await existingPiece()];
    const performance = await performanceHolding(first, second);

    const reply = await reorderAs(appender, performance, [second, first]);

    expect(reply.error).not.toBeNull();
    expect(await runningOrder(performance)).toEqual([first, second]);
  });
});

const pieceExists = async (piece: string): Promise<boolean> => {
  const { data } = await serviceClient().from('pieces').select('id').eq('id', piece).maybeSingle();
  return data !== null;
};

describe('deleting', () => {
  it('lets a Singer with delete delete a Performance, leaving its Pieces in the Repertoire', async () => {
    const deleter = await singerHolding('read', 'delete');
    const piece = await existingPiece();
    const performance = await performanceHolding(piece);

    const reply = await deleter.client.rpc('delete_performance', { target: performance });

    expect(reply.error).toBeNull();
    expect(await stored(performance)).toBeNull();
    expect(await pieceExists(piece)).toBe(true);
  });

  it('refuses a Singer with append and update but not delete', async () => {
    const editor = await singerHolding('read', 'append', 'update');
    const performance = await performanceHolding();

    const reply = await editor.client.rpc('delete_performance', { target: performance });

    expect(reply.error).not.toBeNull();
    expect(await stored(performance)).not.toBeNull();
  });

  it('takes a deleted Piece out of every Performance it was in', async () => {
    const deleter = await singerHolding('read', 'delete');
    const [kept, gone] = [await existingPiece(), await existingPiece()];
    const [one, two] = [await performanceHolding(gone, kept), await performanceHolding(gone)];

    const reply = await deleter.client.rpc('delete_piece', { target: gone });

    expect(reply.error).toBeNull();
    expect(await runningOrder(one)).toEqual([kept]);
    expect(await runningOrder(two)).toEqual([]);
  });
});

describe('who may create', () => {
  it('refuses a Singer with update but not append', async () => {
    const updater = await singerHolding('read', 'update');

    const reply = await createAs(updater);

    expect(reply.error).not.toBeNull();
  });
});

describe('reading Performances', () => {
  it('lets a Singer with read see them and their running orders', async () => {
    const reader = await singerHolding('read');
    const piece = await existingPiece();
    const performance = await performanceHolding(piece);

    const seen = await reader.client.from('performances').select('id').eq('id', performance);
    const order = await reader.client
      .from('performance_pieces')
      .select('piece_id')
      .eq('performance_id', performance);

    expect(seen.data).toEqual([{ id: performance }]);
    expect(order.data).toEqual([{ piece_id: piece }]);
  });

  it('shows a Pending Singer nothing', async () => {
    const pending = await singerHolding();
    const piece = await existingPiece();
    const performance = await performanceHolding(piece);

    const seen = await pending.client.from('performances').select('id').eq('id', performance);
    const order = await pending.client
      .from('performance_pieces')
      .select('piece_id')
      .eq('performance_id', performance);

    expect(seen.data).toEqual([]);
    expect(order.data).toEqual([]);
  });

  it('lets nobody write to the tables directly', async () => {
    const admin = await singerHolding('read', 'append', 'update', 'delete');
    const performance = await performanceHolding();

    const insert = await admin.client.from('performances').insert({
      name: `Direct ${unique()}`,
      starts_at: '2027-01-01T00:00:00Z',
      ends_at: '2027-01-01T01:00:00Z',
    });
    const update = await admin.client
      .from('performances')
      .update({ venue: 'Nope' })
      .eq('id', performance)
      .select('id');

    expect(insert.error).not.toBeNull();
    expect(update.data ?? []).toEqual([]);
  });
});
