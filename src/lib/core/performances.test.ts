import { describe, expect, it } from 'vitest';
import {
  performanceIdOf,
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
  title: name,
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

    expect(list.map(({ title }) => title)).toEqual(['soon', 'later', 'old', 'older']);
  });

  it('marks only Performances that have ended as archived', () => {
    const list = sidebarPerformances(
      [
        performance('under way', '2026-10-10T11:00Z', '2026-10-10T13:00Z'),
        performance('over', '2026-10-10T09:00Z', '2026-10-10T11:59Z'),
      ],
      now,
    );

    expect(list.map(({ title, archived }) => [title, archived])).toEqual([
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

    expect(list.map(({ title, isMajor }) => [title, isMajor])).toEqual([
      ['a', false],
      ['b', true],
    ]);
    expect(input.map(({ title }) => title)).toEqual(['b', 'a']);
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
