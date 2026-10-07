// Shell: the only place the Supabase client is created. Reads public environment variables only.
// The session lives in cookies the server reads and writes, so the gate decides before any HTML.
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from './database.types';

type PublicEnv = {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
};

// `import.meta.env` is typed loosely by Vite; narrowing it to the two public variables we read.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- validation boundary: Vite only injects PUBLIC_* strings
const publicEnv = import.meta.env as PublicEnv;

export type Supabase = SupabaseClient<Database>;

/** Where Supabase Auth lives; the only place the sign-in action may send a person off-site. */
export const supabaseOrigin = new URL(publicEnv.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321')
  .origin;

/** A client acting as whoever the request's cookies say they are (or no one). */
export const createRequestSupabase = (cookies: Cookies): Supabase =>
  createServerClient<Database>(
    publicEnv.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            // The browser never needs the session, only the server does.
            cookies.set(name, value, { ...options, path: '/', httpOnly: true });
          });
        },
      },
    },
  );
