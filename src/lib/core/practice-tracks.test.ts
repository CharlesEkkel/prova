import { describe, expect, it } from 'vitest';
import {
  badgeStyleOf,
  combinedSource,
  durationText,
  indicatorText,
  kindText,
  trackActionsFor,
  trackIdOf,
  trackLabelMaxLength,
  trackTitle,
  type PracticeTrack,
  type TrackSource,
} from './practice-tracks';

const names: Readonly<Record<string, string>> = { alto: 'Alto', 'alto-2': 'Alto 2' };
const nameOf = (id: string): string => names[id] ?? id;

const partOnly: TrackSource = { type: 'part', voicePartId: 'alto', kind: 'part-only' };
const partMix: TrackSource = { type: 'part', voicePartId: 'alto-2', kind: 'part-predominant' };

const track = (source: TrackSource, label = ''): PracticeTrack => {
  const id = trackIdOf('3f8c1a52-7d4e-4b8a-9c21-0e5f6a7b8c9d');
  if (id === null) throw new Error('bad test id');
  return { id, source, label, durationSeconds: null };
};

describe('trackIdOf', () => {
  it('takes only a UUID as a track id', () => {
    expect(trackIdOf('nope')).toBeNull();
    expect(trackIdOf('3f8c1a52-7d4e-4b8a-9c21-0e5f6a7b8c9d')).not.toBeNull();
  });
});

describe('how a track is described', () => {
  it('badges each kind differently, with text as well as style', () => {
    expect([combinedSource, partOnly, partMix].map(badgeStyleOf)).toEqual([
      'solid',
      'outlined',
      'tinted',
    ]);
    expect([combinedSource, partOnly, partMix].map(kindText)).toEqual([
      'Combined',
      'Part only',
      'Part + mix',
    ]);
  });

  it('tells the part indicator apart', () => {
    expect(indicatorText(combinedSource, nameOf)).toBe('All');
    expect(indicatorText(partOnly, nameOf)).toBe('Alto only');
    expect(indicatorText(partMix, nameOf)).toBe('Alto 2 + mix');
  });

  it('titles a track by its label, or by what it is', () => {
    expect(trackTitle(track(partOnly, 'slow tempo'), nameOf)).toBe('slow tempo');
    expect(trackTitle(track(partOnly), nameOf)).toBe('Alto');
    expect(trackTitle(track(combinedSource), nameOf)).toBe('All');
  });

  it.each([
    [null, null],
    [5, '0:05'],
    [65, '1:05'],
    [600, '10:00'],
    [59.6, '1:00'],
  ])('writes %j seconds as %j', (seconds, text) => {
    expect(durationText(seconds)).toBe(text);
  });

  it('keeps a label to 60 characters', () => {
    expect(trackLabelMaxLength).toBe(60);
  });
});

describe('what a Singer may do', () => {
  it('shows Rename for update and Delete for delete', () => {
    expect(trackActionsFor(['read'])).toEqual([]);
    expect(trackActionsFor(['read', 'update'])).toEqual(['rename']);
    expect(trackActionsFor(['read', 'update', 'delete'])).toEqual(['rename', 'delete']);
  });
});
