// Shell: the only place the Supabase client is created. Reads public environment variables only.
import { createClient } from '@supabase/supabase-js';

type PublicEnv = {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
};

// `import.meta.env` is typed loosely by Vite; narrowing it to the two public variables we read.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- validation boundary: Vite only injects PUBLIC_* strings
const publicEnv = import.meta.env as PublicEnv;

export const createSupabaseClient = () =>
  createClient(
    publicEnv.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
