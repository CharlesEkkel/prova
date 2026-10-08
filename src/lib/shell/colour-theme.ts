// Shell: the site Colour Theme in the database, and the short-lived cookie that carries it to each
// visitor so most requests never read the database. The cookie holds only the theme's name.
import type { Cookies } from '@sveltejs/kit';
import { Effect, Schema } from 'effect';
import {
  colourThemes,
  defaultColourTheme,
  parseColourTheme,
  type ColourTheme,
} from '../core/colour-theme';
import type { AdminProblem } from '../core/admin-problems';
import { problemOf } from './admin-commands';
import { valueOrNull } from './run';
import { callSupabaseAs, SupabaseCallFailed, type Supabase } from './supabase';

export const colourThemeCookie = 'prova-colour-theme';

/** How long a theme read from the database is kept: a change reaches everyone within this. */
export const colourThemeMaxAge = 60 * 60;
/** How long the default is kept when the database could not be read, so a hiccup is forgotten soon. */
export const colourThemeFallbackMaxAge = 60;

/** Sets the cookie for this visitor. Kept when signing out; not tied to who they are. */
export const setColourThemeCookie = (
  cookies: Pick<Cookies, 'set'>,
  theme: ColourTheme,
  maxAge: number,
): void => {
  cookies.set(colourThemeCookie, theme, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge,
  });
};

/** Postgres' "insufficient privilege": what a refusal by row-level security looks like elsewhere. */
const notAllowedCode = '42501';

const SiteSettingsRow = Schema.Struct({ colour_theme: Schema.Literals(colourThemes) });

/** The Colour Theme the database holds right now. Anyone may read it, signed in or not. */
export const loadColourTheme = (
  supabase: Supabase,
): Effect.Effect<ColourTheme, SupabaseCallFailed> =>
  callSupabaseAs(SiteSettingsRow, () =>
    supabase.from('site_settings').select('colour_theme').single(),
  ).pipe(Effect.map((row) => row.colour_theme));

/**
 * Changes the Colour Theme. The database refuses anyone without `manage-users` by changing no rows,
 * so a reply without the row is a refusal.
 */
export const saveColourTheme = (
  supabase: Supabase,
  theme: ColourTheme,
): Effect.Effect<void, SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(SiteSettingsRow), () =>
    // PostgREST refuses an update with no filter; the table has one row, so this matches it.
    supabase
      .from('site_settings')
      .update({ colour_theme: theme })
      .not('colour_theme', 'is', null)
      .select('colour_theme'),
  ).pipe(
    Effect.flatMap((rows) =>
      rows.length === 1
        ? Effect.void
        : Effect.fail(new SupabaseCallFailed({ cause: { code: notAllowedCode } })),
    ),
  );

/**
 * The theme for a request: the cookie's, when it names one of the five; otherwise a fresh read of
 * the database, remembered in the cookie for an hour. A failed read shows Forest, remembered for a
 * minute.
 */
export const colourThemeFor = async (
  cookies: Pick<Cookies, 'get' | 'set'>,
  supabase: Supabase,
): Promise<ColourTheme> => {
  const remembered = parseColourTheme(cookies.get(colourThemeCookie));
  if (remembered !== null) return remembered;
  const fresh = await valueOrNull(loadColourTheme(supabase));
  setColourThemeCookie(
    cookies,
    fresh ?? defaultColourTheme,
    fresh === null ? colourThemeFallbackMaxAge : colourThemeMaxAge,
  );
  return fresh ?? defaultColourTheme;
};

const ThemeForm = Schema.Struct({ theme: Schema.Literals(colourThemes) });

/** Saves the theme, then sets this Admin's own cookie so they see it at once. */
const saveAndRemember =
  (supabase: Supabase, cookies: Cookies) =>
  (theme: ColourTheme): Effect.Effect<void, AdminProblem> =>
    saveColourTheme(supabase, theme).pipe(
      Effect.mapError(problemOf),
      Effect.tap(() =>
        Effect.sync(() => {
          setColourThemeCookie(cookies, theme, colourThemeMaxAge);
        }),
      ),
    );

/** The Appearance form: the theme it names becomes the site's. */
export const chooseColourTheme = (
  supabase: Supabase,
  cookies: Cookies,
  request: Request,
): Effect.Effect<void, AdminProblem> =>
  Effect.tryPromise(() => request.formData()).pipe(
    Effect.flatMap((form) => Schema.decodeUnknownEffect(ThemeForm)(Object.fromEntries(form))),
    Effect.mapError((): AdminProblem => 'invalid'),
    Effect.flatMap(({ theme }) => saveAndRemember(supabase, cookies)(theme)),
  );

/** Reset to the default: Forest becomes the site's theme. */
export const resetColourTheme = (
  supabase: Supabase,
  cookies: Cookies,
): Effect.Effect<void, AdminProblem> => saveAndRemember(supabase, cookies)(defaultColourTheme);
