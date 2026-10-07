import { describe, expect, it } from 'vitest';
import { resolvePlaythrough, type PlaythroughPiece } from './playthrough';

const piece = (id: string, tracks: PlaythroughPiece['tracks']): PlaythroughPiece => ({
  id,
  tracks,
});

const pieces: readonly PlaythroughPiece[] = [
  piece('a', [
    { id: 'a-alto', voicePart: 'alto' },
    { id: 'a-all', voicePart: 'combined' },
  ]),
  piece('b', []),
  piece('c', [{ id: 'c-all', voicePart: 'combined' }]),
];

describe('resolvePlaythrough', () => {
  it('plays the singer part, falling back to the combined track, and pauses at an empty piece', () => {
    const steps = resolvePlaythrough(pieces, 'alto', { skipEmpty: false, preferCombined: false });
    expect(steps).toEqual([
      { kind: 'play', pieceId: 'a', trackId: 'a-alto' },
      { kind: 'pause', pieceId: 'b' },
      { kind: 'play', pieceId: 'c', trackId: 'c-all' },
    ]);
  });

  it('skips pieces with no usable track when asked', () => {
    const steps = resolvePlaythrough(pieces, 'alto', { skipEmpty: true, preferCombined: false });
    expect(steps.map((s) => s.pieceId)).toEqual(['a', 'c']);
  });

  it('prefers the combined track when asked', () => {
    const steps = resolvePlaythrough(pieces, 'alto', { skipEmpty: true, preferCombined: true });
    expect(steps).toEqual([
      { kind: 'play', pieceId: 'a', trackId: 'a-all' },
      { kind: 'play', pieceId: 'c', trackId: 'c-all' },
    ]);
  });
});
