// Why a change to a Practice Track was not made, and what the screens say about it.
import { trackLabelMaxLength } from './practice-tracks';
import type { DatabaseRefusal } from './voice-parts';

export type TrackProblem =
  'not-allowed' | 'no-kind' | 'label-too-long' | 'no-file' | 'gone' | 'invalid' | 'failed';

export const trackMessages: Readonly<Record<TrackProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  'no-kind': 'Choose whether the track is part-only or part-predominant.',
  'label-too-long': `A label is up to ${trackLabelMaxLength.toString()} characters.`,
  'no-file': 'The file did not arrive. Try uploading it again.',
  gone: 'That Practice Track no longer exists.',
  invalid: 'That track could not be saved. Check the Voice Part, kind and label.',
  failed: 'That did not work. Try again in a moment.',
};

/** Which problem a refusal from the Practice Track functions means. */
export const trackProblemOf = ({ code, hint }: DatabaseRefusal): TrackProblem => {
  if (code === '42501') return 'not-allowed';
  if (code === 'P0002') return 'gone';
  if (code === '22023' && hint === 'kind') return 'no-kind';
  if (code === '22023' && hint === 'label') return 'label-too-long';
  if (code === '22023' && hint === 'file') return 'no-file';
  if (code === '22023' || code === '23505') return 'invalid';
  return 'failed';
};
