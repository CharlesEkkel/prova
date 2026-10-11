import { error, redirect } from '@sveltejs/kit';
import { paths } from '../../lib/core/paths';
import { homeTimeline } from '../../lib/core/performances';
import { whatYouWouldHear } from '../../lib/core/playthrough';
import {
  loadHomePerformances,
  type HomePerformance,
  type HomeTile,
} from '../../lib/shell/performances';
import { valueOrNull } from '../../lib/shell/run';
import { loadVoiceParts } from '../../lib/shell/voice-parts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { visitor, supabase } }) => {
  // The gate lets only a ready Singer in here; anyone else goes back through it.
  if (visitor.stage !== 'ready') redirect(303, paths.home);
  const [performances, voiceParts] = await Promise.all([
    valueOrNull(loadHomePerformances(supabase)),
    valueOrNull(loadVoiceParts(supabase)),
  ]);
  if (performances === null || voiceParts === null) {
    error(503, 'The Performances could not be loaded. Try again in a moment.');
  }

  const nameOf = (voicePartId: string): string =>
    voiceParts.find(({ id }) => id === voicePartId)?.name ?? '';
  const tileOf = ({ pieces, ...performance }: HomePerformance): HomeTile => ({
    ...performance,
    pieces: pieces.map(({ tracks, ...piece }) => ({
      ...piece,
      heard: whatYouWouldHear(tracks, visitor.voicePart.id, nameOf),
    })),
  });
  const { past, next, later } = homeTimeline(performances, new Date());

  return {
    past: past.map(tileOf),
    next: next === null ? null : tileOf(next),
    later: later.map(tileOf),
  };
};
