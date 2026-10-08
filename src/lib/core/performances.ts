// How Performances are listed in the sidebar. See Performance in CONTEXT.md.

declare const performanceIdBrand: unique symbol;

/** The id of a Performance, from `performanceIdOf`. */
export type PerformanceId = string & { readonly [performanceIdBrand]: true };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `raw` as a Performance id if it is a UUID, otherwise null. */
export const performanceIdOf = (raw: string): PerformanceId | null =>
  uuidPattern.test(raw) ? brand(raw) : null;

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- validation boundary: only called on text performanceIdOf has checked
const brand = (id: string): PerformanceId => id as PerformanceId;

export type SidebarPerformance = {
  readonly id: PerformanceId;
  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly isMajor: boolean;
};

export type SidebarEntry = SidebarPerformance & { readonly archived: boolean };

/** A Performance is upcoming until it has ended, and past (archived) after that. */
const archivedAt = (performance: SidebarPerformance, now: Date): boolean =>
  performance.endsAt <= now;

const byStart = (a: SidebarPerformance, b: SidebarPerformance): number =>
  a.startsAt.getTime() - b.startsAt.getTime();

/** Upcoming Performances soonest first, then past ones, most recent first, each marked archived or not. */
export const sidebarPerformances = (
  performances: readonly SidebarPerformance[],
  now: Date,
): readonly SidebarEntry[] => {
  const entries = performances.map((performance) => ({
    ...performance,
    archived: archivedAt(performance, now),
  }));
  return [
    ...entries.filter(({ archived }) => !archived).toSorted(byStart),
    ...entries.filter(({ archived }) => archived).toSorted((a, b) => byStart(b, a)),
  ];
};
