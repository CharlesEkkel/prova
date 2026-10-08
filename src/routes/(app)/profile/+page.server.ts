import { error, fail, redirect } from '@sveltejs/kit';
import { safeNextPath } from '../../../lib/core/gate';
import { nextParam } from '../../../lib/core/paths';
import { failureOrNull, valueOrNull } from '../../../lib/shell/run';
import {
  loadVoiceParts,
  saveVoicePartChoice,
  voicePartChoiceMessages,
} from '../../../lib/shell/voice-parts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { visitor } = locals;
  // The app layout already sends anyone who is not ready back through the gate.
  if (visitor.stage !== 'ready') error(403, 'Sign in to change your Voice Part.');
  const voiceParts = await valueOrNull(loadVoiceParts(locals.supabase));
  if (voiceParts === null) {
    error(503, 'The Voice Parts could not be loaded. Try again in a moment.');
  }
  return { voiceParts, currentVoicePartId: visitor.voicePart.id };
};

export const actions: Actions = {
  default: async ({ locals, request, url }) => {
    const problem = await failureOrNull(saveVoicePartChoice(locals.supabase, request));
    return problem === null
      ? redirect(303, safeNextPath(url.searchParams.get(nextParam)))
      : fail(400, { problem: voicePartChoiceMessages[problem] });
  },
};
