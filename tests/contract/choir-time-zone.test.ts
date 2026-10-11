// Backend contract seam: the Choir Time Zone, a site setting every Singer reads and only a Singer with
// manage-users changes. Every test file shares the one row, so the zone is put back after each test.
import { afterEach, describe, expect, it } from 'vitest';
import { grantRole, serviceClient, signInNewManager, signInNewSinger } from './support';

const seededZone = 'UTC';

const currentZone = async (): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('site_settings')
    .select('choir_time_zone')
    .single();
  if (error) throw error;
  return data.choir_time_zone;
};

afterEach(async () => {
  // PostgREST refuses an update with no filter; every real value passes this one.
  const { error } = await serviceClient()
    .from('site_settings')
    .update({ choir_time_zone: seededZone })
    .not('choir_time_zone', 'is', null);
  if (error) throw error;
});

describe('the Choir Time Zone setting', () => {
  it('is seeded as UTC and read by a Singer with read', async () => {
    const reader = await signInNewSinger();
    await grantRole(reader, ['read']);

    const { data } = await reader.client.from('site_settings').select('choir_time_zone');

    expect(data).toEqual([{ choir_time_zone: seededZone }]);
  });

  it('can be changed by a Singer with manage-users', async () => {
    const manager = await signInNewManager();

    const { data, error } = await manager.client
      .from('site_settings')
      .update({ choir_time_zone: 'Australia/Sydney' })
      .not('choir_time_zone', 'is', null)
      .select('choir_time_zone');

    expect(error).toBeNull();
    expect(data).toEqual([{ choir_time_zone: 'Australia/Sydney' }]);
  });

  it('cannot be changed by a Singer with every other Permission', async () => {
    const singer = await signInNewSinger();
    await grantRole(singer, ['read', 'append', 'update', 'delete']);

    const { data } = await singer.client
      .from('site_settings')
      .update({ choir_time_zone: 'Europe/Paris' })
      .not('choir_time_zone', 'is', null)
      .select('choir_time_zone');

    expect(data ?? []).toEqual([]);
    expect(await currentZone()).toBe(seededZone);
  });

  it('refuses a name that is not a time zone', async () => {
    const manager = await signInNewManager();

    const { error } = await manager.client
      .from('site_settings')
      .update({ choir_time_zone: 'Middle/Earth' })
      .not('choir_time_zone', 'is', null);

    expect(error).not.toBeNull();
    expect(await currentZone()).toBe(seededZone);
  });
});
