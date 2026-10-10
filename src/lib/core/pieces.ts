// The Repertoire's Pieces: how one is identified, what the list shows and what the screens say when
// a change is refused. See Piece, Conductor's Notes and Repertoire in CONTEXT.md.
import type { DialogCopy } from './admin-dialogs';
import type { Permission } from './permissions';
import type { DatabaseRefusal } from './voice-parts';

declare const pieceIdBrand: unique symbol;

/** The id of a Piece: a UUID. */
export type PieceId = string & { readonly [pieceIdBrand]: true };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isPieceId = (value: unknown): value is PieceId =>
  typeof value === 'string' && uuidPattern.test(value);

/** `raw` as a Piece id if it is a UUID, otherwise null. */
export const pieceIdOf = (raw: string): PieceId | null => (isPieceId(raw) ? raw : null);

/** Title and composer are each 1 to 120 characters, Conductor's Notes up to 2,000. */
export const titleMaxLength = 120;
export const composerMaxLength = 120;
export const notesMaxLength = 2000;

/** A Piece as the Repertoire lists it, with what it holds (all zero until those issues land). */
export type RepertoireEntry = {
  readonly id: PieceId;
  readonly title: string;
  readonly composer: string;
  readonly notes: string;
  readonly practiceTracks: number;
  readonly scores: number;
  readonly performances: number;
};

/** `text` without leading or trailing spaces and with each run of spaces made one. */
export const tidyText = (text: string): string => text.trim().replace(/\s+/g, ' ');

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

const byTitleThenComposer = (a: RepertoireEntry, b: RepertoireEntry): number =>
  collator.compare(a.title, b.title) || collator.compare(a.composer, b.composer);

/** The Repertoire A to Z by title, then by composer. */
export const repertoireOrder = (entries: readonly RepertoireEntry[]): readonly RepertoireEntry[] =>
  entries.toSorted(byTitleThenComposer);

/** Whether the Piece has no Practice Track yet, which the Repertoire marks. */
export const hasNoPracticeTrack = ({ practiceTracks }: RepertoireEntry): boolean =>
  practiceTracks === 0;

/** Whether New Piece is shown: adding a Piece needs `append`. */
export const mayAddPiece = (held: readonly Permission[]): boolean => held.includes('append');

export type PieceAction = 'edit' | 'delete';

/** The row actions a Singer holding these Permissions is shown: Edit needs `update`, Delete `delete`. */
export const pieceActionsFor = (held: readonly Permission[]): readonly PieceAction[] => [
  ...(held.includes('update') ? (['edit'] as const) : []),
  ...(held.includes('delete') ? (['delete'] as const) : []),
];

const plural = (count: number, one: string, many: string): string =>
  `${count.toString()} ${count === 1 ? one : many}`;

/** What deleting a Piece takes with it, as the confirmation says it. The counts are advisory. */
export const removalSummary = ({
  practiceTracks,
  scores,
  performances,
}: Pick<RepertoireEntry, 'practiceTracks' | 'scores' | 'performances'>): string =>
  `It has ${plural(practiceTracks, 'Practice Track', 'Practice Tracks')} and ${plural(scores, 'Score', 'Scores')}, and is in ${plural(performances, 'Performance', 'Performances')}. All of them go with it.`;

/** Why a change to a Piece was not made. */
export type PieceProblem = 'not-allowed' | 'duplicate' | 'invalid' | 'gone' | 'failed';

export const pieceMessages: Readonly<Record<PieceProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  duplicate: 'The Repertoire already has a Piece with that title and composer.',
  invalid: `A title and a composer are each 1 to ${titleMaxLength.toString()} characters and the Conductor’s Notes up to ${notesMaxLength.toLocaleString('en')}.`,
  gone: 'That Piece no longer exists. The Repertoire has been refreshed.',
  failed: 'That did not work. Try again in a moment.',
};

/** Which problem a refusal from the Piece functions means. */
export const pieceProblemOf = ({ code }: DatabaseRefusal): PieceProblem => {
  switch (code) {
    case '42501':
      return 'not-allowed';
    case '23505':
      return 'duplicate';
    case '22023':
      return 'invalid';
    case 'P0002':
      return 'gone';
    default:
      return 'failed';
  }
};

export type PieceDialogKind = 'new' | 'edit' | 'delete';

/** The wording for a dialog about a Piece; delete says what goes with the Piece. */
export const pieceDialogCopy = (
  kind: PieceDialogKind,
  piece: RepertoireEntry | null,
): DialogCopy => {
  switch (kind) {
    case 'new':
      return {
        title: 'New Piece',
        description: 'Add a Piece to the Repertoire. A title and composer pair is added once.',
        submit: 'Add Piece',
      };
    case 'edit':
      return {
        title: 'Edit Piece',
        description: 'Change the title, composer or Conductor’s Notes.',
        submit: 'Save Piece',
      };
    case 'delete':
      return {
        title: `Delete ${piece?.title ?? 'this Piece'}?`,
        description: piece === null ? '' : `${removalSummary(piece)} This cannot be undone.`,
        submit: 'Delete Piece',
      };
  }
};
