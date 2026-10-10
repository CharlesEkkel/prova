// Performances: how one is identified, how they are listed, who may change them and what the screens
// say when a change is refused. See Performance and Performance Overview in CONTEXT.md.
import type { DialogCopy } from './admin-dialogs';
import { choirTimeOf, instantOfChoirTime, localDateTimeOf, type ChoirTimeZone } from './choir-time';
import type { Permission } from './permissions';
import type { DatabaseRefusal } from './voice-parts';

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
  readonly name: string;
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

export type AddToPerformanceChoice = SidebarEntry & { readonly alreadyIn: boolean };

/**
 * The Performances "Add to a Performance…" offers for a Piece: upcoming first, then past ones, each
 * marked when the Piece is in it already (shown ticked and disabled).
 */
export const addToPerformanceChoices = (
  performances: readonly SidebarPerformance[],
  pieceIsIn: readonly PerformanceId[],
  now: Date,
): readonly AddToPerformanceChoice[] =>
  sidebarPerformances(performances, now).map((entry) => ({
    ...entry,
    alreadyIn: pieceIsIn.includes(entry.id),
  }));

export type PerformanceTimes = { readonly startsAt: Date; readonly endsAt: Date };

/**
 * The start and end a form gave, entered in the Choir Time Zone, as moments; null when either is not
 * a date and time or the end is not after the start.
 */
export const performanceTimesOf = (
  start: string,
  end: string,
  zone: ChoirTimeZone,
): PerformanceTimes | null => {
  const [localStart, localEnd] = [localDateTimeOf(start), localDateTimeOf(end)];
  if (localStart === null || localEnd === null) return null;
  const times = {
    startsAt: instantOfChoirTime(localStart, zone),
    endsAt: instantOfChoirTime(localEnd, zone),
  };
  return times.endsAt > times.startsAt ? times : null;
};

const dayIn = (moment: Date, zone: ChoirTimeZone): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(moment);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')} ${part('month')} ${part('year')}`;
};

const clockIn = (moment: Date, zone: ChoirTimeZone): string =>
  choirTimeOf(moment, zone).slice('YYYY-MM-DDT'.length);

/** When a Performance is, in the Choir Time Zone: the day once if it ends on the day it starts. */
export const performanceWhen = (startsAt: Date, endsAt: Date, zone: ChoirTimeZone): string => {
  const [startDay, endDay] = [dayIn(startsAt, zone), dayIn(endsAt, zone)];
  return startDay === endDay
    ? `${startDay}, ${clockIn(startsAt, zone)}–${clockIn(endsAt, zone)}`
    : `${startDay}, ${clockIn(startsAt, zone)} – ${endDay}, ${clockIn(endsAt, zone)}`;
};

/** Whether New Performance is shown: creating one, with its first Pieces and major mark, needs `append`. */
export const mayCreatePerformance = (held: readonly Permission[]): boolean =>
  held.includes('append');

export type PerformanceAction = 'edit' | 'delete';

/** The Performance actions shown: Edit (name, times, venue) needs `update`, Delete `delete`. */
export const performanceActionsFor = (
  held: readonly Permission[],
): readonly PerformanceAction[] => [
  ...(held.includes('update') ? (['edit'] as const) : []),
  ...(held.includes('delete') ? (['delete'] as const) : []),
];

/** Whether a Piece's menu offers "Add to a Performance…": changing a running order needs `update`. */
export const mayAddPiecesToPerformances = (held: readonly Permission[]): boolean =>
  held.includes('update');

export type PieceRowAction = 'remove';

/** The actions on a Piece's row in the Overview: "Remove from this Performance" needs `update`. */
export const pieceRowActionsFor = (held: readonly Permission[]): readonly PieceRowAction[] =>
  held.includes('update') ? ['remove'] : [];

/** Why a change to a Performance was not made. */
export type PerformanceProblem =
  'not-allowed' | 'duplicate' | 'already-in' | 'invalid' | 'list-changed' | 'gone' | 'failed';

export const performanceMessages: Readonly<Record<PerformanceProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  duplicate: 'There is already a Performance with that name and start.',
  'already-in': 'That Piece is already in one of those Performances.',
  invalid: 'A Performance needs a name, and its end must come after its start.',
  'list-changed': 'Someone else changed this Performance. Its Pieces have been refreshed.',
  gone: 'That Performance or Piece no longer exists. The page has been refreshed.',
  failed: 'That did not work. Try again in a moment.',
};

/** Which problem a refusal from the Performance functions means. */
export const performanceProblemOf = ({ code, hint }: DatabaseRefusal): PerformanceProblem => {
  if (code === '42501') return 'not-allowed';
  if (code === '23505') return hint === 'duplicate' ? 'duplicate' : 'already-in';
  if (code === '22023') return hint === 'stale-list' ? 'list-changed' : 'invalid';
  return code === 'P0002' ? 'gone' : 'failed';
};

export type PerformanceDialogKind = 'new' | 'edit' | 'delete';

/** The wording for a dialog about a Performance; delete says its Pieces stay. */
export const performanceDialogCopy = (kind: PerformanceDialogKind, name: string): DialogCopy => {
  switch (kind) {
    case 'new':
      return {
        title: 'New Performance',
        description: 'Give it a name, a start and an end, and choose its first Pieces if you like.',
        submit: 'Add Performance',
      };
    case 'edit':
      return {
        title: 'Edit Performance',
        description: 'Change the name, times or venue.',
        submit: 'Save Performance',
      };
    case 'delete':
      return {
        title: `Delete ${name}?`,
        description: 'Its Pieces stay in the Repertoire. This cannot be undone.',
        submit: 'Delete Performance',
      };
  }
};
