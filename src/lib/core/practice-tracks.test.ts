import { describe, expect, it } from 'vitest';
import {
  acceptedExtensions,
  badgeStyleOf,
  checkUploadFile,
  combinedSource,
  defaultUploadLimitMiB,
  durationText,
  indicatorText,
  kindText,
  trackActionsFor,
  trackFilePath,
  trackIdOf,
  trackLabelMaxLength,
  trackProblemOf,
  trackTitle,
  uploadFileMessages,
  uploadLimitBytes,
  uploadLimitFrom,
  uploadLimitText,
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

describe('checkUploadFile', () => {
  it.each([
    ['song.mp3', 'mp3', 'audio/mpeg'],
    ['Song.MP3', 'mp3', 'audio/mpeg'],
    ['take 2.final.m4a', 'm4a', 'audio/mp4'],
  ])('accepts %s', (name, extension, contentType) => {
    expect(checkUploadFile({ name, size: 1000 }, 10)).toEqual({ ok: true, extension, contentType });
  });

  it.each(['song.wav', 'song.mp3.exe', 'song', 'mp3', 'song.pdf', ''])(
    'refuses %j by type',
    (name) => {
      expect(checkUploadFile({ name, size: 1000 }, 10)).toEqual({
        ok: false,
        problem: 'wrong-type',
      });
    },
  );

  it('accepts a file of exactly the limit and refuses one byte more', () => {
    const limit = uploadLimitBytes(10);

    expect(checkUploadFile({ name: 'a.mp3', size: limit }, 10).ok).toBe(true);
    expect(checkUploadFile({ name: 'a.mp3', size: limit + 1 }, 10)).toEqual({
      ok: false,
      problem: 'too-large',
    });
  });

  it('refuses an empty file', () => {
    expect(checkUploadFile({ name: 'a.mp3', size: 0 }, 10)).toEqual({
      ok: false,
      problem: 'empty',
    });
  });

  it('says what is wrong, with the limit', () => {
    const messages = uploadFileMessages(25);

    expect(messages['too-large']).toContain('25 MB');
    expect(messages['wrong-type']).toContain('MP3 or M4A');
  });
});

describe('the upload limit', () => {
  it('is 10 MiB unless the deployment says otherwise, and is said as 10 MB', () => {
    expect(defaultUploadLimitMiB).toBe(10);
    expect(uploadLimitBytes(10)).toBe(10_485_760);
    expect(uploadLimitText(10)).toBe('10 MB');
  });

  it.each([
    ['25', 25],
    [' 5 ', 5],
    [undefined, 10],
    ['', 10],
    ['0', 10],
    ['-3', 10],
    ['2.5', 10],
    ['ten', 10],
  ])('reads the setting %j as %i', (setting, limit) => {
    expect(uploadLimitFrom(setting)).toBe(limit);
  });

  it('names the picker types', () => {
    expect(acceptedExtensions).toBe('.mp3,.m4a');
  });
});

describe('where a track lives', () => {
  it('is under its Piece, named by the track', () => {
    expect(trackFilePath('piece', 'track', 'mp3')).toBe('piece/track.mp3');
  });

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

describe('trackProblemOf', () => {
  it.each([
    [{ code: '42501' }, 'not-allowed'],
    [{ code: 'P0002' }, 'gone'],
    [{ code: '22023', hint: 'kind' }, 'no-kind'],
    [{ code: '22023', hint: 'label' }, 'label-too-long'],
    [{ code: '22023', hint: 'file' }, 'no-file'],
    [{ code: '22023', hint: 'voice-part' }, 'invalid'],
    [{ code: '23505', hint: 'file-used' }, 'invalid'],
    [{ code: '08006' }, 'failed'],
    [{}, 'failed'],
  ])('reads %j as %s', (refusal, problem) => {
    expect(trackProblemOf(refusal)).toBe(problem);
  });
});
