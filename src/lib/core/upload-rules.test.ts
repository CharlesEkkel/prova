import { describe, expect, it } from 'vitest';
import {
  acceptedExtensions,
  acceptedScoreExtensions,
  defaultScoreUploadLimitMiB,
  defaultUploadLimitMiB,
  isAudioExtension,
  scoreFilePath,
  scoreUploadRules,
  trackFilePath,
  uploadLimitBytes,
  uploadLimitFrom,
  uploadLimitText,
  uploadProblemOfResponse,
  uploadProblemOfStatus,
  uploadRules,
} from './upload-rules';

const rules = uploadRules(10);

describe('uploadRules(…).check', () => {
  it.each([
    ['song.mp3', 'mp3', 'audio/mpeg'],
    ['Song.MP3', 'mp3', 'audio/mpeg'],
    ['take 2.final.m4a', 'm4a', 'audio/mp4'],
  ])('accepts %s', (name, extension, contentType) => {
    expect(rules.check({ name, size: 1000 })).toEqual({
      ok: true,
      accepted: { extension, contentType },
    });
  });

  it.each(['song.wav', 'song.mp3.exe', 'song', 'mp3', 'song.pdf', ''])(
    'refuses %j by type',
    (name) => {
      expect(rules.check({ name, size: 1000 })).toEqual({ ok: false, problem: 'wrong-type' });
    },
  );

  it('accepts a file of exactly the limit and refuses one byte more', () => {
    const limit = uploadLimitBytes(10);

    expect(rules.check({ name: 'a.mp3', size: limit }).ok).toBe(true);
    expect(rules.check({ name: 'a.mp3', size: limit + 1 })).toEqual({
      ok: false,
      problem: 'too-large',
    });
  });

  it('refuses an empty file', () => {
    expect(rules.check({ name: 'a.mp3', size: 0 })).toEqual({ ok: false, problem: 'empty' });
  });

  it('says what is wrong, with the limit', () => {
    const { messages, limitText } = uploadRules(25);

    expect(limitText).toBe('25 MB');
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
    expect(['mp3', 'm4a', 'wav', 3].map(isAudioExtension)).toEqual([true, true, false, false]);
  });
});

describe('where a track lives', () => {
  it('is under its Piece, named by the track', () => {
    expect(trackFilePath('piece', 'track', 'mp3')).toBe('piece/track.mp3');
  });
});

describe('uploadProblemOfResponse', () => {
  it('reads the status the storage service names in its body, since its HTTP status is 400', () => {
    expect(uploadProblemOfResponse(400, '{"statusCode":"413","error":"Payload too large"}')).toBe(
      'too-large',
    );
    expect(uploadProblemOfResponse(400, '{"statusCode":"415","error":"invalid_mime_type"}')).toBe(
      'wrong-type',
    );
    expect(uploadProblemOfResponse(400, '{"statusCode":415}')).toBe('wrong-type');
  });

  it('falls back to the HTTP status when the body names none', () => {
    expect(uploadProblemOfResponse(413, '')).toBe('too-large');
    expect(uploadProblemOfResponse(415, '<html>Unsupported</html>')).toBe('wrong-type');
    expect(uploadProblemOfResponse(500, '{"statusCode":"nonsense"}')).toBe('failed');
    expect(uploadProblemOfResponse(0, '')).toBe('failed');
  });
});

describe('uploadProblemOfStatus', () => {
  it.each([
    [413, 'too-large'],
    [415, 'wrong-type'],
    [400, 'failed'],
    [500, 'failed'],
  ])('reads status %i as %s', (status, problem) => {
    expect(uploadProblemOfStatus(status)).toBe(problem);
  });
});

describe('scoreUploadRules(…).check', () => {
  const scoreRules = scoreUploadRules(20);

  it.each(['Requiem.pdf', 'Requiem.PDF', 'full score.final.pdf'])('accepts %s', (name) => {
    expect(scoreRules.check({ name, size: 1000 })).toEqual({
      ok: true,
      accepted: { extension: 'pdf', contentType: 'application/pdf' },
    });
  });

  it.each(['take.mp3', 'score.pdf.exe', 'score', 'pdf', 'score.docx', ''])(
    'refuses %j by type',
    (name) => {
      expect(scoreRules.check({ name, size: 1000 })).toEqual({ ok: false, problem: 'wrong-type' });
    },
  );

  it('accepts a file of exactly the limit and refuses one byte more and an empty one', () => {
    const limit = uploadLimitBytes(20);

    expect(scoreRules.check({ name: 'a.pdf', size: limit }).ok).toBe(true);
    expect(scoreRules.check({ name: 'a.pdf', size: limit + 1 })).toEqual({
      ok: false,
      problem: 'too-large',
    });
    expect(scoreRules.check({ name: 'a.pdf', size: 0 })).toEqual({ ok: false, problem: 'empty' });
  });

  it('says what is wrong, with its own limit', () => {
    const { messages, limitText } = scoreUploadRules(30);

    expect(limitText).toBe('30 MB');
    expect(messages['too-large']).toContain('30 MB');
    expect(messages['wrong-type']).toContain('PDF');
  });
});

describe('the Score upload limit', () => {
  it('is 20 MiB unless the deployment says otherwise, separate from the audio limit', () => {
    expect(defaultScoreUploadLimitMiB).toBe(20);
    expect(defaultScoreUploadLimitMiB).not.toBe(defaultUploadLimitMiB);
  });

  it('falls back to its own default for a missing or bad setting', () => {
    expect(uploadLimitFrom('40', defaultScoreUploadLimitMiB)).toBe(40);
    expect(uploadLimitFrom(undefined, defaultScoreUploadLimitMiB)).toBe(20);
    expect(uploadLimitFrom('lots', defaultScoreUploadLimitMiB)).toBe(20);
  });

  it('names the picker type and puts the file under its Piece, named by the Score', () => {
    expect(acceptedScoreExtensions).toBe('.pdf');
    expect(scoreFilePath('piece', 'score')).toBe('piece/score.pdf');
  });
});
