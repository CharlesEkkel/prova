import { describe, expect, it } from 'vitest';
import { resolvePlaythrough, type PlaythroughPiece, type PlaythroughTrack } from './playthrough';
import { combinedSource } from './practice-tracks';
import { advanceRun, startRun, upNext, type RunState } from './playthrough-run';

const alto = 'part-alto';
const nameOf = () => 'Alto';

const combined = (id: string): PlaythroughTrack => ({ id, source: combinedSource });
const altoPart = (id: string): PlaythroughTrack => ({
  id,
  source: { type: 'part', voicePartId: alto, kind: 'part-only' },
});

// A running order with an empty Piece in the middle and one at the end.
const pieces: readonly PlaythroughPiece[] = [
  { id: 'one', tracks: [combined('one-all'), altoPart('one-alto')] },
  { id: 'empty', tracks: [] },
  { id: 'three', tracks: [combined('three-all')] },
  { id: 'last-empty', tracks: [] },
];

const pausing = resolvePlaythrough(pieces, alto, nameOf, {
  skipEmpty: false,
  preferVoicePart: false,
});
const skipping = resolvePlaythrough(pieces, alto, nameOf, {
  skipEmpty: true,
  preferVoicePart: false,
});

/** Where the run is: the Piece's id, `finished` or `nothing`. */
const where = (state: RunState): string =>
  state.kind === 'at' ? state.entry.piece.id : state.kind;

describe('startRun', () => {
  it('starts at the first Piece, even an empty one it will pause at', () => {
    const emptyFirst = resolvePlaythrough(
      [
        { id: 'empty', tracks: [] },
        { id: 'three', tracks: [combined('three-all')] },
      ],
      alto,
      nameOf,
      { skipEmpty: false, preferVoicePart: false },
    );

    expect(where(startRun(pausing))).toBe('one');
    expect(where(startRun(emptyFirst))).toBe('empty');
  });

  it('has nothing to play when every Piece is skipped, or there are none', () => {
    const allEmpty = resolvePlaythrough([{ id: 'empty', tracks: [] }], alto, nameOf, {
      skipEmpty: true,
      preferVoicePart: false,
    });

    expect(where(startRun(allEmpty))).toBe('nothing');
    expect(where(startRun([]))).toBe('nothing');
  });
});

describe('advanceRun: next', () => {
  it('goes Piece by Piece, pausing at each empty one, then finishes after the last', () => {
    const visited = [startRun(pausing)];
    for (let step = 0; step < 4; step += 1) {
      const last = visited.at(-1);
      if (last === undefined) throw new Error('the run has started');
      visited.push(advanceRun(last, { type: 'next' }, pausing));
    }

    expect(visited.map(where)).toEqual(['one', 'empty', 'three', 'last-empty', 'finished']);
    expect(visited.map((state) => (state.kind === 'at' ? state.entry.kind : '-'))).toEqual([
      'play',
      'pause',
      'play',
      'pause',
      '-',
    ]);
  });

  it('steps over skipped Pieces, finishing when only skipped ones are left', () => {
    const first = startRun(skipping);
    const second = advanceRun(first, { type: 'next' }, skipping);

    expect(where(second)).toBe('three');
    expect(where(advanceRun(second, { type: 'next' }, skipping))).toBe('finished');
  });

  it('counts a new take each time it arrives somewhere, so the player knows to play', () => {
    const first = startRun(pausing);
    const second = advanceRun(first, { type: 'next' }, pausing);

    expect(second.kind === 'at' && first.kind === 'at' && second.take > first.take).toBe(true);
  });
});

describe('advanceRun: previous', () => {
  const atThree = advanceRun(
    advanceRun(startRun(pausing), { type: 'next' }, pausing),
    { type: 'next' },
    pausing,
  );

  it('restarts the Piece after more than 3 seconds of it have played', () => {
    const restarted = advanceRun(atThree, { type: 'previous', playedSeconds: 3.5 }, pausing);

    expect(where(restarted)).toBe('three');
    expect(restarted.kind === 'at' && atThree.kind === 'at' && restarted.take > atThree.take).toBe(
      true,
    );
  });

  it('goes back a Piece within the first 3 seconds', () => {
    expect(where(advanceRun(atThree, { type: 'previous', playedSeconds: 2 }, pausing))).toBe(
      'empty',
    );
  });

  it('steps back over skipped Pieces', () => {
    const atThreeSkipping = advanceRun(startRun(skipping), { type: 'next' }, skipping);

    expect(
      where(advanceRun(atThreeSkipping, { type: 'previous', playedSeconds: 0 }, skipping)),
    ).toBe('one');
  });

  it('restarts the first Piece, since there is none before it', () => {
    const first = startRun(pausing);
    const again = advanceRun(first, { type: 'previous', playedSeconds: 0 }, pausing);

    expect(where(again)).toBe('one');
    expect(again.kind === 'at' && first.kind === 'at' && again.take > first.take).toBe(true);
  });

  it('goes back to the last stop from the finished state', () => {
    const finished = advanceRun(
      advanceRun(atThree, { type: 'next' }, pausing),
      { type: 'next' },
      pausing,
    );

    expect(where(finished)).toBe('finished');
    expect(where(advanceRun(finished, { type: 'previous', playedSeconds: 0 }, pausing))).toBe(
      'last-empty',
    );
  });
});

describe('advanceRun: jump', () => {
  it('goes to the tapped Piece, and pauses at a skipped one rather than passing it', () => {
    const jumped = advanceRun(startRun(skipping), { type: 'jump', index: 1 }, skipping);

    expect(where(jumped)).toBe('empty');
    expect(jumped.kind === 'at' && jumped.entry.kind).toBe('pause');
  });

  it('ignores a Piece that is not in the running order', () => {
    const first = startRun(pausing);

    expect(advanceRun(first, { type: 'jump', index: 9 }, pausing)).toBe(first);
  });
});

describe('advanceRun: restart', () => {
  it('plays it again from the first stop, with the options in force now', () => {
    const finished = advanceRun(
      advanceRun(startRun(skipping), { type: 'next' }, skipping),
      { type: 'next' },
      skipping,
    );

    expect(where(advanceRun(finished, { type: 'restart' }, pausing))).toBe('one');
  });
});

describe('options changed during a Play-through', () => {
  it('keep the Piece playing as it was, and apply from the next Piece', () => {
    const first = startRun(pausing);
    const preferring = resolvePlaythrough(pieces, alto, nameOf, {
      skipEmpty: true,
      preferVoicePart: true,
    });

    // The current entry still plays the Combined Track; the next move uses the new options.
    expect(first.kind === 'at' && first.entry.kind === 'play' && first.entry.track.id).toBe(
      'one-all',
    );
    expect(where(advanceRun(first, { type: 'next' }, preferring))).toBe('three');
  });
});

describe('upNext', () => {
  it('names the next stop, passing skipped Pieces', () => {
    expect(upNext(startRun(pausing), pausing)?.piece.id).toBe('empty');
    expect(upNext(startRun(skipping), skipping)?.piece.id).toBe('three');
  });

  it('is nothing on the last stop, or once the run is over', () => {
    const atThree = advanceRun(startRun(skipping), { type: 'next' }, skipping);

    expect(upNext(atThree, skipping)).toBeUndefined();
    expect(upNext(advanceRun(atThree, { type: 'next' }, skipping), skipping)).toBeUndefined();
  });
});
