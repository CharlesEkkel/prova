import type { PageServerLoad } from './$types';

// The gate only lets a Pending Singer here, so the Singer and Voice Part are always present.
export const load: PageServerLoad = ({ locals }) => ({
  displayName: locals.session.singer?.displayName ?? '',
  email: locals.session.singer?.email ?? '',
  voicePartName: locals.session.voicePart?.name ?? '',
});
