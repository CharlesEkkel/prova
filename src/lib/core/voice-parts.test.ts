import { describe, expect, it } from 'vitest';
import { suggestShortLabel, voicePartProblemOf } from './voice-parts';

describe('suggestShortLabel', () => {
  it('is the first letter, in capitals, plus any number', () => {
    expect(suggestShortLabel('Soprano')).toBe('S');
    expect(suggestShortLabel('Alto 1')).toBe('A1');
    expect(suggestShortLabel('Tenor 2')).toBe('T2');
    expect(suggestShortLabel('alto 2')).toBe('A2');
  });

  it('copes with extra spaces and a number written without one', () => {
    expect(suggestShortLabel('  Bass 2  ')).toBe('B2');
    expect(suggestShortLabel('Bass2')).toBe('B2');
  });

  it('takes the first letter of a compound name and ignores a number in the middle', () => {
    expect(suggestShortLabel('Mezzo-Soprano')).toBe('M');
    expect(suggestShortLabel('Tenor 1 Solo')).toBe('T');
  });

  it('keeps to three characters, the most a short label may have', () => {
    expect(suggestShortLabel('Soprano 12')).toBe('S12');
    expect(suggestShortLabel('Soprano 123')).toBe('S12');
  });

  it('is empty when the name has nothing to take a letter from', () => {
    expect(suggestShortLabel('   ')).toBe('');
    expect(suggestShortLabel('—')).toBe('');
  });
});

describe('voicePartProblemOf', () => {
  it.each([
    [{ code: '42501', hint: null }, 'not-allowed'],
    [{ code: '23505', hint: 'name-taken' }, 'name-taken'],
    [{ code: '23505', hint: 'label-taken' }, 'label-taken'],
    [{ code: '22023', hint: 'reserved' }, 'reserved'],
    [{ code: '22023', hint: 'last-voice-part' }, 'last-one'],
    [{ code: '22023', hint: 'stale-list' }, 'list-changed'],
    [{ code: '22023', hint: 'invalid' }, 'invalid'],
    [{ code: 'P0002', hint: null }, 'invalid'],
    [{ code: '08006', hint: null }, 'failed'],
  ])('reads %j as %s', (error, problem) => {
    expect(voicePartProblemOf(error)).toBe(problem);
  });

  it('reads a failure with no code as failed', () => {
    expect(voicePartProblemOf({})).toBe('failed');
  });
});
