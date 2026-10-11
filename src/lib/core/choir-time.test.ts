import { describe, expect, it } from 'vitest';
import {
  choirTimeOf,
  choirTimeZoneOf,
  instantOfChoirTime,
  localDateTimeOf,
  type ChoirTimeZone,
} from './choir-time';

const zone = (name: string): ChoirTimeZone => {
  const parsed = choirTimeZoneOf(name);
  if (parsed === null) throw new Error(`not a time zone: ${name}`);
  return parsed;
};

const instant = (local: string, zoneName: string): string => {
  const parsed = localDateTimeOf(local);
  if (parsed === null) throw new Error(`not a local time: ${local}`);
  return instantOfChoirTime(parsed, zone(zoneName)).toISOString();
};

describe('choirTimeZoneOf', () => {
  it('accepts IANA time zones and UTC, and nothing else', () => {
    expect(choirTimeZoneOf('Europe/London')).toBe('Europe/London');
    expect(choirTimeZoneOf('UTC')).toBe('UTC');
    expect(choirTimeZoneOf('Middle/Earth')).toBeNull();
    expect(choirTimeZoneOf('')).toBeNull();
  });
});

describe('localDateTimeOf', () => {
  it('reads what a date-and-time field gives, and refuses anything else', () => {
    expect(localDateTimeOf('2027-03-01T19:00')).not.toBeNull();
    expect(localDateTimeOf('2027-02-30T19:00')).toBeNull();
    expect(localDateTimeOf('2027-03-01T25:00')).toBeNull();
    expect(localDateTimeOf('2027-03-01')).toBeNull();
    expect(localDateTimeOf('')).toBeNull();
  });
});

describe('instantOfChoirTime', () => {
  it('reads a time entered in the Choir Time Zone as the moment it names', () => {
    expect(instant('2027-03-01T19:00', 'Europe/London')).toBe('2027-03-01T19:00:00.000Z');
    expect(instant('2027-07-01T19:00', 'Europe/London')).toBe('2027-07-01T18:00:00.000Z');
    expect(instant('2027-03-01T19:00', 'Australia/Sydney')).toBe('2027-03-01T08:00:00.000Z');
    expect(instant('2027-03-01T19:00', 'UTC')).toBe('2027-03-01T19:00:00.000Z');
  });

  it('moves a time the clocks skip forward by the hour they skip', () => {
    // London's clocks go from 01:00 to 02:00 on 28 March 2027, so 01:30 is read as 02:30 BST.
    expect(instant('2027-03-28T01:30', 'Europe/London')).toBe('2027-03-28T01:30:00.000Z');
  });
});

describe('choirTimeOf', () => {
  it('shows a moment as the date and time in the Choir Time Zone, as a field would hold it', () => {
    const at = new Date('2027-07-01T18:00:00Z');

    expect(choirTimeOf(at, zone('Europe/London'))).toBe('2027-07-01T19:00');
    expect(choirTimeOf(at, zone('Australia/Sydney'))).toBe('2027-07-02T04:00');
  });
});
