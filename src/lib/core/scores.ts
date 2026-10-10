// Scores: what a Score is, how a Piece's Scores are listed and who may do what with them, and the
// small decisions of the page viewer (which way a tap, swipe or key turns the page, and how the page
// is fitted). See Score in CONTEXT.md. What an upload may be is in upload-rules.ts, and why a change
// was refused is in score-problems.ts.
import type { Permission } from './permissions';
import { tidyText } from './pieces';

declare const scoreIdBrand: unique symbol;

/** The id of a Score: a UUID. */
export type ScoreId = string & { readonly [scoreIdBrand]: true };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isScoreId = (value: unknown): value is ScoreId =>
  typeof value === 'string' && uuidPattern.test(value);

/** `raw` as a Score id if it is a UUID, otherwise null. */
export const scoreIdOf = (raw: string): ScoreId | null => (isScoreId(raw) ? raw : null);

/** A Score as the Piece page lists it. */
export type Score = {
  readonly id: ScoreId;
  /** 1 to `scoreLabelMaxLength` characters. */
  readonly label: string;
  /** The one Score the choir treats as its own; a Piece has at most one. */
  readonly isChoirScore: boolean;
};

export const scoreLabelMaxLength = 60;

/** The Scores with the choir score first and the rest in the order they were uploaded. */
export const scoreOrder = (scores: readonly Score[]): readonly Score[] => [
  ...scores.filter(({ isChoirScore }) => isChoirScore),
  ...scores.filter(({ isChoirScore }) => !isChoirScore),
];

/** The Piece's choir score, if it has one. */
export const choirScoreOf = (scores: readonly Score[]): Score | undefined =>
  scores.find(({ isChoirScore }) => isChoirScore);

/** Whether Upload Score is shown: adding one needs `append`. */
export const mayUploadScore = (held: readonly Permission[]): boolean => held.includes('append');

export type ScoreAction = 'rename' | 'make-choir' | 'delete';

/** The row actions a Singer holding these Permissions is shown: Rename and Make this the choir score need `update`, Delete `delete`. */
export const scoreActionsFor = (held: readonly Permission[]): readonly ScoreAction[] => [
  ...(held.includes('update') ? (['rename', 'make-choir'] as const) : []),
  ...(held.includes('delete') ? (['delete'] as const) : []),
];

/**
 * What "make this the choir score" does in the upload dialog. A Piece with no choir score lets any
 * uploader mark one, and it starts ticked. Replacing an existing one needs `update`, so without it
 * the choice is not offered; with it the choice is offered and starts unticked.
 */
export type ChoirChoice = 'on' | 'off' | 'unavailable';

export const choirChoiceAtUpload = (
  held: readonly Permission[],
  scores: readonly Score[],
): ChoirChoice => {
  if (choirScoreOf(scores) === undefined) return 'on';
  return held.includes('update') ? 'off' : 'unavailable';
};

const extensionPattern = /\.[^./\\]*$/;

/** A label for a chosen file: its name without the extension, tidied and cut to the label limit. */
export const defaultScoreLabel = (fileName: string): string =>
  tidyText(tidyText(fileName).replace(extensionPattern, '')).slice(0, scoreLabelMaxLength).trim();

export type PageDirection = 'forward' | 'back';

/** The page after turning `direction`, kept within 1 and `count`. A remembered page past the end is brought back in. */
export const pageAfter = (page: number, count: number, direction: PageDirection): number => {
  const last = Math.max(count, 1);
  const next = direction === 'forward' ? page + 1 : page - 1;
  return Math.max(1, Math.min(next, last));
};

/** A tap on the right half turns forward and on the left half back. */
export const tapDirection = (x: number, width: number): PageDirection =>
  x > width / 2 ? 'forward' : 'back';

const swipeDistance = 50;

/** A swipe left turns forward and right back; a short or mostly vertical movement turns nothing. */
export const swipeDirection = (dx: number, dy: number): PageDirection | null => {
  if (Math.abs(dx) < swipeDistance || Math.abs(dy) > Math.abs(dx)) return null;
  return dx < 0 ? 'forward' : 'back';
};

const keyDirections: Readonly<Record<string, PageDirection>> = {
  ArrowRight: 'forward',
  ArrowDown: 'forward',
  PageDown: 'forward',
  ArrowLeft: 'back',
  ArrowUp: 'back',
  PageUp: 'back',
};

/** The arrow keys and Page Up / Down turn pages. */
export const keyDirection = (key: string): PageDirection | null => keyDirections[key] ?? null;

/** The page each Score was last on this session, by Score id. Pages start at 1. */
export type RememberedPages = Readonly<Record<string, number>>;

export const rememberedPage = (pages: RememberedPages, score: ScoreId): number => pages[score] ?? 1;

export const rememberPage = (
  pages: RememberedPages,
  score: ScoreId,
  page: number,
): RememberedPages => ({ ...pages, [score]: page });

/** A width and a height, in CSS pixels or PDF points. */
export type Size = { readonly width: number; readonly height: number };

/** The scale that fits a whole page inside the space, by the tighter side. Always above zero. */
export const fitScale = (page: Size, space: Size): number => {
  const scale = Math.min(
    space.width / Math.max(page.width, 1),
    space.height / Math.max(page.height, 1),
  );
  return scale > 0 ? scale : 0.01;
};
