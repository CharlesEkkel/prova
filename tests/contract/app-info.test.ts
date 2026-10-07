// Backend contract seam: talks to the local Supabase stack (`pnpm supabase:start`).
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const anonKey = process.env['SUPABASE_ANON_KEY'] ?? '';

describe('backend contract', () => {
  it('serves the app_info row created by the first migration', async () => {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.from('app_info').select('value').eq('key', 'name');
    expect(error).toBeNull();
    expect(data).toEqual([{ value: 'prova' }]);
  });
});
