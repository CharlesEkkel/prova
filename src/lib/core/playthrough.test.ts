import { describe, expect, it } from 'vitest';
import {
  choiceOptions,
  chooseTrack,
  defaultChoice,
  trackForChoice,
  resolvePlaythrough,
  type PlaythroughPiece,
  type PlaythroughTrack,
} from './playthrough';
import { combinedSource, type TrackKind } from './practice-tracks';

const alto = 'part-alto';
const tenor = 'part-tenor';

const combined = (id: string): PlaythroughTrack => ({ id, source: combinedSource });
const part = (
  id: string,
  voicePartId: string,
  kind: TrackKind = 'part-only',
): PlaythroughTrack => ({ id, source: { type: 'part', voicePartId, kind } });

const pieces: readonly PlaythroughPiece[] = [
  { id: 'a', tracks: [part('a-alto', alto), combined('a-all')] },
  { id: 'b', tracks: [] },
  { id: 'c', tracks: [combined('c-all')] },
  { id: 'd', tracks: [part('d-alto', alto, 'part-predominant')] },
];

describe('chooseTrack', () => {
  it.each([
    ['both exist', [part('p', alto), combined('c')], 'c', 'p'],
    ['only Combined', [combined('c')], 'c', 'c'],
    ['only the Singer part', [part('p', alto)], 'p', 'p'],
  ])(
    'with %s plays Combined first, or the part first when preferred',
    (_name, tracks, byDefault, preferred) => {
      expect(chooseTrack(tracks, alto, false)?.id).toBe(byDefault);
      expect(chooseTrack(tracks, alto, true)?.id).toBe(preferred);
    },
  );

  it('plays nothing when the Piece has no track for the Singer and no Combined Track', () => {
    expect(chooseTrack([part('t', tenor)], alto, false)).toBeUndefined();
    expect(chooseTrack<PlaythroughTrack>([], alto, true)).toBeUndefined();
  });

  it('uses the first listed when there are several for the same part or several Combined Tracks', () => {
    const tracks = [part('a2', alto), part('a1', alto), combined('c2'), combined('c1')];

    expect(chooseTrack(tracks, alto, false)?.id).toBe('c2');
    expect(chooseTrack(tracks, alto, true)?.id).toBe('a2');
  });

  it('plays a part-predominant track like a part-only one', () => {
    expect(chooseTrack([part('p', alto, 'part-predominant')], alto, false)?.id).toBe('p');
  });

  it('falls back to Combined for a Singer with no Voice Part', () => {
    expect(chooseTrack([part('p', alto), combined('c')], null, true)?.id).toBe('c');
    expect(chooseTrack([part('p', alto)], null, false)).toBeUndefined();
  });
});

describe('resolvePlaythrough', () => {
  it('plays Combined, falls back to the part, and pauses at an empty Piece', () => {
    const steps = resolvePlaythrough(pieces, alto, { skipEmpty: false, preferVoicePart: false });
    expect(steps).toEqual([
      { kind: 'play', pieceId: 'a', trackId: 'a-all' },
      { kind: 'pause', pieceId: 'b' },
      { kind: 'play', pieceId: 'c', trackId: 'c-all' },
      { kind: 'play', pieceId: 'd', trackId: 'd-alto' },
    ]);
  });

  it('skips Pieces with no usable track when asked', () => {
    const steps = resolvePlaythrough(pieces, alto, { skipEmpty: true, preferVoicePart: false });
    expect(steps.map((s) => s.pieceId)).toEqual(['a', 'c', 'd']);
  });

  it('prefers the Singer part when asked', () => {
    const steps = resolvePlaythrough(pieces, alto, { skipEmpty: true, preferVoicePart: true });
    expect(steps).toEqual([
      { kind: 'play', pieceId: 'a', trackId: 'a-alto' },
      { kind: 'play', pieceId: 'c', trackId: 'c-all' },
      { kind: 'play', pieceId: 'd', trackId: 'd-alto' },
    ]);
  });

  it('pauses at a Piece with only another part, and skips it when asked', () => {
    const other: readonly PlaythroughPiece[] = [{ id: 'e', tracks: [part('e-tenor', tenor)] }];

    expect(resolvePlaythrough(other, alto, { skipEmpty: false, preferVoicePart: false })).toEqual([
      { kind: 'pause', pieceId: 'e' },
    ]);
    expect(resolvePlaythrough(other, alto, { skipEmpty: true, preferVoicePart: false })).toEqual(
      [],
    );
  });

  it('answers nothing for an empty Performance', () => {
    expect(resolvePlaythrough([], alto, { skipEmpty: false, preferVoicePart: false })).toEqual([]);
  });
});

describe('trackForChoice', () => {
  const tracks = [part('a-alto', alto), part('a-tenor', tenor), combined('a-all')];

  it('plays the default with no choice made', () => {
    expect(trackForChoice(tracks, alto, defaultChoice)?.id).toBe('a-all');
  });

  it('plays the Combined Track or the chosen part once', () => {
    expect(trackForChoice(tracks, alto, { type: 'combined' })?.id).toBe('a-all');
    expect(trackForChoice(tracks, alto, { type: 'part', voicePartId: tenor })?.id).toBe('a-tenor');
  });

  it('plays nothing for a part the Piece has no track for', () => {
    expect(
      trackForChoice(tracks, alto, { type: 'part', voicePartId: 'part-bass' }),
    ).toBeUndefined();
    expect(trackForChoice([part('x', alto)], alto, { type: 'combined' })).toBeUndefined();
  });
});

describe('choiceOptions', () => {
  it('offers All only with a Combined Track, and each part that has a track', () => {
    const offered = choiceOptions([part('a', alto), part('b', alto), combined('c')]);

    expect(offered.hasCombined).toBe(true);
    expect([...offered.voicePartIds]).toEqual([alto]);
    expect(choiceOptions([part('t', tenor)]).hasCombined).toBe(false);
    expect(choiceOptions([]).voicePartIds.size).toBe(0);
  });
});
