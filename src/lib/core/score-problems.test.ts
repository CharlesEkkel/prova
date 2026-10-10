import { describe, expect, it } from 'vitest';
import { scoreMessages, scoreProblemOf } from './score-problems';

describe('scoreProblemOf', () => {
  it.each([
    [{ code: '42501' }, 'not-allowed'],
    [{ code: 'P0002' }, 'gone'],
    [{ code: '22023', hint: 'label' }, 'bad-label'],
    [{ code: '22023', hint: 'file' }, 'no-file'],
    [{ code: '23505', hint: 'file-used' }, 'invalid'],
    [{ code: '23505' }, 'invalid'],
    [{ code: '08006' }, 'failed'],
    [{}, 'failed'],
  ])('reads %j as %s', (refusal, problem) => {
    expect(scoreProblemOf(refusal)).toBe(problem);
  });

  it('has a message for every problem', () => {
    expect(Object.values(scoreMessages).every((message) => message !== '')).toBe(true);
  });

  it('says that replacing the choir score needs more than adding one', () => {
    expect(scoreMessages['not-allowed']).toContain('permission');
  });
});
