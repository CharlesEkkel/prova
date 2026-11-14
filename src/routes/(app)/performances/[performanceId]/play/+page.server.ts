import { error, redirect } from '@sveltejs/kit';
import { Effect } from 'effect';
import { homeOverviewPath, paths, playthroughOptionsOf } from '../../../../../lib/core/paths';
import { performanceIdOf } from '../../../../../lib/core/performances';
import { choirScoreOf } from '../../../../../lib/core/scores';
import { loadOverview } from '../../../../../lib/shell/performances';
import { loadTracks } from '../../../../../lib/shell/practice-tracks';
import { valueOrNull } from '../../../../../lib/shell/run';
import { loadScores } from '../../../../../lib/shell/scores';
import { loadVoiceParts } from '../../../../../lib/shell/voice-parts';
import type { PageServerLoad } from './$types';

const unavailable = 'The Play-through could not be loaded. Try again in a moment.';

// The Play-through player: a Performance's Pieces in running order, each with its Practice Tracks
// and choir score, as they are now. The run plays these and does not reload them as it goes.
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
  if (loaded === null || voiceParts === null) error(503, unavailable);
  const { performance } = loaded;
  if (performance === null) error(404, 'There is no such Performance.');

  // The player needs each track's length and label, and each Piece's Scores, beyond what the
  // running order carries.
  const pieces = await valueOrNull(
    Effect.all(
      performance.pieces.map(({ id: pieceId, title, composer }) =>
        Effect.all([loadTracks(supabase, pieceId), loadScores(supabase, pieceId)]).pipe(
          Effect.map(([tracks, scores]) => ({
            id: pieceId,
            title,
            composer,
            tracks,
            choirScore: choirScoreOf(scores) ?? null,
          })),
        ),
      ),
      { concurrency: 'unbounded' },
    ),
  );
  if (pieces === null) error(503, unavailable);

  return {
    performance: { id, name: performance.name },
    pieces,
    voiceParts,
    voicePartId: visitor.voicePart.id,
    options: playthroughOptionsOf(url.searchParams),
    overview: homeOverviewPath(id),
  };
};
