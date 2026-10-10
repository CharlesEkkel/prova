import { describe, expect, it } from 'vitest';
import { trackMessages, trackProblemOf } from './track-problems';

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

  it('has a message for every problem', () => {
    expect(Object.values(trackMessages).every((message) => message !== '')).toBe(true);
  });
});
