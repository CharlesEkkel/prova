import { error, redirect } from '@sveltejs/kit';
import { paths } from '../../lib/core/paths';
import { homeTimeline, startsIn } from '../../lib/core/performances';
import { whatYouWouldHear } from '../../lib/core/playthrough';
import {
  loadHomePerformances,
  type HomePerformance,
  type HomeTile,
} from '../../lib/shell/performances';
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

  const nameOf = (voicePartId: string): string =>
    voiceParts.find(({ id }) => id === voicePartId)?.name ?? '';
  const now = new Date();
  const tileOf = ({ pieces, ...performance }: HomePerformance): HomeTile => ({
    ...performance,
    startsIn: startsIn(performance.startsAt, performance.endsAt, now, choirTimeZone),
    pieces: pieces.map(({ tracks, ...piece }) => ({
      ...piece,
      heard: whatYouWouldHear(tracks, visitor.voicePart.id, nameOf),
    })),
  });
  const { past, next, later } = homeTimeline(performances, now);

  return {
    past: past.map(tileOf),
    next: next === null ? null : tileOf(next),
    later: later.map(tileOf),
  };
};
