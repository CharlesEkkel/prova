// Shell: changing the Choir Time Zone, a site setting beside the Colour Theme (ADR 0004). Reading it
// is `loadChoirTimeZone` in ./performances, where Performance times are read.
import { Effect, Schema } from 'effect';
import { choirTimeZoneOf, type ChoirTimeZone } from '../core/choir-time';
import type { AdminProblem } from '../core/admin-problems';
import { problemOf } from './admin-commands';
import { callSupabaseAs, SupabaseCallFailed, type Supabase } from './supabase';

/** Postgres' "insufficient privilege": what a refusal by row-level security looks like elsewhere. */
const notAllowedCode = '42501';

const ZoneRows = Schema.Array(Schema.Struct({ choir_time_zone: Schema.String }));

/**
 * Changes the Choir Time Zone. The database refuses anyone without `manage-users` by changing no
 * rows, so a reply without the row is a refusal.
 */
const saveChoirTimeZone = (
  supabase: Supabase,
  zone: ChoirTimeZone,
): Effect.Effect<void, SupabaseCallFailed> =>
  callSupabaseAs(ZoneRows, () =>
    // PostgREST refuses an update with no filter; the table has one row, so this matches it.
    supabase
      .from('site_settings')
      .update({ choir_time_zone: zone })
      .not('choir_time_zone', 'is', null)
      .select('choir_time_zone'),
  ).pipe(
    Effect.flatMap((rows) =>
      rows.length === 1
        ? Effect.void
        : Effect.fail(new SupabaseCallFailed({ cause: { code: notAllowedCode } })),
    ),
  );

const ZoneForm = Schema.Struct({ zone: Schema.String });

/** The Appearance form's time zone picker: the zone it names becomes the choir's. */
export const chooseChoirTimeZone = (
  supabase: Supabase,
  request: Request,
): Effect.Effect<void, AdminProblem> =>
  Effect.tryPromise(() => request.formData()).pipe(
    Effect.flatMap((form) => Schema.decodeUnknownEffect(ZoneForm)(Object.fromEntries(form))),
    Effect.mapError((): AdminProblem => 'invalid'),
    Effect.flatMap(({ zone }) => {
      const known = choirTimeZoneOf(zone);
      return known === null
        ? Effect.fail<AdminProblem>('invalid')
        : saveChoirTimeZone(supabase, known).pipe(Effect.mapError(problemOf));
    }),
  );
