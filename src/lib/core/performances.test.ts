import { describe, expect, it } from 'vitest';
import { sidebarPerformances, type SidebarPerformance } from './performances';

const at = (iso: string) => new Date(iso);
const now = at('2026-10-10T12:00:00Z');

const performance = (
  id: string,
  startsAt: string,
  endsAt: string,
  isMajor = false,
): SidebarPerformance => ({
  id,
  title: id,
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

    expect(list.map(({ id }) => id)).toEqual(['soon', 'later', 'old', 'older']);
  });

  it('marks only Performances that have ended as archived', () => {
    const list = sidebarPerformances(
      [
        performance('under way', '2026-10-10T11:00Z', '2026-10-10T13:00Z'),
        performance('over', '2026-10-10T09:00Z', '2026-10-10T11:59Z'),
      ],
      now,
    );

    expect(list.map(({ id, archived }) => [id, archived])).toEqual([
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

    expect(list.map(({ id, isMajor }) => [id, isMajor])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(input.map(({ id }) => id)).toEqual(['b', 'a']);
  });
});
