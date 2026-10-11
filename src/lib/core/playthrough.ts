// Play-through resolver: pure core. Chooses the Practice Track to play for a Piece, and resolves
// each of a Performance's Pieces, in order, for a Play-through. See Combined Track and Play-through in CONTEXT.md.
import { indicatorText, type PartNames, type TrackSource } from './practice-tracks';

/** A track as the resolver sees it. Tracks are given in the order they were uploaded. */
export type PlaythroughTrack = {
  readonly id: string;
  readonly source: TrackSource;
};

export type PlaythroughPiece<T extends PlaythroughTrack = PlaythroughTrack> = {
  readonly id: string;
  readonly tracks: readonly T[];
};

export type PlaythroughOptions = {
  readonly skipEmpty: boolean;
  /** Off: the Combined Track first, then the Singer's part. On: the Singer's part first, then Combined. */
  readonly preferVoicePart: boolean;
};

/**
 * What a Play-through does at a Piece: play `track`, or, with no track, pause there unless
 * `skipped`.
 */
export type PlaythroughEntry<T extends PlaythroughTrack = PlaythroughTrack> = {
  readonly pieceId: string;
  readonly track: T | undefined;
  readonly skipped: boolean;
};

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
  preferVoicePart: boolean,
): T | undefined =>
  preferVoicePart
    ? (partTrack(tracks, voicePartId) ?? combinedTrack(tracks))
    : (combinedTrack(tracks) ?? partTrack(tracks, voicePartId));

const resolveEntry = <T extends PlaythroughTrack>(
  piece: PlaythroughPiece<T>,
  voicePartId: string | null,
  options: PlaythroughOptions,
): PlaythroughEntry<T> => {
  const track = chooseTrack(piece.tracks, voicePartId, options.preferVoicePart);
  return { pieceId: piece.id, track, skipped: track === undefined && options.skipEmpty };
};

/** Every Piece of a Performance, in order, with what a Play-through does there. */
export const resolvePlaythrough = <T extends PlaythroughTrack>(
  pieces: readonly PlaythroughPiece<T>[],
  voicePartId: string | null,
  options: PlaythroughOptions,
): readonly PlaythroughEntry<T>[] =>
  pieces.map((piece) => resolveEntry(piece, voicePartId, options));

/** What Home says a Singer would hear on a Piece; not `playable` when nothing would play. */
export type WhatYouWouldHear = { readonly text: string; readonly playable: boolean };

/**
 * What a Singer would hear on a Piece by default, in the part indicator's words (`All`, `Alto only`,
 * `Alto + mix`), or why nothing would play.
 */
export const whatYouWouldHear = (
  tracks: readonly PlaythroughTrack[],
  voicePartId: string | null,
  nameOf: PartNames,
  preferVoicePart: boolean,
): WhatYouWouldHear => {
  const track = chooseTrack(tracks, voicePartId, preferVoicePart);
  if (track !== undefined) return { text: indicatorText(track.source, nameOf), playable: true };
  return { text: whyNothingPlays(tracks, voicePartId, nameOf), playable: false };
};

/** Why a Singer would hear nothing on a Piece: it has no tracks, or none for them. */
const whyNothingPlays = (
  tracks: readonly PlaythroughTrack[],
  voicePartId: string | null,
  nameOf: PartNames,
): string => {
  if (tracks.length === 0) return 'No tracks yet';
  return voicePartId === null ? 'No Combined track' : `No ${nameOf(voicePartId)} track`;
};

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
  preferVoicePart: boolean,
): T | undefined => {
  switch (choice.type) {
    case 'default':
      return chooseTrack(tracks, voicePartId, preferVoicePart);
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
