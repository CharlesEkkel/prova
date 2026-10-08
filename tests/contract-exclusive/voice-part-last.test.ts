// Backend contract seam, run on its own: the last Voice Part cannot be removed.
//
// Proving it means removing every other Voice Part, which the other contract files must not see
// (they read the seeded list and let Singers choose from it). So this file lives in its own
// project, run after the others, and puts the list and every Singer's default back when it is done.
import { describe, expect, it } from 'vitest';
import type { Database } from '../../src/lib/shell/database.types';
import { serviceClient, signInNewManager } from '../contract/support';

const pageSize = 1000;

type Choice = { readonly id: string; readonly default_voice_part_id: string | null };

/** Every Singer's default Voice Part: removing a part clears the ones that had it. */
const defaultsChosen = async (): Promise<readonly Choice[]> => {
  const found: Choice[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await serviceClient()
      .from('singers')
      .select('id, default_voice_part_id')
      .not('default_voice_part_id', 'is', null)
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    found.push(...data);
    if (data.length < pageSize) return found;
  }
};

type Part = Database['public']['Tables']['voice_parts']['Row'];

const restoreParts = async (parts: readonly Part[]): Promise<void> => {
  const { error } = await serviceClient()
    .from('voice_parts')
    .upsert([...parts]);
  if (error) throw error;
};

const restoreDefaults = async (choices: readonly Choice[]): Promise<void> => {
  for (const partId of new Set(choices.map(({ default_voice_part_id }) => default_voice_part_id))) {
    const singers = choices
      .filter(({ default_voice_part_id }) => default_voice_part_id === partId)
      .map(({ id }) => id);
    for (let from = 0; from < singers.length; from += 100) {
      const { error } = await serviceClient()
        .from('singers')
        .update({ default_voice_part_id: partId })
        .in('id', singers.slice(from, from + 100));
      if (error) throw error;
    }
  }
};

describe('removing Voice Parts', () => {
  it('stops at the last one, however many are removed before it', async () => {
    const manager = await signInNewManager();
    const all = await serviceClient().from('voice_parts').select('*').order('position');
    if (all.error) throw all.error;
    const parts = all.data;
    expect(parts.length).toBeGreaterThan(1);
    const defaults = await defaultsChosen();

    try {
      const outcomes = [];
      for (const part of parts) {
        const { error } = await manager.client.rpc('admin_remove_voice_part', { target: part.id });
        outcomes.push(error === null ? 'removed' : error.hint || error.code);
      }

      expect(outcomes).toEqual([...parts.slice(1).map(() => 'removed'), 'last-voice-part']);
      const left = await serviceClient().from('voice_parts').select('id');
      expect(left.data).toEqual([{ id: parts.at(-1)?.id }]);
    } finally {
      await restoreParts(parts);
      await restoreDefaults(defaults);
    }
  });
});
