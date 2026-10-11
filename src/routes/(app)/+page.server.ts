import { error, redirect } from '@sveltejs/kit';
import { paths } from '../../lib/core/paths';
import {
  dayIn,
  homeTileOf,
  homeTimeline,
  pastRowOf,
  type HomePerformance,
} from '../../lib/core/performances';
import { partNamesOf } from '../../lib/core/practice-tracks';
import { loadHomePerformances } from '../../lib/shell/performances';
import { valueOrNull } from '../../lib/shell/run';
import { loadVoiceParts } from '../../lib/shell/voice-parts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { visitor, supabase }, parent }) => {
  // The gate lets only a ready Singer in here; anyone else goes back through it.
  if (visitor.stage !== 'ready') redirect(303, paths.home);
  const [performances, voiceParts, { choirTimeZone }] = await Promise.all([
    valueOrNull(loadHomePerformances(supabase)),
    valueOrNull(loadVoiceParts(supabase)),
    parent(),
  ]);
  if (performances === null || voiceParts === null) {
    error(503, 'The Performances could not be loaded. Try again in a moment.');
  }

  // One moment for the whole page, so the Today marker, the split and "In 3 days" agree.
  const now = new Date();
  const nameOf = partNamesOf(voiceParts);
  const tileOf = (performance: HomePerformance) =>
    homeTileOf(performance, now, choirTimeZone, visitor.voicePart.id, nameOf);
  const { past, next, later } = homeTimeline(performances, now);

  return {
    today: dayIn(now, choirTimeZone),
    past: past.map(pastRowOf),
    next: next === null ? null : tileOf(next),
    later: later.map(tileOf),
  };
};
