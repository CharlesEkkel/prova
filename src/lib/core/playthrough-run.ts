// Play-through run: pure core. Where a Play-through is in a Performance's running order, and where
// each of the Singer's moves takes it. A track ending and Continue are both `next`. The entries come
// from `resolvePlaythrough` with the options in force at the time of the move, so a change of options
// applies from the next Piece, while the Piece the run is at keeps the entry it arrived with.
import { firstStop, isStop, type PlaythroughEntry, type PlaythroughPiece } from './playthrough';
import type { PieceSummary } from './pieces';
import type { PracticeTrack } from './practice-tracks';
import type { Score } from './scores';

/** A Piece as the Play-through player has it: its Practice Tracks to play and its choir score, if any. */
export type RunPiece = PieceSummary & {
  readonly tracks: readonly PracticeTrack[];
  readonly choirScore: Score | null;
};

/**
 * Where a Play-through is: at a Piece (playing it, or paused there), finished after the last, or
 * with nothing to play at all. `take` goes up on every move, so the player can tell a restart of
 * the same Piece from staying put.
 */
export type RunState<P extends PlaythroughPiece = PlaythroughPiece> =
  | { readonly kind: 'nothing' }
  | {
      readonly kind: 'at';
      /** The Piece's place in the running order, from 0. */
      readonly index: number;
      readonly entry: PlaythroughEntry<P>;
      readonly take: number;
    }
  | { readonly kind: 'finished'; readonly take: number };

export type RunEvent =
  /** The track ended, or the Singer pressed Continue or next Piece. */
  | { readonly type: 'next' }
  /** The Singer pressed previous Piece, this far into the track. */
  | { readonly type: 'previous'; readonly playedSeconds: number }
  /** The Singer tapped a Piece in the running order. */
  | { readonly type: 'jump'; readonly index: number }
  /** The Singer pressed Play it again. */
  | { readonly type: 'restart' };

/** How far into a Piece previous Piece restarts it instead of going back. */
export const restartAfterSeconds = 3;

const takeOf = (state: RunState): number => (state.kind === 'nothing' ? 0 : state.take);

/** At the entry at `index`; a skipped Piece the Singer jumped to is paused at instead. */
const arriveAt = <P extends PlaythroughPiece>(
  entries: readonly PlaythroughEntry<P>[],
  index: number,
  take: number,
): RunState<P> => {
  const entry = entries[index];
  if (entry === undefined) return { kind: 'finished', take };
  return {
    kind: 'at',
    index,
    entry:
      entry.kind === 'skip' ? { kind: 'pause', piece: entry.piece, heard: entry.heard } : entry,
    take,
  };
};

/** The first stop at or after `from`, if any. */
const stopFrom = <P extends PlaythroughPiece>(
  entries: readonly PlaythroughEntry<P>[],
  from: number,
): number | undefined => {
  const found = entries.slice(from).findIndex(isStop);
  return found === -1 ? undefined : from + found;
};

/** The last stop before `before`, if any. */
const stopBefore = <P extends PlaythroughPiece>(
  entries: readonly PlaythroughEntry<P>[],
  before: number,
): number | undefined => {
  const found = entries.slice(0, before).findLastIndex(isStop);
  return found === -1 ? undefined : found;
};

/** A Play-through as it starts: at its first stop, or with nothing to play. */
export const startRun = <P extends PlaythroughPiece>(
  entries: readonly PlaythroughEntry<P>[],
  take = 1,
): RunState<P> => {
  const first = stopFrom(entries, 0);
  return first === undefined ? { kind: 'nothing' } : arriveAt(entries, first, take);
};

const next = <P extends PlaythroughPiece>(
  state: RunState<P>,
  entries: readonly PlaythroughEntry<P>[],
): RunState<P> => {
  if (state.kind !== 'at') return state;
  const found = stopFrom(entries, state.index + 1);
  return found === undefined
    ? { kind: 'finished', take: state.take + 1 }
    : arriveAt(entries, found, state.take + 1);
};

const previous = <P extends PlaythroughPiece>(
  state: RunState<P>,
  playedSeconds: number,
  entries: readonly PlaythroughEntry<P>[],
): RunState<P> => {
  if (state.kind !== 'at') return state;
  const restart = { ...state, take: state.take + 1 };
  if (playedSeconds > restartAfterSeconds) return restart;
  const found = stopBefore(entries, state.index);
  return found === undefined ? restart : arriveAt(entries, found, state.take + 1);
};

/** Where the Singer's move takes the Play-through, with the options in force now. */
export const advanceRun = <P extends PlaythroughPiece>(
  state: RunState<P>,
  event: RunEvent,
  entries: readonly PlaythroughEntry<P>[],
): RunState<P> => {
  switch (event.type) {
    case 'next':
      return next(state, entries);
    case 'previous':
      return previous(state, event.playedSeconds, entries);
    case 'jump':
      return entries[event.index] === undefined
        ? state
        : arriveAt(entries, event.index, takeOf(state) + 1);
    case 'restart':
      return startRun(entries, takeOf(state) + 1);
  }
};

/** Whether a move kept the run on the same Piece (previous after 3 seconds, or a jump to it), so a play-once choice stays. */
export const isRestart = (before: RunState, after: RunState): boolean =>
  before.kind === 'at' && after.kind === 'at' && before.index === after.index;

/** The Piece the Play-through stops at after this one, or nothing when this is the last. */
export const upNext = <P extends PlaythroughPiece>(
  state: RunState<P>,
  entries: readonly PlaythroughEntry<P>[],
): PlaythroughEntry<P> | undefined =>
  state.kind === 'at' ? firstStop(entries.slice(state.index + 1)) : undefined;
