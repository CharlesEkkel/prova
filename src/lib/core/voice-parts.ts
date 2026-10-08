// The rules for a choir's Voice Parts: what a short label looks like, what one is suggested from a
// name, and what the screens say when the list refuses a change.

/** A name may be up to this many characters; a short label up to this many letters or digits. */
export const voicePartNameMaxLength = 40;
export const shortLabelMaxLength = 3;

/** The short label the Combined Track has, so no Voice Part may take it. */
export const combinedTrackLabel = 'All';

/** Letters and digits only, one to `shortLabelMaxLength` of them. */
export const shortLabelPattern = `[A-Za-z0-9]{1,${shortLabelMaxLength.toString()}}`;

/** Whether `text` is the Combined Track's label, in any case and with any spacing around it. */
export const isCombinedTrackLabel = (text: string): boolean =>
  text.trim().toLowerCase() === combinedTrackLabel.toLowerCase();

/**
 * The short label a name suggests: its first letter in capitals plus a number it ends with, so
 * Alto 1 becomes A1, Tenor 2 becomes T2 and a plain Alto becomes A. Only a suggestion: the Admin
 * may change it, and renaming a Voice Part later never changes the label it has.
 */
export const suggestShortLabel = (name: string): string => {
  const first = name.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() ?? '';
  const number = name.trim().match(/\d+$/)?.[0] ?? '';
  return `${first}${first === '' ? '' : number}`.slice(0, shortLabelMaxLength);
};

/** Why a change to the Voice Part list was not made. */
export type VoicePartEditProblem =
  | 'not-allowed'
  | 'name-taken'
  | 'label-taken'
  | 'reserved'
  | 'last-one'
  | 'list-changed'
  | 'invalid'
  | 'failed';

export const voicePartEditMessages: Readonly<Record<VoicePartEditProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  'name-taken': 'A Voice Part with that name already exists.',
  'label-taken': 'Another Voice Part already has that short label. Choose a different one.',
  reserved: `${combinedTrackLabel} is reserved for the Combined Track. Choose a different name or short label.`,
  'last-one': 'The last Voice Part cannot be removed.',
  'list-changed':
    'The list of Voice Parts changed while you were looking at it. It has been refreshed. Try again.',
  invalid: `A name is 1 to ${voicePartNameMaxLength.toString()} characters, and a short label is 1 to ${shortLabelMaxLength.toString()} letters or digits.`,
  failed: 'That did not work. Try again in a moment.',
};

/** What the database said when it refused: its error code and, for our rules, a hint naming the rule. */
export type DatabaseRefusal = { readonly code?: string; readonly hint?: string | null };

/** Which problem a refusal from the Voice Part functions means. */
export const voicePartProblemOf = ({ code, hint }: DatabaseRefusal): VoicePartEditProblem => {
  if (code === '42501') return 'not-allowed';
  if (code === '23505') return hint === 'label-taken' ? 'label-taken' : 'name-taken';
  if (code === '22023' && hint === 'reserved') return 'reserved';
  if (code === '22023' && hint === 'last-voice-part') return 'last-one';
  if (code === '22023' && hint === 'stale-list') return 'list-changed';
  return code === '22023' || code === 'P0002' ? 'invalid' : 'failed';
};
