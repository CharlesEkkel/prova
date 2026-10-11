# Performance times are entered and shown in one choir time zone

A Performance has a start and an end, and "upcoming until it has ended" depends on them. Times are stored as UTC timestamps, but entered and shown in a single **Choir Time Zone**, a site setting chosen by a Singer with `manage-users`, rather than in each Singer's device time zone.

## Considered Options

- **Each Singer's device time zone:** no setting to maintain, but a Singer who is travelling sees "7pm" shift by hours, and a Performance can look upcoming or archived differently from what the choir expects around midnight.
- **A time zone stored on each Performance:** correct for a choir that tours, but every Performance would need one chosen, and the Home timeline would mix zones.

## Consequences

- A choir that rehearses in several time zones is not served; the setting is one value for everyone.
- Changing the Choir Time Zone reinterprets no stored time, only how it is shown and entered.
- Needs an admin control beside the Colour Theme and a column on `site_settings`.
