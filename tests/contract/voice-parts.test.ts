// Backend contract seam: the Voice Part list and a Singer choosing their own default.
import { describe, expect, it } from 'vitest';
import { anonClient, serviceClient, signInNewSinger } from './support';

describe('the Voice Part list', () => {
  it('is seeded with Soprano, Alto, Tenor and Bass and their short labels, in choir order', async () => {
    const singer = await signInNewSinger();

    const { data } = await singer.client
      .from('voice_parts')
      .select('name, short_label')
      .order('position');

    expect(data).toEqual([
      { name: 'Soprano', short_label: 'S' },
      { name: 'Alto', short_label: 'A' },
      { name: 'Tenor', short_label: 'T' },
      { name: 'Bass', short_label: 'B' },
    ]);
  });

  it('is not readable by someone who has not signed in', async () => {
    const { data } = await anonClient().from('voice_parts').select('name');

    expect(data ?? []).toEqual([]);
  });

  it('cannot be changed by a signed-in Singer', async () => {
    const singer = await signInNewSinger();

    await singer.client
      .from('voice_parts')
      .insert({ name: 'Descant', short_label: 'D', position: 9 });
    await singer.client.from('voice_parts').update({ name: 'Mezzo' }).eq('name', 'Alto');
    await singer.client.from('voice_parts').delete().eq('name', 'Bass');

    const after = await serviceClient().from('voice_parts').select('name').order('position');
    expect(after.data).toEqual([
      { name: 'Soprano' },
      { name: 'Alto' },
      { name: 'Tenor' },
      { name: 'Bass' },
    ]);
  });
});

const voicePartId = async (name: string): Promise<string> => {
  const { data, error } = await serviceClient()
    .from('voice_parts')
    .select('id')
    .eq('name', name)
    .single();
  if (error) throw error;
  return data.id;
};

describe('choosing a default Voice Part', () => {
  it('starts with none chosen', async () => {
    const singer = await signInNewSinger();

    const { data } = await singer.client.rpc('my_default_voice_part');

    expect(data).toBeNull();
  });

  it('saves the Singer’s choice, and reports it back', async () => {
    const singer = await signInNewSinger();
    const alto = await voicePartId('Alto');

    const chosen = await singer.client.rpc('set_my_default_voice_part', { chosen: alto });
    const reported = await singer.client.rpc('my_default_voice_part');

    expect(chosen.error).toBeNull();
    expect(reported.data).toEqual({ id: alto, name: 'Alto', short_label: 'A' });
    const stored = await serviceClient()
      .from('singers')
      .select('default_voice_part_id')
      .eq('id', singer.id)
      .single();
    expect(stored.data).toEqual({ default_voice_part_id: alto });
  });

  it('works for a Pending Singer, who holds no Permission', async () => {
    const pending = await signInNewSinger();

    const { error } = await pending.client.rpc('set_my_default_voice_part', {
      chosen: await voicePartId('Bass'),
    });

    expect(error).toBeNull();
  });

  it('rejects a Voice Part that does not exist', async () => {
    const singer = await signInNewSinger();

    const { error } = await singer.client.rpc('set_my_default_voice_part', {
      chosen: '00000000-0000-0000-0000-000000000000',
    });

    expect(error).not.toBeNull();
    const stored = await serviceClient()
      .from('singers')
      .select('default_voice_part_id')
      .eq('id', singer.id)
      .single();
    expect(stored.data).toEqual({ default_voice_part_id: null });
  });

  it('cannot change another Singer’s default', async () => {
    const owner = await signInNewSinger();
    const intruder = await signInNewSinger();
    const tenor = await voicePartId('Tenor');

    await intruder.client
      .from('singers')
      .update({ default_voice_part_id: tenor })
      .eq('id', owner.id);

    const stored = await serviceClient()
      .from('singers')
      .select('default_voice_part_id')
      .eq('id', owner.id)
      .single();
    expect(stored.data).toEqual({ default_voice_part_id: null });
  });

  it('is not available to someone who has not signed in', async () => {
    const { error } = await anonClient().rpc('set_my_default_voice_part', {
      chosen: await voicePartId('Alto'),
    });

    expect(error).not.toBeNull();
  });
});
