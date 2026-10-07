// Backend contract seam: who may read what. A Pending Singer (no `read`) reads nothing, and
// access follows the database at every request, never the Roles baked into a token.
import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  anonClient,
  anonKey,
  grantRole,
  revokeRole,
  serviceClient,
  serviceRoleKey,
  signInNewSinger,
  url,
  type TestSinger,
} from './support';

type CarveOut = { readonly reason: string; readonly columns: readonly string[] };

/**
 * Tables any signed-in person may read before approval, each with the reason and the only columns
 * they may see. Anything not listed here must read as empty for a Pending Singer. The site Colour
 * Theme (#31) is added by #31.
 */
const readableBeforeApproval: ReadonlyMap<string, CarveOut> = new Map([
  [
    'voice_parts',
    {
      reason:
        'a new Singer chooses their Voice Part before approval: the names and labels to show, ' +
        'the id the choice is saved by and the position the list is ordered by',
      columns: ['id', 'name', 'short_label', 'position'],
    },
  ],
  ['app_info', { reason: 'scaffold ping row, holds no choir data', columns: ['key', 'value'] }],
]);

/**
 * Functions a Pending Singer may call, each with the reason. Anything else the API lets them call
 * is a way around "reads nothing".
 */
const callableBeforeApproval: ReadonlyMap<string, string> = new Map([
  ['my_permissions', 'the one way to learn their access: an empty list'],
  [
    'has_permission',
    'RLS policies call it as the signed-in Singer; it tells them no more than my_permissions',
  ],
  [
    'my_default_voice_part',
    'the gate asks whether to send them to /choose-part, and /waiting shows it; only their own part',
  ],
  ['set_my_default_voice_part', 'a new Singer saves their part before approval; only their own'],
]);

const OpenApiDocument = Schema.Struct({
  definitions: Schema.Record(Schema.String, Schema.Unknown),
  paths: Schema.Record(Schema.String, Schema.Unknown),
});
const Rows = Schema.Array(Schema.Record(Schema.String, Schema.Unknown));

/** The OpenAPI document PostgREST serves to a client with this token. */
const openApiDocumentFor = async (apikey: string, bearer: string) => {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey, authorization: `Bearer ${bearer}` },
  });
  return Schema.decodeUnknownSync(OpenApiDocument)(await response.json());
};

/** Every table the API exposes. */
const exposedTables = async (): Promise<readonly string[]> =>
  Object.keys((await openApiDocumentFor(serviceRoleKey, serviceRoleKey)).definitions);

/** Every function this token may call. PostgREST lists only those it has execute rights on. */
const callableFunctions = async (bearer: string): Promise<readonly string[]> =>
  Object.keys((await openApiDocumentFor(anonKey, bearer)).paths)
    .filter((path) => path.startsWith('/rpc/'))
    .map((path) => path.slice('/rpc/'.length));

/** The rows `select *` returns over the API with this token. A refusal counts as none. */
const rowsVisibleTo = async (
  table: string,
  apikey: string,
  bearer: string,
): Promise<readonly Readonly<Record<string, unknown>>[]> => {
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey, authorization: `Bearer ${bearer}` },
  });
  return response.ok ? Schema.decodeUnknownSync(Rows)(await response.json()) : [];
};

const accessTokenOf = async (singer: TestSinger): Promise<string> => {
  const { data } = await singer.client.auth.getSession();
  if (data.session === null) throw new Error('the test Singer has no session');
  return data.session.access_token;
};

/** One row in every table, so "reads nothing" cannot pass just because a table is empty. */
const arrangeSampleRows = async (): Promise<void> => {
  const other = await signInNewSinger();
  await grantRole(other, ['read']);
};

const pendingSinger = (): Promise<TestSinger> => signInNewSinger();

describe('a Pending Singer', () => {
  it('reads nothing from any table the API exposes, apart from the allowlisted ones', async () => {
    await arrangeSampleRows();
    const pending = await pendingSinger();
    const tables = await exposedTables();
    expect(tables.length).toBeGreaterThan(0);

    const token = await accessTokenOf(pending);

    const verdicts = await Promise.all(
      tables.map(async (table) => ({
        table,
        rowsInTable: (await rowsVisibleTo(table, serviceRoleKey, serviceRoleKey)).length,
        rowsSeen: await rowsVisibleTo(table, anonKey, token),
      })),
    );

    const leaking = verdicts
      .filter(({ table, rowsSeen }) => rowsSeen.length > 0 && !readableBeforeApproval.has(table))
      .map(({ table }) => table);
    const unproven = verdicts
      .filter(({ table, rowsInTable }) => rowsInTable === 0 && !readableBeforeApproval.has(table))
      .map(({ table }) => table);
    const overshared = verdicts.flatMap(({ table, rowsSeen }) => {
      const allowed = readableBeforeApproval.get(table)?.columns ?? [];
      const seen = new Set(rowsSeen.flatMap((row) => Object.keys(row)));
      return [...seen].filter((column) => !allowed.includes(column)).map((c) => `${table}.${c}`);
    });

    expect(leaking, 'tables a Pending Singer can read').toEqual([]);
    expect(unproven, 'empty tables: add a sample row to arrangeSampleRows').toEqual([]);
    expect(overshared, 'columns of carved-out tables beyond the allowlist').toEqual([]);
  });

  it('can call no function the API exposes, apart from the allowlisted ones', async () => {
    const pending = await pendingSinger();

    const callable = await callableFunctions(await accessTokenOf(pending));

    expect(callable, 'the listing works at all').toContain('my_permissions');
    expect(
      callable.filter((name) => !callableBeforeApproval.has(name)),
      'functions a Pending Singer can call',
    ).toEqual([]);
  });

  it('cannot read their own Singer row', async () => {
    const pending = await pendingSinger();

    const { data } = await pending.client.from('singers').select('*').eq('id', pending.id);

    expect(data).toEqual([]);
  });

  it('cannot grant themselves a Role', async () => {
    const pending = await pendingSinger();
    const roleId = await grantRole(await signInNewSinger(), ['read']);

    const { error } = await pending.client
      .from('singer_roles')
      .insert({ singer_id: pending.id, role_id: roleId });

    expect(error).not.toBeNull();
    const granted = await serviceClient()
      .from('singer_roles')
      .select('*')
      .eq('singer_id', pending.id);
    expect(granted.data).toEqual([]);
  });

  it('is told they have no Permissions', async () => {
    const pending = await pendingSinger();

    const { data, error } = await pending.client.rpc('my_permissions');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe('access follows the database', () => {
  it('lists the Permissions a Singer holds across all their Roles', async () => {
    const singer = await signInNewSinger();
    await grantRole(singer, ['read']);
    await grantRole(singer, ['append', 'read']);

    const { data } = await singer.client.rpc('my_permissions');

    expect(data?.toSorted()).toEqual(['append', 'read']);
  });

  it('answers whether the Singer holds one Permission', async () => {
    const singer = await signInNewSinger();
    await grantRole(singer, ['read']);

    const read = await singer.client.rpc('has_permission', { required: 'read' });
    const remove = await singer.client.rpc('has_permission', { required: 'delete' });

    expect([read.data, remove.data]).toEqual([true, false]);
  });

  it('applies a Role removal on the very next request, with the same session', async () => {
    const singer = await signInNewSinger();
    const roleId = await grantRole(singer, ['read']);
    const before = await singer.client.rpc('my_permissions');

    await revokeRole(singer, roleId);
    const after = await singer.client.rpc('my_permissions');

    expect([before.data, after.data]).toEqual([['read'], []]);
  });

  it('is not available to someone who has not signed in', async () => {
    const { error } = await anonClient().rpc('my_permissions');

    expect(error).not.toBeNull();
  });
});
