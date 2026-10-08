import { error } from '@sveltejs/kit';
import { formActions } from '../../../../lib/core/paths';
import {
  addVoicePart,
  removeVoicePart,
  reorderVoiceParts,
  runVoicePartAction,
  updateVoicePart,
} from '../../../../lib/shell/voice-part-commands';
import { valueOrNull } from '../../../../lib/shell/run';
import { loadAdminVoiceParts } from '../../../../lib/shell/voice-parts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const voiceParts = await valueOrNull(loadAdminVoiceParts(locals.supabase));
  if (voiceParts === null) {
    error(503, 'The Voice Parts could not be loaded. Try again in a moment.');
  }
  return { voiceParts };
};

export const actions: Actions = {
  [formActions.voiceParts.add]: ({ locals, request }) =>
    runVoicePartAction(addVoicePart, locals.supabase, request),
  [formActions.voiceParts.update]: ({ locals, request }) =>
    runVoicePartAction(updateVoicePart, locals.supabase, request),
  [formActions.voiceParts.reorder]: ({ locals, request }) =>
    runVoicePartAction(reorderVoiceParts, locals.supabase, request),
  [formActions.voiceParts.remove]: ({ locals, request }) =>
    runVoicePartAction(removeVoicePart, locals.supabase, request),
};
