// Why a change to a Score was not made, and what the screens say about it.
import { scoreLabelMaxLength } from './scores';
import type { DatabaseRefusal } from './voice-parts';

export type ScoreProblem = 'not-allowed' | 'bad-label' | 'no-file' | 'gone' | 'invalid' | 'failed';

export const scoreMessages: Readonly<Record<ScoreProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  'bad-label': `A label is 1 to ${scoreLabelMaxLength.toString()} characters.`,
  'no-file': 'The file did not arrive. Try uploading it again.',
  gone: 'That Score no longer exists.',
  invalid: 'That Score could not be saved. Check the label and try again.',
  failed: 'That did not work. Try again in a moment.',
};

/** Which problem a refusal from the Score functions means. */
export const scoreProblemOf = ({ code, hint }: DatabaseRefusal): ScoreProblem => {
  if (code === '42501') return 'not-allowed';
  if (code === 'P0002') return 'gone';
  if (code === '22023' && hint === 'label') return 'bad-label';
  if (code === '22023' && hint === 'file') return 'no-file';
  if (code === '22023' || code === '23505') return 'invalid';
  return 'failed';
};
