// Shell: the Choir Time Zone, a site setting beside the Colour Theme (ADR 0004): reading it for
// Performance times, and changing it from Appearance.
import { Effect, Schema } from 'effect';
import type { AdminProblem } from '../core/admin-problems';
import { choirTimeZoneOf, defaultChoirTimeZone, type ChoirTimeZone } from '../core/choir-time';
import { problemOf } from './admin-commands';
import { saveSiteSettings } from './site-settings';
import { callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

const ZoneRow = Schema.Struct({ choir_time_zone: Schema.String });

/** The Choir Time Zone; the default if the setting names a zone this runtime does not know. */
export const loadChoirTimeZone = (
  supabase: Supabase,
): Effect.Effect<ChoirTimeZone, SupabaseCallFailed> =>
  callSupabaseAs(ZoneRow, () =>
    supabase.from('site_settings').select('choir_time_zone').single(),
  ).pipe(
    Effect.map(({ choir_time_zone }) => choirTimeZoneOf(choir_time_zone) ?? defaultChoirTimeZone),
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
        : saveSiteSettings(supabase, { choir_time_zone: known }).pipe(Effect.mapError(problemOf));
    }),
  );
