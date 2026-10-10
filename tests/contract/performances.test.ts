// Backend contract seam: who may create, change and delete Performances, and what they refuse.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { grantRole, serviceClient, signInNewSinger, type TestSinger } from './support';

/** Every Performance a test adds, so the shared database is left as it was found. */
const created: string[] = [];

afterAll(async () => {
  await serviceClient().from('performances').delete().in('id', created);
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
};

const createAs = async (singer: Pick<TestSinger, 'client'>, input: NewPerformance = {}) => {
  const reply = await singer.client.rpc('add_performance', {
    performance_name: input.name ?? `Concert ${unique()}`,
    performance_starts_at: input.startsAt ?? '2027-03-01T19:00:00Z',
    performance_ends_at: input.endsAt ?? '2027-03-01T21:00:00Z',
    performance_venue: input.venue ?? '',
    performance_is_major: input.isMajor ?? false,
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
