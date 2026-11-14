import { error, redirect } from '@sveltejs/kit';
import { Effect } from 'effect';
import { homeOverviewPath, paths, playthroughOptionsOf } from '../../../../../lib/core/paths';
import { performanceIdOf } from '../../../../../lib/core/performances';
import { firstStop, resolvePlaythrough } from '../../../../../lib/core/playthrough';
import { partNamesOf } from '../../../../../lib/core/practice-tracks';
import { loadOverview } from '../../../../../lib/shell/performances';
import { valueOrNull } from '../../../../../lib/shell/run';
import { loadVoiceParts } from '../../../../../lib/shell/voice-parts';
import type { PageServerLoad } from './$types';

// A stand-in for the Play-through player (#24): it shows what the Overview's Play button started,
// so the hand-over from the Overview is in place before the player is.
export const load: PageServerLoad = async ({ locals: { visitor, supabase }, params, url }) => {
  // The gate lets only a ready Singer in here; anyone else goes back through it.
  if (visitor.stage !== 'ready') redirect(303, paths.home);
  const id = performanceIdOf(params.performanceId);
  if (id === null) error(404, 'There is no such Performance.');

  const [loaded, voiceParts] = await Promise.all([
    // Wrapped, so a failed load (null) is told apart from a Performance that is not there.
    valueOrNull(loadOverview(supabase, id).pipe(Effect.map((performance) => ({ performance })))),
    valueOrNull(loadVoiceParts(supabase)),
  ]);
  if (loaded === null || voiceParts === null) {
    error(503, 'The Performance could not be loaded. Try again in a moment.');
  }
  const { performance } = loaded;
  if (performance === null) error(404, 'There is no such Performance.');

  const options = playthroughOptionsOf(url.searchParams);
  const entries = resolvePlaythrough(
    performance.pieces,
    visitor.voicePart.id,
    partNamesOf(voiceParts),
    options,
  );
  const first = firstStop(entries);

  return {
    name: performance.name,
    options,
    first: first === undefined ? null : { title: first.piece.title, heard: first.heard.text },
    overview: homeOverviewPath(id),
  };
};
