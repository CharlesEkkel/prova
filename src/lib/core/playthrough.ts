// Play-through resolver: pure core. Turns a Performance's Pieces into an ordered list of steps.

export type VoicePart = 'soprano' | 'alto' | 'tenor' | 'bass';

export type PlaythroughTrack = {
  readonly id: string;
  readonly voicePart: VoicePart | 'combined';
};

export type PlaythroughPiece = {
  readonly id: string;
  readonly tracks: readonly PlaythroughTrack[];
};

export type PlaythroughOptions = {
  readonly skipEmpty: boolean;
  readonly preferCombined: boolean;
};

export type PlaythroughStep =
  | { readonly kind: 'play'; readonly pieceId: string; readonly trackId: string }
  | { readonly kind: 'pause'; readonly pieceId: string };

const findTrack = (
  piece: PlaythroughPiece,
  voicePart: PlaythroughTrack['voicePart'],
): PlaythroughTrack | undefined => piece.tracks.find((t) => t.voicePart === voicePart);

const chooseTrack = (
  piece: PlaythroughPiece,
  singerPart: VoicePart,
  preferCombined: boolean,
): PlaythroughTrack | undefined =>
  preferCombined
    ? (findTrack(piece, 'combined') ?? findTrack(piece, singerPart))
    : (findTrack(piece, singerPart) ?? findTrack(piece, 'combined'));

const resolveStep = (
  piece: PlaythroughPiece,
  singerPart: VoicePart,
  options: PlaythroughOptions,
): PlaythroughStep | undefined => {
  const track = chooseTrack(piece, singerPart, options.preferCombined);
  if (track !== undefined) return { kind: 'play', pieceId: piece.id, trackId: track.id };
  return options.skipEmpty ? undefined : { kind: 'pause', pieceId: piece.id };
};

export const resolvePlaythrough = (
  pieces: readonly PlaythroughPiece[],
  singerPart: VoicePart,
  options: PlaythroughOptions,
): readonly PlaythroughStep[] =>
  pieces
    .map((piece) => resolveStep(piece, singerPart, options))
    .filter((step): step is PlaythroughStep => step !== undefined);
