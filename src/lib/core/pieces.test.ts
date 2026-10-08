import { describe, expect, it } from 'vitest';
import {
  composerMaxLength,
  notesMaxLength,
  mayAddPiece,
  pieceActionsFor,
  pieceIdOf,
  pieceProblemOf,
  removalSummary,
  repertoireOrder,
  tidyText,
  titleMaxLength,
  type RepertoireEntry,
} from './pieces';

const id = '3f8c1a52-7d4e-4b8a-9c21-0e5f6a7b8c9d';

const entry = (title: string, composer = ''): RepertoireEntry => {
  const pieceId = pieceIdOf(id);
  if (pieceId === null) throw new Error('bad test id');
  return { id: pieceId, title, composer, notes: '', practiceTracks: 0, scores: 0, performances: 0 };
};

describe('pieceIdOf', () => {
  it('accepts a UUID and nothing else', () => {
    expect(pieceIdOf(id)).toBe(id);
    expect(pieceIdOf('not-an-id')).toBeNull();
    expect(pieceIdOf('')).toBeNull();
  });
});

describe('tidyText', () => {
  it('trims and collapses runs of spaces', () => {
    expect(tidyText('  Ave   Maria ')).toBe('Ave Maria');
  });
});

describe('repertoireOrder', () => {
  it('sorts A to Z by title, ignoring case, then by composer', () => {
    const sorted = repertoireOrder([
      entry('zadok', 'Handel'),
      entry('Ave Maria', 'Schubert'),
      entry('ave maria', 'Bruckner'),
      entry('Magnificat'),
    ]);
    expect(sorted.map(({ title, composer }) => `${title}|${composer}`)).toEqual([
      'ave maria|Bruckner',
      'Ave Maria|Schubert',
      'Magnificat|',
      'zadok|Handel',
    ]);
  });

  it('does not change the list it is given', () => {
    const list = [entry('B'), entry('A')];
    repertoireOrder(list);
    expect(list.map(({ title }) => title)).toEqual(['B', 'A']);
  });
});

describe('pieceProblemOf', () => {
  it('maps the database refusals', () => {
    expect(pieceProblemOf({ code: '42501' })).toBe('not-allowed');
    expect(pieceProblemOf({ code: '23505' })).toBe('duplicate');
    expect(pieceProblemOf({ code: '22023' })).toBe('invalid');
    expect(pieceProblemOf({ code: 'P0002' })).toBe('gone');
    expect(pieceProblemOf({ code: 'XX000' })).toBe('failed');
    expect(pieceProblemOf({})).toBe('failed');
  });
});

describe('removalSummary', () => {
  it('says what goes with the Piece, with plurals', () => {
    expect(removalSummary({ practiceTracks: 0, scores: 0, performances: 0 })).toBe(
      'It has 0 Practice Tracks and 0 Scores, and is in 0 Performances. All of them go with it.',
    );
    expect(removalSummary({ practiceTracks: 1, scores: 1, performances: 1 })).toBe(
      'It has 1 Practice Track and 1 Score, and is in 1 Performance. All of them go with it.',
    );
  });
});

describe('pieceActionsFor', () => {
  it('offers Edit for update and Delete for delete, and nothing for read or append alone', () => {
    expect(pieceActionsFor(['read', 'update', 'delete'])).toEqual(['edit', 'delete']);
    expect(pieceActionsFor(['read', 'append'])).toEqual([]);
    expect(pieceActionsFor(['read', 'delete'])).toEqual(['delete']);
  });
});

describe('mayAddPiece', () => {
  it('needs append', () => {
    expect(mayAddPiece(['read', 'append'])).toBe(true);
    expect(mayAddPiece(['read', 'update', 'delete'])).toBe(false);
  });
});

describe('limits', () => {
  it('are the agreed ones', () => {
    expect([titleMaxLength, composerMaxLength, notesMaxLength]).toEqual([120, 120, 2000]);
  });
});
