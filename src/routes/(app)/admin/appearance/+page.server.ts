import { error, fail } from '@sveltejs/kit';
import { adminProblemMessages } from '../../../../lib/core/admin-problems';
import { formActions } from '../../../../lib/core/paths';
import {
  chooseColourTheme,
  loadColourTheme,
  resetColourTheme,
} from '../../../../lib/shell/colour-theme';
import { failureOrNull, valueOrNull } from '../../../../lib/shell/run';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // The database, not the cookie: another Admin may have changed it since this one's cookie was set.
  const colourTheme = await valueOrNull(loadColourTheme(locals.supabase));
  if (colourTheme === null)
    error(503, 'The Colour Theme could not be loaded. Try again in a moment.');
  return { colourTheme };
};

export const actions: Actions = {
  [formActions.appearance.set]: async ({ locals, cookies, request }) => {
    const problem = await failureOrNull(chooseColourTheme(locals.supabase, cookies, request));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
  [formActions.appearance.reset]: async ({ locals, cookies }) => {
    const problem = await failureOrNull(resetColourTheme(locals.supabase, cookies));
    return problem === null ? { ok: true } : fail(400, { problem: adminProblemMessages[problem] });
  },
};
