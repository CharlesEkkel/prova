// Performance times in the Choir Time Zone: stored as moments (UTC), entered and shown as a date and
// time in the one zone the whole choir uses. See Choir Time Zone in CONTEXT.md and ADR 0004.

declare const choirTimeZoneBrand: unique symbol;
declare const localDateTimeBrand: unique symbol;

/** An IANA time zone name the runtime knows, from `choirTimeZoneOf`. */
export type ChoirTimeZone = string & { readonly [choirTimeZoneBrand]: true };

/** A date and time with no zone, as a date-and-time field holds it (`2027-03-01T19:00`). */
export type LocalDateTime = string & { readonly [localDateTimeBrand]: true };

/** The zone the setting starts as, matching the database's default. */
export const defaultChoirTimeZone = 'UTC';

const knowsZone = (name: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: name });
    return name.length > 0;
  } catch {
    return false;
  }
};

/** `name` as a Choir Time Zone if it is one, otherwise null. */
export const choirTimeZoneOf = (name: string): ChoirTimeZone | null =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- validation boundary: Intl has accepted the name
  knowsZone(name) ? (name as ChoirTimeZone) : null;

/** Every zone the runtime knows, for the setting's picker, with UTC first. */
export const choirTimeZones = (): readonly string[] => [
  'UTC',
  ...Intl.supportedValuesOf('timeZone').filter((name) => name !== 'UTC'),
];

const localPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

type Fields = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
};

const fieldsOf = (local: string): Fields | null => {
  const match = localPattern.exec(local);
  if (match === null) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    return null;
  }
  return { year, month, day, hour, minute };
};

/** The fields as if they were UTC, in milliseconds. */
const asUtc = ({ year, month, day, hour, minute }: Fields): number =>
  Date.UTC(year, month - 1, day, hour, minute);

/** `raw` as a local date and time if it names a real one, otherwise null. */
export const localDateTimeOf = (raw: string): LocalDateTime | null => {
  const fields = fieldsOf(raw);
  if (fields === null || fields.hour > 23 || fields.minute > 59) return null;
  const roundTrip = new Date(asUtc(fields));
  // A day that does not exist (30 February) rolls over into the next month.
  return roundTrip.getUTCMonth() + 1 === fields.month && roundTrip.getUTCDate() === fields.day
    ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- validation boundary: checked above
      (raw as LocalDateTime)
    : null;
};

const pad = (value: number): string => String(value).padStart(2, '0');

const partsIn = (moment: Date, zone: ChoirTimeZone): Fields => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(moment);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((candidate) => candidate.type === type)?.value ?? 0);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  };
};

/** How far the zone's clocks are ahead of UTC at this moment, in milliseconds. */
const offsetAt = (moment: number, zone: ChoirTimeZone): number =>
  asUtc(partsIn(new Date(moment), zone)) - Math.floor(moment / 60_000) * 60_000;

/**
 * The moment a date and time in the Choir Time Zone names. A time the clocks skip is moved forward
 * by the hour they skip; a time they pass twice is read as the later one.
 */
export const instantOfChoirTime = (local: LocalDateTime, zone: ChoirTimeZone): Date => {
  const fields = fieldsOf(local);
  if (fields === null) throw new Error('unreachable: a LocalDateTime always has its fields');
  const wall = asUtc(fields);
  const first = offsetAt(wall, zone);
  const second = offsetAt(wall - first, zone);
  // The offsets disagree only in a gap; the smaller one moves the time past it.
  return new Date(wall - Math.min(first, second));
};

/** A moment as the date and time it is in the Choir Time Zone, as a date-and-time field holds it. */
export const choirTimeOf = (moment: Date, zone: ChoirTimeZone): LocalDateTime => {
  const { year, month, day, hour, minute } = partsIn(moment, zone);
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- built from Intl's own fields, so it is well formed
  return `${String(year)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}` as LocalDateTime;
};
