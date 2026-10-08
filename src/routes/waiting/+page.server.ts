import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals: { visitor } }) => {
  // The gate sends only a Pending Singer here; anyone else goes back through it.
  if (visitor.stage !== 'pending') redirect(303, '/');
  return {
    displayName: visitor.singer.displayName,
    email: visitor.singer.email,
    voicePartName: visitor.voicePart.name,
  };
};
