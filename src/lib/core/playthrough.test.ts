import { describe, expect, it } from 'vitest';
import {
  choiceOptions,
  chooseTrack,
  defaultChoice,
  trackForChoice,
  resolvePlaythrough,
  whatYouWouldHear,
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
  // One Performance covering every Piece shape: what each Piece plays (or `-` for nothing),
  // for each combination of the two options.
  const performance: readonly PlaythroughPiece[] = [
    { id: 'both', tracks: [part('both-alto', alto), combined('both-all')] },
    { id: 'none', tracks: [] },
    { id: 'combined', tracks: [combined('combined-all')] },
    { id: 'alto-only', tracks: [part('alto-only-alto', alto)] },
    { id: 'alto-mix', tracks: [part('alto-mix-alto', alto, 'part-predominant')] },
    { id: 'tenor', tracks: [part('tenor-tenor', tenor)] },
  ];

  it.each([
    {
      skipEmpty: false,
      preferVoicePart: false,
      heard: ['both-all', '-', 'combined-all', 'alto-only-alto', 'alto-mix-alto', '-'],
      skipped: [false, false, false, false, false, false],
    },
    {
      skipEmpty: false,
      preferVoicePart: true,
      heard: ['both-alto', '-', 'combined-all', 'alto-only-alto', 'alto-mix-alto', '-'],
      skipped: [false, false, false, false, false, false],
    },
    {
      skipEmpty: true,
      preferVoicePart: false,
      heard: ['both-all', '-', 'combined-all', 'alto-only-alto', 'alto-mix-alto', '-'],
      skipped: [false, true, false, false, false, true],
    },
    {
      skipEmpty: true,
      preferVoicePart: true,
      heard: ['both-alto', '-', 'combined-all', 'alto-only-alto', 'alto-mix-alto', '-'],
      skipped: [false, true, false, false, false, true],
    },
  ])(
    'with skip-empty $skipEmpty and prefer-my-Voice-Part $preferVoicePart, keeps every Piece in order',
    ({ heard, skipped, ...options }) => {
      const entries = resolvePlaythrough(performance, alto, options);

      expect(entries.map(({ pieceId }) => pieceId)).toEqual(performance.map(({ id }) => id));
      expect(entries.map(({ track }) => track?.id ?? '-')).toEqual(heard);
      expect(entries.map((entry) => entry.skipped)).toEqual(skipped);
    },
  );

  it('answers nothing for an empty Performance', () => {
    expect(resolvePlaythrough([], alto, { skipEmpty: true, preferVoicePart: true })).toEqual([]);
  });
});

describe('trackForChoice', () => {
  const tracks = [part('a-alto', alto), part('a-tenor', tenor), combined('a-all')];

  it('plays the default with no choice made, honouring prefer-my-Voice-Part', () => {
    expect(trackForChoice(tracks, alto, defaultChoice, false)?.id).toBe('a-all');
    expect(trackForChoice(tracks, alto, defaultChoice, true)?.id).toBe('a-alto');
  });

  it('plays the Combined Track or the chosen part once, whatever the option', () => {
    expect(trackForChoice(tracks, alto, { type: 'combined' }, true)?.id).toBe('a-all');
    expect(trackForChoice(tracks, alto, { type: 'part', voicePartId: tenor }, false)?.id).toBe(
      'a-tenor',
    );
  });

  it('plays nothing for a part the Piece has no track for', () => {
    expect(
      trackForChoice(tracks, alto, { type: 'part', voicePartId: 'part-bass' }, false),
    ).toBeUndefined();
    expect(trackForChoice([part('x', alto)], alto, { type: 'combined' }, false)).toBeUndefined();
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

describe('whatYouWouldHear', () => {
  const nameOf = (voicePartId: string) => (voicePartId === alto ? 'Alto' : 'Tenor');

  it.each([
    ['the Combined Track when there is one', [part('p', alto), combined('c')], 'All'],
    ['the part-only track when there is no Combined Track', [part('p', alto)], 'Alto only'],
    [
      'the part-predominant track the same way',
      [part('p', alto, 'part-predominant')],
      'Alto + mix',
    ],
  ])('says it plays %s', (_name, tracks, text) => {
    expect(whatYouWouldHear(tracks, alto, nameOf, false)).toEqual({ text, playable: true });
  });

  it('says it plays the Singer part over the Combined Track when they prefer their Voice Part', () => {
    expect(whatYouWouldHear([part('p', alto), combined('c')], alto, nameOf, true)).toEqual({
      text: 'Alto only',
      playable: true,
    });
  });

  it('says a Singer with no Voice Part hears the Combined Track, or that there is none', () => {
    expect(whatYouWouldHear([part('p', alto), combined('c')], null, nameOf, true)).toEqual({
      text: 'All',
      playable: true,
    });
    expect(whatYouWouldHear([part('p', alto)], null, nameOf, false)).toEqual({
      text: 'No Combined track',
      playable: false,
    });
  });

  it('says a Piece with no Practice Tracks has none yet', () => {
    expect(whatYouWouldHear([], alto, nameOf, false)).toEqual({
      text: 'No tracks yet',
      playable: false,
    });
  });

  it('says when a Piece has tracks but none the Singer would hear', () => {
    expect(whatYouWouldHear([part('t', tenor)], alto, nameOf, true)).toEqual({
      text: 'No Alto track',
      playable: false,
    });
  });
});
