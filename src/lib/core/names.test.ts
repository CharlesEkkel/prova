import { describe, expect, it } from 'vitest';
import { initialsOf } from './names';

describe('initialsOf', () => {
  it('takes the first letter of each word, in capitals, up to the limit', () => {
    expect(initialsOf('ada lovelace')).toBe('AL');
    expect(initialsOf('Mary Jane Watson')).toBe('MJ');
    expect(initialsOf('Mary Jane Watson', 3)).toBe('MJW');
    expect(initialsOf('Ada Lovelace', 1)).toBe('A');
  });

  it('copes with extra spaces and a single name', () => {
    expect(initialsOf('  Ada   Lovelace ')).toBe('AL');
    expect(initialsOf('Cher')).toBe('C');
  });

  it('is empty for an empty name', () => {
    expect(initialsOf('   ')).toBe('');
  });
});
