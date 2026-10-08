import { error, fail, redirect } from '@sveltejs/kit';
import { nextParam, safeNextPath } from '../../lib/core/gate';
import { failureOrNull, valueOrNull } from '../../lib/shell/run';
import {
  loadVoiceParts,
  saveVoicePartChoice,
  type VoicePartProblem,
} from '../../lib/shell/voice-parts';
import type { Actions, PageServerLoad } from './$types';

const voicePartProblemMessages: Readonly<Record<VoicePartProblem, string>> = {
  'none-chosen': 'Choose your Voice Part to continue.',
  unavailable: 'That Voice Part is not available. Choose another.',
};

export const load: PageServerLoad = async ({ locals }) => {
  const voiceParts = await valueOrNull(loadVoiceParts(locals.supabase));
  if (voiceParts === null) {
    error(503, 'The Voice Parts could not be loaded. Try again in a moment.');
  }
  return { voiceParts };
};

export const actions: Actions = {
  default: async ({ locals, request, url }) => {
    const problem = await failureOrNull(saveVoicePartChoice(locals.supabase, request));
    return problem === null
      ? redirect(303, safeNextPath(url.searchParams.get(nextParam)))
      : fail(400, { problem: voicePartProblemMessages[problem] });
  },
};
