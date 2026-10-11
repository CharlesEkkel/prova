// Shell: changing the site settings, the one row of choir-wide choices (the Colour Theme and the
// Choir Time Zone). Reading each lives beside what uses it.
import { Effect, Schema } from 'effect';
import type { Database } from './database.types';
import { callSupabaseAs, SupabaseCallFailed, type Supabase } from './supabase';

type SiteSettingsChange = Database['public']['Tables']['site_settings']['Update'];

/** Postgres' "insufficient privilege": what a refusal by row-level security looks like elsewhere. */
const notAllowedCode = '42501';

const ChangedRows = Schema.Array(Schema.Struct({ colour_theme: Schema.String }));

/**
 * Changes these settings. The database refuses anyone without `manage-users` by changing no rows, so
 * a reply without the row is a refusal.
 */
export const saveSiteSettings = (
  supabase: Supabase,
  change: SiteSettingsChange,
): Effect.Effect<void, SupabaseCallFailed> =>
  callSupabaseAs(ChangedRows, () =>
    // PostgREST refuses an update with no filter; the table has one row, and it always has a theme.
    supabase
      .from('site_settings')
      .update(change)
      .not('colour_theme', 'is', null)
      .select('colour_theme'),
  ).pipe(
    Effect.flatMap((rows) =>
      rows.length === 1
        ? Effect.void
        : Effect.fail(new SupabaseCallFailed({ cause: { code: notAllowedCode } })),
    ),
  );
