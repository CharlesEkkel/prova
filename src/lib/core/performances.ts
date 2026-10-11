// Performances: how one is identified, how they are listed, who may change them and what the screens
// say when a change is refused. See Performance and Performance Overview in CONTEXT.md.
import type { DialogCopy } from './admin-dialogs';
import { choirTimeOf, instantOfChoirTime, localDateTimeOf, type ChoirTimeZone } from './choir-time';
import type { Permission } from './permissions';
import type { PieceSummary } from './pieces';
import {
  resolvePlaythrough,
  type PlaythroughOptions,
  type PlaythroughTrack,
  type WhatYouWouldHear,
} from './playthrough';
import type { PartNames } from './practice-tracks';
import type { DatabaseRefusal } from './voice-parts';

declare const performanceIdBrand: unique symbol;

/** The id of a Performance, from `performanceIdOf`. */
export type PerformanceId = string & { readonly [performanceIdBrand]: true };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isPerformanceId = (value: unknown): value is PerformanceId =>
  typeof value === 'string' && uuidPattern.test(value);

/** `raw` as a Performance id if it is a UUID, otherwise null. */
export const performanceIdOf = (raw: string): PerformanceId | null =>
  isPerformanceId(raw) ? raw : null;

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

/** Upcoming Performances soonest first, and past ones most recent first. */
const upcomingAndPast = <P extends SidebarPerformance>(
  performances: readonly P[],
  now: Date,
): { readonly upcoming: readonly P[]; readonly past: readonly P[] } => ({
  upcoming: performances.filter((performance) => !archivedAt(performance, now)).toSorted(byStart),
  past: performances
    .filter((performance) => archivedAt(performance, now))
    .toSorted((a, b) => byStart(b, a)),
});

/** Upcoming Performances soonest first, then past ones, most recent first, each marked archived or not. */
export const sidebarPerformances = (
  performances: readonly SidebarPerformance[],
  now: Date,
): readonly SidebarEntry[] => {
  const { upcoming, past } = upcomingAndPast(performances, now);
  return [
    ...upcoming.map((performance) => ({ ...performance, archived: false })),
    ...past.map((performance) => ({ ...performance, archived: true })),
  ];
};

export type HomeTimeline<P extends SidebarPerformance> = {
  /** Ended, most recent first: collapsed above the Today marker. */
  readonly past: readonly P[];
  /** The earliest start among those not yet ended, so one in progress counts; shown largest. */
  readonly next: P | null;
  /** The rest of the upcoming ones, soonest first. */
  readonly later: readonly P[];
};

/** How Home lays Performances out around the Today marker. */
export const homeTimeline = <P extends SidebarPerformance>(
  performances: readonly P[],
  now: Date,
): HomeTimeline<P> => {
  const { upcoming, past } = upcomingAndPast(performances, now);
  const [next, ...later] = upcoming;
  return { past, next: next ?? null, later };
};

/** What the Edit Performance dialog changes, and what a Performance's heading shows: name, times, venue. */
export type PerformanceDetails = SidebarPerformance & { readonly venue: string };

/** A Piece as Home lists it: enough to say what the Singer would hear on it. */
export type HomePiece = PieceSummary & { readonly tracks: readonly PlaythroughTrack[] };

/** A Performance as Home loads it: its details and its Pieces, with their tracks, in running order. */
export type HomePerformance = PerformanceDetails & { readonly pieces: readonly HomePiece[] };

/** A Piece on a Home tile, saying what the Singer would hear on it. */
export type HomeTilePiece = PieceSummary & { readonly heard: WhatYouWouldHear };

/** An upcoming Performance as its Home tile shows it. */
export type HomeTile = PerformanceDetails & {
  /** How soon it starts, such as `In 3 days`. */
  readonly startsIn: string;
  readonly pieces: readonly HomeTilePiece[];
};

/** Home has no Play-through options, so its tiles say what the defaults would play. */
const homeOptions: PlaythroughOptions = { skipEmpty: false, preferVoicePart: false };

/** What a Home tile shows for a Singer singing `voicePartId`, at `now`. */
export const homeTileOf = (
  { pieces, ...performance }: HomePerformance,
  now: Date,
  zone: ChoirTimeZone,
  voicePartId: string,
  nameOf: PartNames,
): HomeTile => ({
  ...performance,
  startsIn: startsIn(performance.startsAt, performance.endsAt, now, zone),
  pieces: resolvePlaythrough(pieces, voicePartId, nameOf, homeOptions).map(
    ({ piece: { id, title, composer }, heard }) => ({ id, title, composer, heard }),
  ),
});

/** A past Performance on Home: a dimmed row, without its Pieces. */
export const pastRowOf = ({
  id,
  name,
  startsAt,
  endsAt,
  isMajor,
  venue,
}: HomePerformance): PerformanceDetails => ({ id, name, startsAt, endsAt, isMajor, venue });

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

/** The day a moment falls on in the Choir Time Zone, such as `Sun 11 Oct 2026`. */
export const dayIn = (moment: Date, zone: ChoirTimeZone): string => {
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

/** A Performance's heading line: when it is, then its venue if it has one. */
export const performanceWhenAndWhere = (
  { startsAt, endsAt, venue }: Pick<PerformanceDetails, 'startsAt' | 'endsAt' | 'venue'>,
  zone: ChoirTimeZone,
): string =>
  [performanceWhen(startsAt, endsAt, zone), ...(venue === '' ? [] : [venue])].join(' · ');

/** The calendar date of a moment in the Choir Time Zone, as a day number that can be subtracted. */
const dayNumber = (moment: Date, zone: ChoirTimeZone): number =>
  Date.parse(`${choirTimeOf(moment, zone).slice(0, 'YYYY-MM-DD'.length)}T00:00Z`) / 86_400_000;

/** How soon a Performance starts, counting days in the Choir Time Zone: `On now`, `Today`, `In 3 days`. */
export const startsIn = (startsAt: Date, endsAt: Date, now: Date, zone: ChoirTimeZone): string => {
  if (startsAt <= now && now < endsAt) return 'On now';
  const days = dayNumber(startsAt, zone) - dayNumber(now, zone);
  if (days === 0) return 'Today';
  return days === 1 ? 'Tomorrow' : `In ${days.toString()} days`;
};

/** A Piece as the New Performance dialog offers it for the first Pieces. */
type Findable = { readonly title: string; readonly composer: string };

/** The Pieces whose title or composer contains `search`, ignoring case and outer spaces. */
export const matchingPieces = <Piece extends Findable>(
  pieces: readonly Piece[],
  search: string,
): readonly Piece[] => {
  const wanted = search.trim().toLowerCase();
  return pieces.filter(({ title, composer }) =>
    `${title} ${composer}`.toLowerCase().includes(wanted),
  );
};

/**
 * The first Pieces, in the order they were ticked: the running order a new Performance starts with.
 * Ticking one already ticked keeps its place; unticking takes it out.
 */
export const toggleTicked = <Id>(ticked: readonly Id[], id: Id, on: boolean): readonly Id[] => {
  if (!on) return ticked.filter((other) => other !== id);
  return ticked.includes(id) ? ticked : [...ticked, id];
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

/**
 * Whether a Singer may change a running order: "Add to a Performance…", "Remove from this
 * Performance" and dragging the Pieces into a new order all need `update`.
 */
export const mayChangeRunningOrder = (held: readonly Permission[]): boolean =>
  held.includes('update');

export type PieceRowAction = 'remove';

/** The actions on a Piece's row in the Overview: "Remove from this Performance" needs `update`. */
export const pieceRowActionsFor = (held: readonly Permission[]): readonly PieceRowAction[] =>
  mayChangeRunningOrder(held) ? ['remove'] : [];

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
  // 23503: a Piece or Performance named in the change was deleted meanwhile.
  return code === 'P0002' || code === '23503' ? 'gone' : 'failed';
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
