import { error, fail } from '@sveltejs/kit';
import { adminProblemMessages } from '../../../../lib/core/admin-problems';
import { formActions } from '../../../../lib/core/paths';
import {
  chooseColourTheme,
  loadColourTheme,
  resetColourTheme,
} from '../../../../lib/shell/colour-theme';
import { choirTimeZones } from '../../../../lib/core/choir-time';
import { chooseChoirTimeZone } from '../../../../lib/shell/choir-time-zone';
import { loadChoirTimeZone } from '../../../../lib/shell/performances';
import { failureOrNull, valueOrNull } from '../../../../lib/shell/run';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // The database, not the cookie: another Admin may have changed it since this one's cookie was set.
  const [colourTheme, choirTimeZone] = await Promise.all([
    valueOrNull(loadColourTheme(locals.supabase)),
    valueOrNull(loadChoirTimeZone(locals.supabase)),
  ]);
  if (colourTheme === null || choirTimeZone === null)
    error(503, 'The Appearance settings could not be loaded. Try again in a moment.');
  return { colourTheme, choirTimeZone, choirTimeZones: choirTimeZones() };
};

export const actions: Actions = {
  [formActions.appearance.set]: async ({ locals, cookies, request }) => {
    const problem = await failureOrNull(chooseColourTheme(locals.supabase, cookies, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
  [formActions.appearance.timeZone]: async ({ locals, request }) => {
    const problem = await failureOrNull(chooseChoirTimeZone(locals.supabase, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
  [formActions.appearance.reset]: async ({ locals, cookies }) => {
    const problem = await failureOrNull(resetColourTheme(locals.supabase, cookies));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
};
