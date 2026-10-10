// Play-through resolver: pure core. Chooses the Practice Track to play for a Piece, and turns a
// Performance's Pieces into an ordered list of steps. See Combined Track and Play-through in CONTEXT.md.
import type { TrackSource } from './practice-tracks';

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

export type PlaythroughStep =
  | { readonly kind: 'play'; readonly pieceId: string; readonly trackId: string }
  | { readonly kind: 'pause'; readonly pieceId: string };

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

const resolveStep = (
  piece: PlaythroughPiece,
  voicePartId: string | null,
  options: PlaythroughOptions,
): PlaythroughStep | undefined => {
  const track = chooseTrack(piece.tracks, voicePartId, options.preferVoicePart);
  if (track !== undefined) return { kind: 'play', pieceId: piece.id, trackId: track.id };
  return options.skipEmpty ? undefined : { kind: 'pause', pieceId: piece.id };
};

export const resolvePlaythrough = (
  pieces: readonly PlaythroughPiece[],
  voicePartId: string | null,
  options: PlaythroughOptions,
): readonly PlaythroughStep[] =>
  pieces
    .map((piece) => resolveStep(piece, voicePartId, options))
    .filter((step): step is PlaythroughStep => step !== undefined);

/** What a Singer picked in the part indicator: leave it to the default, or play this one once. */
export type PartChoice =
  | { readonly type: 'default' }
  | { readonly type: 'combined' }
  | { readonly type: 'part'; readonly voicePartId: string };

export const defaultChoice: PartChoice = { type: 'default' };

/** The track a Piece plays for this choice; with no choice, the default for the Singer's Voice Part. */
export const trackForChoice = <T extends PlaythroughTrack>(
  tracks: readonly T[],
  voicePartId: string | null,
  choice: PartChoice,
): T | undefined => {
  switch (choice.type) {
    case 'default':
      return chooseTrack(tracks, voicePartId, false);
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
