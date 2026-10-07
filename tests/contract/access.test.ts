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

/**
 * Tables any signed-in person may read before approval, each with the reason. Anything not listed
 * here must read as empty for a Pending Singer. The site Colour Theme (#31) is added by #31.
 */
const readableBeforeApproval: ReadonlyMap<string, string> = new Map([
  ['voice_parts', 'a new Singer chooses their Voice Part before approval; only names and labels'],
  ['app_info', 'scaffold ping row, holds no choir data'],
]);

const OpenApiDocument = Schema.Struct({
  definitions: Schema.Record(Schema.String, Schema.Unknown),
});
const Rows = Schema.Array(Schema.Unknown);

/** Every table the API exposes, from the same OpenAPI document PostgREST serves to clients. */
const exposedTables = async (): Promise<readonly string[]> => {
  const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: serviceRoleKey } });
  const document = Schema.decodeUnknownSync(OpenApiDocument)(await response.json());
  return Object.keys(document.definitions);
};

/** How many rows `select *` returns over the API with this token. A refusal counts as none. */
const rowsVisibleTo = async (table: string, apikey: string, bearer: string): Promise<number> => {
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey, authorization: `Bearer ${bearer}` },
  });
  return response.ok ? Schema.decodeUnknownSync(Rows)(await response.json()).length : 0;
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
        rowsInTable: await rowsVisibleTo(table, serviceRoleKey, serviceRoleKey),
        rowsSeen: await rowsVisibleTo(table, anonKey, token),
      })),
    );

    const leaking = verdicts
      .filter(({ table, rowsSeen }) => rowsSeen > 0 && !readableBeforeApproval.has(table))
      .map(({ table }) => table);
    const unproven = verdicts
      .filter(({ table, rowsInTable }) => rowsInTable === 0 && !readableBeforeApproval.has(table))
      .map(({ table }) => table);

    expect(leaking, 'tables a Pending Singer can read').toEqual([]);
    expect(unproven, 'empty tables: add a sample row to arrangeSampleRows').toEqual([]);
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
