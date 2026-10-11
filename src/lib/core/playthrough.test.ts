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

const byDefault = { preferVoicePart: false };
const preferringPart = { preferVoicePart: true };

describe('chooseTrack', () => {
  it.each([
    ['both exist', [part('p', alto), combined('c')], 'c', 'p'],
    ['only Combined', [combined('c')], 'c', 'c'],
    ['only the Singer part', [part('p', alto)], 'p', 'p'],
  ])(
    'with %s plays Combined first, or the part first when preferred',
    (_name, tracks, playedByDefault, playedPreferringPart) => {
      expect(chooseTrack(tracks, alto, byDefault)?.id).toBe(playedByDefault);
      expect(chooseTrack(tracks, alto, preferringPart)?.id).toBe(playedPreferringPart);
    },
  );

  it('plays nothing when the Piece has no track for the Singer and no Combined Track', () => {
    expect(chooseTrack([part('t', tenor)], alto, byDefault)).toBeUndefined();
    expect(chooseTrack<PlaythroughTrack>([], alto, preferringPart)).toBeUndefined();
  });

  it('uses the first listed when there are several for the same part or several Combined Tracks', () => {
    const tracks = [part('a2', alto), part('a1', alto), combined('c2'), combined('c1')];

    expect(chooseTrack(tracks, alto, byDefault)?.id).toBe('c2');
    expect(chooseTrack(tracks, alto, preferringPart)?.id).toBe('a2');
  });

  it('plays a part-predominant track like a part-only one', () => {
    expect(chooseTrack([part('p', alto, 'part-predominant')], alto, byDefault)?.id).toBe('p');
  });

  it('falls back to Combined for a Singer with no Voice Part', () => {
    expect(chooseTrack([part('p', alto), combined('c')], null, preferringPart)?.id).toBe('c');
    expect(chooseTrack([part('p', alto)], null, byDefault)).toBeUndefined();
  });
});

describe('resolvePlaythrough', () => {
  const nameOf = (voicePartId: string) => (voicePartId === alto ? 'Alto' : 'Tenor');

  // One Performance with every Piece shape, resolved for an Alto.
  const performance: readonly PlaythroughPiece[] = [
    { id: 'both', tracks: [part('both-alto', alto), combined('both-all')] },
    { id: 'all-and-tenor', tracks: [part('tenor-part', tenor), combined('all-and-tenor-all')] },
    { id: 'none', tracks: [] },
    { id: 'combined', tracks: [combined('combined-all')] },
    { id: 'alto-only', tracks: [part('alto-only-alto', alto)] },
    { id: 'alto-mix', tracks: [part('alto-mix-alto', alto, 'part-predominant')] },
    { id: 'tenor', tracks: [part('tenor-tenor', tenor)] },
  ];
  const everySkipEmpty = [false, true];
  const everyPreferVoicePart = [false, true];

  // Prefer-my-Voice-Part decides what plays and what the label says (`-` for nothing),
  // whatever skip-empty is.
  it.each([
    {
      preferVoicePart: false,
      played: [
        'both-all',
        'all-and-tenor-all',
        '-',
        'combined-all',
        'alto-only-alto',
        'alto-mix-alto',
        '-',
      ],
      heard: ['All', 'All', 'No tracks yet', 'All', 'Alto only', 'Alto + mix', 'No Alto track'],
    },
    {
      preferVoicePart: true,
      played: [
        'both-alto',
        'all-and-tenor-all',
        '-',
        'combined-all',
        'alto-only-alto',
        'alto-mix-alto',
        '-',
      ],
      heard: [
        'Alto only',
        'All',
        'No tracks yet',
        'All',
        'Alto only',
        'Alto + mix',
        'No Alto track',
      ],
    },
  ])(
    'with prefer-my-Voice-Part $preferVoicePart, plays and labels every Piece in order',
    ({ preferVoicePart, played, heard }) => {
      for (const skipEmpty of everySkipEmpty) {
        const entries = resolvePlaythrough(performance, alto, nameOf, {
          skipEmpty,
          preferVoicePart,
        });

        expect(entries.map((entry) => entry.piece)).toEqual(performance);
        expect(entries.map(({ track }) => track?.id ?? '-')).toEqual(played);
        expect(entries.map((entry) => entry.heard.text)).toEqual(heard);
        expect(entries.map((entry) => entry.heard.playable)).toEqual(
          played.map((id) => id !== '-'),
        );
      }
    },
  );

  // Skip-empty decides which Pieces are skipped, whatever prefer-my-Voice-Part is.
  it.each([
    { skipEmpty: false, skipped: [false, false, false, false, false, false, false] },
    { skipEmpty: true, skipped: [false, false, true, false, false, false, true] },
  ])(
    'with skip-empty $skipEmpty, skips only Pieces with nothing to play',
    ({ skipEmpty, skipped }) => {
      for (const preferVoicePart of everyPreferVoicePart) {
        const entries = resolvePlaythrough(performance, alto, nameOf, {
          skipEmpty,
          preferVoicePart,
        });

        expect(entries.map((entry) => entry.skipped)).toEqual(skipped);
      }
    },
  );

  it('plays a Singer with no Voice Part the Combined Track, or says there is none', () => {
    const pieces: readonly PlaythroughPiece[] = [
      { id: 'both', tracks: [part('p', alto), combined('c')] },
      { id: 'alto-only', tracks: [part('a', alto)] },
    ];

    const entries = resolvePlaythrough(pieces, null, nameOf, {
      skipEmpty: false,
      preferVoicePart: true,
    });

    expect(entries.map(({ track }) => track?.id ?? '-')).toEqual(['c', '-']);
    expect(entries.map((entry) => entry.heard)).toEqual([
      { text: 'All', playable: true },
      { text: 'No Combined track', playable: false },
    ]);
  });

  it('answers nothing for an empty Performance', () => {
    expect(
      resolvePlaythrough([], alto, nameOf, { skipEmpty: true, preferVoicePart: true }),
    ).toEqual([]);
  });
});

describe('trackForChoice', () => {
  const tracks = [part('a-alto', alto), part('a-tenor', tenor), combined('a-all')];

  it('plays the default with no choice made, honouring prefer-my-Voice-Part', () => {
    expect(trackForChoice(tracks, alto, defaultChoice, byDefault)?.id).toBe('a-all');
    expect(trackForChoice(tracks, alto, defaultChoice, preferringPart)?.id).toBe('a-alto');
  });

  it('plays the Combined Track or the chosen part once, whatever the option', () => {
    expect(trackForChoice(tracks, alto, { type: 'combined' }, preferringPart)?.id).toBe('a-all');
    expect(trackForChoice(tracks, alto, { type: 'part', voicePartId: tenor }, byDefault)?.id).toBe(
      'a-tenor',
    );
  });

  it('plays nothing for a part the Piece has no track for', () => {
    expect(
      trackForChoice(tracks, alto, { type: 'part', voicePartId: 'part-bass' }, byDefault),
    ).toBeUndefined();
    expect(
      trackForChoice([part('x', alto)], alto, { type: 'combined' }, byDefault),
    ).toBeUndefined();
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
