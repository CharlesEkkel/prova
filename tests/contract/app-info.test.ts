// Backend contract seam: talks to the local Supabase stack (`pnpm supabase:start`).
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { anonKey, url } from './support';

describe('backend contract', () => {
  it('has the local stack credentials', () => {
    expect(anonKey, 'set PUBLIC_SUPABASE_ANON_KEY (see README)').not.toBe('');
  });

  it('serves the app_info row created by the first migration', async () => {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.from('app_info').select('value').eq('key', 'name');
    expect(error).toBeNull();
    expect(data).toEqual([{ value: 'prova' }]);
  });
});
