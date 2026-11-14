// Play-through resolver: pure core. Chooses the Practice Track to play for a Piece, and resolves
// each of a Performance's Pieces, in order, for a Play-through. See Combined Track and Play-through in CONTEXT.md.
import { indicatorText, type PartNames, type TrackSource } from './practice-tracks';

/** A track as the resolver sees it. Tracks are given in the order they were uploaded. */
export type PlaythroughTrack = {
  readonly id: string;
  readonly source: TrackSource;
};

export type PlaythroughPiece = {
  readonly id: string;
  readonly tracks: readonly PlaythroughTrack[];
};

export type PlaythroughOptions = {
  readonly skipEmpty: boolean;
  /** Off: the Combined Track first, then the Singer's part. On: the Singer's part first, then Combined. */
  readonly preferVoicePart: boolean;
};

/** Both options off: how a Play-through starts until a Singer changes them on this device. */
export const defaultPlaythroughOptions: PlaythroughOptions = {
  skipEmpty: false,
  preferVoicePart: false,
};

/** Which track a Singer hears first on a Piece: the option that matters outside a Play-through too. */
export type TrackPreference = Pick<PlaythroughOptions, 'preferVoicePart'>;

/** What a Singer would hear on a Piece, in the part indicator's words; not `playable` when nothing would play. */
export type WhatYouWouldHear = { readonly text: string; readonly playable: boolean };

/**
 * What a Play-through does at a Piece: play its `track`, or, with no track, pause there, or skip it
 * when skip-empty is on. `heard` says which, for the Overview, Home and the Play-through's "Up next".
 */
export type PlaythroughEntry<P extends PlaythroughPiece = PlaythroughPiece> =
  | {
      readonly kind: 'play';
      readonly piece: P;
      readonly track: P['tracks'][number];
      readonly heard: WhatYouWouldHear;
    }
  | { readonly kind: 'pause'; readonly piece: P; readonly heard: WhatYouWouldHear }
  | { readonly kind: 'skip'; readonly piece: P; readonly heard: WhatYouWouldHear };

/** The first Combined Track (the first uploaded wins when there are several). */
const combinedTrack = <T extends PlaythroughTrack>(tracks: readonly T[]): T | undefined =>
  tracks.find(({ source }) => source.type === 'combined');

/** The first track for this Voice Part, whichever kind it is. */
const partTrack = <T extends PlaythroughTrack>(
  tracks: readonly T[],
  voicePartId: string | null,
): T | undefined =>
  voicePartId === null
    ? undefined
    : tracks.find(({ source }) => source.type === 'part' && source.voicePartId === voicePartId);

/**
 * The track a Singer hears on a Piece by default: the Combined Track, falling back to the track for
 * their Voice Part; with `preferVoicePart`, the reverse. `voicePartId` is the Voice Part in effect,
 * the Singer's default.
 */
export const chooseTrack = <T extends PlaythroughTrack>(
  tracks: readonly T[],
  voicePartId: string | null,
  { preferVoicePart }: TrackPreference,
): T | undefined =>
  preferVoicePart
    ? (partTrack(tracks, voicePartId) ?? combinedTrack(tracks))
    : (combinedTrack(tracks) ?? partTrack(tracks, voicePartId));

/** Why a Singer would hear nothing on a Piece: it has no tracks, or none for them. */
const whyNothingPlays = (
  tracks: readonly PlaythroughTrack[],
  voicePartId: string | null,
  nameOf: PartNames,
): string => {
  if (tracks.length === 0) return 'No tracks yet';
  return voicePartId === null ? 'No Combined track' : `No ${nameOf(voicePartId)} track`;
};

/** What a Singer would hear on a Piece, given the track chosen for them (if any). */
const whatYouWouldHear = (
  { tracks }: PlaythroughPiece,
  track: PlaythroughTrack | undefined,
  voicePartId: string | null,
  nameOf: PartNames,
): WhatYouWouldHear =>
  track === undefined
    ? { text: whyNothingPlays(tracks, voicePartId, nameOf), playable: false }
    : { text: indicatorText(track.source, nameOf), playable: true };

const resolveEntry = <P extends PlaythroughPiece>(
  piece: P,
  voicePartId: string | null,
  nameOf: PartNames,
  options: PlaythroughOptions,
): PlaythroughEntry<P> => {
  const track = chooseTrack(piece.tracks, voicePartId, options);
  const heard = whatYouWouldHear(piece, track, voicePartId, nameOf);
  if (track !== undefined) return { kind: 'play', piece, track, heard };
  return { kind: options.skipEmpty ? 'skip' : 'pause', piece, heard };
};

/**
 * Every Piece of a Performance, in order, with what a Play-through does there and what the Singer
 * would hear, in the part indicator's words (`All`, `Alto only`, `Alto + mix`) or why nothing would
 * play.
 */
export const resolvePlaythrough = <P extends PlaythroughPiece>(
  pieces: readonly P[],
  voicePartId: string | null,
  nameOf: PartNames,
  options: PlaythroughOptions,
): readonly PlaythroughEntry<P>[] =>
  pieces.map((piece) => resolveEntry(piece, voicePartId, nameOf, options));

/** Whether a Play-through stops at this Piece: to play it, or to pause there. Skipped ones it passes. */
export const isStop = ({ kind }: PlaythroughEntry): boolean => kind !== 'skip';

/** How many Pieces a Play-through stops at: those it plays and those it pauses at, not the skipped. */
export const playCount = (entries: readonly PlaythroughEntry[]): number =>
  entries.filter(isStop).length;

/** The Piece a Play-through starts at: the first it stops at, or none when it would skip them all. */
export const firstStop = <P extends PlaythroughPiece>(
  entries: readonly PlaythroughEntry<P>[],
): PlaythroughEntry<P> | undefined => entries.find(isStop);

/** A Piece's label in the Overview: what the Singer would hear, with `Skipped · ` before a skipped one. */
export const overviewRowText = (entry: PlaythroughEntry): string =>
  entry.kind === 'skip' ? `Skipped · ${entry.heard.text}` : entry.heard.text;

/** The Overview's Play button: `Play through · 3 Pieces`, or `1 Piece`. */
export const playButtonText = (count: number): string =>
  `Play through · ${String(count)} ${count === 1 ? 'Piece' : 'Pieces'}`;

/** What a Singer picked in the part indicator: leave it to the default, or play this one once. */
export type PartChoice =
  | { readonly type: 'default' }
  | { readonly type: 'combined' }
  | { readonly type: 'part'; readonly voicePartId: string };

export const defaultChoice: PartChoice = { type: 'default' };

/**
 * The track a Piece plays for this choice; with no choice, the default for the Singer's Voice Part
 * and their prefer-my-Voice-Part option.
 */
export const trackForChoice = <T extends PlaythroughTrack>(
  tracks: readonly T[],
  voicePartId: string | null,
  choice: PartChoice,
  preference: TrackPreference,
): T | undefined => {
  switch (choice.type) {
    case 'default':
      return chooseTrack(tracks, voicePartId, preference);
    case 'combined':
      return combinedTrack(tracks);
    case 'part':
      return partTrack(tracks, choice.voicePartId);
  }
};

/** What the part indicator offers on a Piece: All if it has a Combined Track, and each Voice Part that has a track. */
export const choiceOptions = (
  tracks: readonly PlaythroughTrack[],
): { readonly hasCombined: boolean; readonly voicePartIds: ReadonlySet<string> } => ({
  hasCombined: combinedTrack(tracks) !== undefined,
  voicePartIds: new Set(
    tracks.flatMap(({ source }) => (source.type === 'part' ? [source.voicePartId] : [])),
  ),
});
