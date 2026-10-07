import { error, fail, redirect } from '@sveltejs/kit';
import { safeNextPath } from '../../lib/core/gate';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data, error: failure } = await locals.supabase
    .from('voice_parts')
    .select('id, name, short_label')
    .order('position');
  if (failure !== null) error(503, 'The Voice Parts could not be loaded. Try again in a moment.');
  return { voiceParts: data };
};

export const actions: Actions = {
  default: async ({ locals, request, url }) => {
    const chosen = (await request.formData()).get('voice_part');
    if (typeof chosen !== 'string' || chosen === '') {
      return fail(400, { problem: 'Choose your Voice Part to continue.' });
    }

    const { error: failure } = await locals.supabase.rpc('set_my_default_voice_part', { chosen });
    if (failure !== null) {
      return fail(400, { problem: 'That Voice Part is not available. Choose another.' });
    }
    return redirect(303, safeNextPath(url.searchParams.get('next')));
  },
};
