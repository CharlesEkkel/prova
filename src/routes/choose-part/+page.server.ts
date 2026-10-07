import { error, fail, redirect } from '@sveltejs/kit';
import { Effect } from 'effect';
import { safeNextPath } from '../../lib/core/gate';
import { failureOrNull, valueOrNull } from '../../lib/shell/run';
import { chooseVoicePart, loadVoiceParts, readVoicePartChoice } from '../../lib/shell/voice-parts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const voiceParts = await valueOrNull(loadVoiceParts(locals.supabase));
  if (voiceParts === null) {
    error(503, 'The Voice Parts could not be loaded. Try again in a moment.');
  }
  return { voiceParts };
};

export const actions: Actions = {
  default: async ({ locals, request, url }) => {
    const problem = await failureOrNull(
      readVoicePartChoice(request).pipe(
        Effect.mapError(() => 'Choose your Voice Part to continue.'),
        Effect.flatMap((chosen) =>
          chooseVoicePart(locals.supabase, chosen).pipe(
            Effect.mapError(() => 'That Voice Part is not available. Choose another.'),
          ),
        ),
      ),
    );
    return problem === null
      ? redirect(303, safeNextPath(url.searchParams.get('next')))
      : fail(400, { problem });
  },
};
