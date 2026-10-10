import { describe, expect, it } from 'vitest';
import { choirTimeZoneOf, type ChoirTimeZone } from './choir-time';
import {
  mayAddPiecesToPerformances,
  mayCreatePerformance,
  performanceActionsFor,
  performanceDialogCopy,
  performanceIdOf,
  performanceProblemOf,
  performanceTimesOf,
  performanceWhen,
  addToPerformanceChoices,
  pieceRowActionsFor,
  sidebarPerformances,
  type PerformanceId,
  type SidebarPerformance,
} from './performances';

const at = (iso: string) => new Date(iso);
const now = at('2026-10-10T12:00:00Z');

// A valid id for a Performance, made from its position in the tests.
const idFor = (name: string): PerformanceId => {
  const hex = Array.from(name, (letter) => letter.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(32, '0')
    .slice(0, 32);
  const id = performanceIdOf(
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
  );
  if (id === null) throw new Error(`no id for ${name}`);
  return id;
};

const performance = (
  name: string,
  startsAt: string,
  endsAt: string,
  isMajor = false,
): SidebarPerformance => ({
  id: idFor(name),
  name,
  startsAt: at(startsAt),
  endsAt: at(endsAt),
  isMajor,
});

describe('sidebarPerformances', () => {
  it('lists upcoming Performances first, soonest first, then past ones, most recent first', () => {
    const list = sidebarPerformances(
      [
        performance('old', '2026-01-01T19:00Z', '2026-01-01T21:00Z'),
        performance('later', '2026-12-01T19:00Z', '2026-12-01T21:00Z'),
        performance('older', '2025-06-01T19:00Z', '2025-06-01T21:00Z'),
        performance('soon', '2026-10-20T19:00Z', '2026-10-20T21:00Z'),
      ],
      now,
    );

    expect(list.map(({ name }) => name)).toEqual(['soon', 'later', 'old', 'older']);
  });

  it('marks only Performances that have ended as archived', () => {
    const list = sidebarPerformances(
      [
        performance('under way', '2026-10-10T11:00Z', '2026-10-10T13:00Z'),
        performance('over', '2026-10-10T09:00Z', '2026-10-10T11:59Z'),
      ],
      now,
    );

    expect(list.map(({ name, archived }) => [name, archived])).toEqual([
      ['under way', false],
      ['over', true],
    ]);
  });

  it('carries the Major mark and does not change the list it was given', () => {
    const input = [
      performance('b', '2026-11-01T19:00Z', '2026-11-01T21:00Z', true),
      performance('a', '2026-10-15T19:00Z', '2026-10-15T21:00Z'),
    ];

    const list = sidebarPerformances(input, now);

    expect(list.map(({ name, isMajor }) => [name, isMajor])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(input.map(({ name }) => name)).toEqual(['b', 'a']);
  });
});

describe('performance ids', () => {
  it('accepts a UUID and nothing else', () => {
    expect(performanceIdOf('5d34142f-5d7d-4ea8-9e80-2d9b7a5e4c11')).not.toBeNull();
    expect(performanceIdOf('w1')).toBeNull();
    expect(performanceIdOf('')).toBeNull();
    expect(performanceIdOf('5d34142f-5d7d-4ea8-9e80-2d9b7a5e4c11&x=1')).toBeNull();
  });
});

describe('performanceProblemOf', () => {
  it('maps the database refusals', () => {
    expect(performanceProblemOf({ code: '42501' })).toBe('not-allowed');
    expect(performanceProblemOf({ code: '23505', hint: 'duplicate' })).toBe('duplicate');
    expect(performanceProblemOf({ code: '23505' })).toBe('already-in');
    expect(performanceProblemOf({ code: '22023', hint: 'invalid' })).toBe('invalid');
    expect(performanceProblemOf({ code: '22023', hint: 'stale-list' })).toBe('list-changed');
    expect(performanceProblemOf({ code: 'P0002' })).toBe('gone');
    expect(performanceProblemOf({})).toBe('failed');
  });
});

describe('who sees which Performance actions', () => {
  it('shows New Performance only with append', () => {
    expect(mayCreatePerformance(['read', 'append'])).toBe(true);
    expect(mayCreatePerformance(['read', 'update', 'delete'])).toBe(false);
  });

  it('shows Edit for update and Delete for delete, and nothing for read or append alone', () => {
    expect(performanceActionsFor(['read', 'append'])).toEqual([]);
    expect(performanceActionsFor(['read', 'update'])).toEqual(['edit']);
    expect(performanceActionsFor(['read', 'update', 'delete'])).toEqual(['edit', 'delete']);
  });

  it('shows Add to a Performance and Remove from this Performance only with update', () => {
    expect(mayAddPiecesToPerformances(['read', 'append'])).toBe(false);
    expect(mayAddPiecesToPerformances(['read', 'update'])).toBe(true);
    expect(pieceRowActionsFor(['read', 'append', 'delete'])).toEqual([]);
    expect(pieceRowActionsFor(['read', 'update'])).toEqual(['remove']);
  });
});

describe('performanceDialogCopy', () => {
  it('says on delete that the Pieces stay in the Repertoire', () => {
    const copy = performanceDialogCopy('delete', 'Spring Concert');

    expect(copy.title).toBe('Delete Spring Concert?');
    expect(copy.description).toContain('Its Pieces stay in the Repertoire.');
  });
});

const london = ((): ChoirTimeZone => {
  const zone = choirTimeZoneOf('Europe/London');
  if (zone === null) throw new Error('no London');
  return zone;
})();

describe('performanceTimesOf', () => {
  it('reads the start and end entered in the Choir Time Zone as moments', () => {
    const times = performanceTimesOf('2027-07-01T19:00', '2027-07-01T21:30', london);

    expect(times).toEqual({
      startsAt: at('2027-07-01T18:00:00Z'),
      endsAt: at('2027-07-01T20:30:00Z'),
    });
  });

  it('refuses an end that is not after the start, and a time that is not one', () => {
    expect(performanceTimesOf('2027-07-01T19:00', '2027-07-01T19:00', london)).toBeNull();
    expect(performanceTimesOf('2027-07-01T19:00', '2027-07-01T18:00', london)).toBeNull();
    expect(performanceTimesOf('', '2027-07-01T21:00', london)).toBeNull();
  });
});

describe('performanceWhen', () => {
  it('shows the day once when the Performance starts and ends on it', () => {
    expect(performanceWhen(at('2027-07-01T18:00:00Z'), at('2027-07-01T20:30:00Z'), london)).toBe(
      'Thu 1 Jul 2027, 19:00–21:30',
    );
  });

  it('shows both days when it runs past midnight in the Choir Time Zone', () => {
    expect(performanceWhen(at('2027-12-31T22:00:00Z'), at('2028-01-01T01:00:00Z'), london)).toBe(
      'Fri 31 Dec 2027, 22:00 – Sat 1 Jan 2028, 01:00',
    );
  });
});

describe('addToPerformanceChoices', () => {
  it('lists upcoming Performances first, then past ones, marking those the Piece is in', () => {
    const past = performance('past', '2026-01-01T19:00Z', '2026-01-01T21:00Z');
    const soon = performance('soon', '2026-10-20T19:00Z', '2026-10-20T21:00Z');
    const later = performance('later', '2026-12-01T19:00Z', '2026-12-01T21:00Z');

    const choices = addToPerformanceChoices([past, later, soon], [later.id], now);

    expect(choices.map(({ name, archived, alreadyIn }) => [name, archived, alreadyIn])).toEqual([
      ['soon', false, false],
      ['later', false, true],
      ['past', true, false],
    ]);
  });
});
