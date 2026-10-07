import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals: { session } }) => {
  // The gate sends only a Pending Singer here; anyone else goes back through it.
  if (session.stage !== 'pending') redirect(303, '/');
  return {
    displayName: session.singer.displayName,
    email: session.singer.email,
    voicePartName: session.voicePart.name,
  };
};
