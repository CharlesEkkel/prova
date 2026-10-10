// Practice Tracks: what a track is, how it is told apart on screen, and who may do what with it.
// See Practice Track, Combined Track and Part indicator in CONTEXT.md. What an upload may be is in
// upload-rules.ts, and why a change was refused is in track-problems.ts.
import type { Permission } from './permissions';
import { combinedTrackLabel } from './voice-parts';

declare const trackIdBrand: unique symbol;

/** The id of a Practice Track: a UUID. */
export type TrackId = string & { readonly [trackIdBrand]: true };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isTrackId = (value: unknown): value is TrackId =>
  typeof value === 'string' && uuidPattern.test(value);

/** `raw` as a track id if it is a UUID, otherwise null. */
export const trackIdOf = (raw: string): TrackId | null => (isTrackId(raw) ? raw : null);

export const trackKinds = ['part-only', 'part-predominant'] as const;

/** Part-only is just that line; part-predominant is that line louder over the rest. */
export type TrackKind = (typeof trackKinds)[number];

export const isTrackKind = (value: unknown): value is TrackKind =>
  trackKinds.some((kind) => kind === value);

/** What a track holds: every Voice Part together, or one Voice Part's line in one of two ways. */
export type TrackSource =
  | { readonly type: 'combined' }
  | { readonly type: 'part'; readonly voicePartId: string; readonly kind: TrackKind };

export const combinedSource: TrackSource = { type: 'combined' };

/** A Practice Track as the Piece page lists it, in the order it was uploaded. */
export type PracticeTrack = {
  readonly id: TrackId;
  readonly source: TrackSource;
  /** Up to `trackLabelMaxLength` characters, or empty. */
  readonly label: string;
  /** Measured in the browser at upload; null when it could not be read. */
  readonly durationSeconds: number | null;
};

export const trackLabelMaxLength = 60;

/** The three looks of a kind badge: solid, outlined and tinted, so colour is never the only cue. */
export type BadgeStyle = 'solid' | 'outlined' | 'tinted';

type Look = 'combined' | TrackKind;

/** How each kind of track is worded and drawn, in one place. */
const looks: Readonly<
  Record<Look, { readonly badge: BadgeStyle; readonly text: string; readonly indicator: string }>
> = {
  combined: { badge: 'solid', text: 'Combined', indicator: '' },
  'part-only': { badge: 'outlined', text: 'Part only', indicator: 'only' },
  'part-predominant': { badge: 'tinted', text: 'Part + mix', indicator: '+ mix' },
};

const lookOf = (source: TrackSource): (typeof looks)[Look] =>
  looks[source.type === 'combined' ? 'combined' : source.kind];

/** The wording for a kind, in the badge. */
export const kindText = (source: TrackSource): string => lookOf(source).text;

export const badgeStyleOf = (source: TrackSource): BadgeStyle => lookOf(source).badge;

/** What a kind means, in a sentence, for the upload dialog. */
export const kindDescription: Readonly<Record<TrackKind, string>> = {
  'part-only': 'Just that line.',
  'part-predominant': 'That line louder, over the rest.',
};

/** A track's length as `m:ss`, or null when it is not known. */
export const durationText = (seconds: number | null): string | null => {
  if (seconds === null) return null;
  const whole = Math.max(0, Math.round(seconds));
  const rest = whole % 60;
  return `${Math.floor(whole / 60).toString()}:${rest.toString().padStart(2, '0')}`;
};

type PartNames = (voicePartId: string) => string;

/** The name a track goes by in a list: its Voice Part, or the Combined Track's label. */
export const sourceName = (source: TrackSource, nameOf: PartNames): string =>
  source.type === 'combined' ? combinedTrackLabel : nameOf(source.voicePartId);

/** What the part indicator says is playing: `All`, `Alto only` or `Alto + mix`. */
export const indicatorText = (source: TrackSource, nameOf: PartNames): string =>
  source.type === 'combined'
    ? combinedTrackLabel
    : `${nameOf(source.voicePartId)} ${lookOf(source).indicator}`;

/** A track's row in the panel: its label, or what it is when it has none. */
export const trackTitle = (track: PracticeTrack, nameOf: PartNames): string =>
  track.label === '' ? sourceName(track.source, nameOf) : track.label;

/** Whether New Practice Track is shown: adding one needs `append`. */
export const mayUploadTrack = (held: readonly Permission[]): boolean => held.includes('append');

export type TrackAction = 'rename' | 'delete';

/** The row actions a Singer holding these Permissions is shown: Rename needs `update`, Delete `delete`. */
export const trackActionsFor = (held: readonly Permission[]): readonly TrackAction[] => [
  ...(held.includes('update') ? (['rename'] as const) : []),
  ...(held.includes('delete') ? (['delete'] as const) : []),
];
