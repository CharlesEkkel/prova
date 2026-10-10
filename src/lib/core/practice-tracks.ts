// Practice Tracks: what a track is, what an upload may be, and the words the screens use for both.
// See Practice Track, Combined Track and Part indicator in CONTEXT.md.
import type { Permission } from './permissions';
import { combinedTrackLabel, type DatabaseRefusal } from './voice-parts';

declare const trackIdBrand: unique symbol;

/** The id of a Practice Track: a UUID. */
export type TrackId = string & { readonly [trackIdBrand]: true };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isTrackId = (value: unknown): value is TrackId =>
  typeof value === 'string' && uuidPattern.test(value);

/** `raw` as a track id if it is a UUID, otherwise null. */
export const trackIdOf = (raw: string): TrackId | null => (isTrackId(raw) ? raw : null);

/** Part-only is just that line; part-predominant is that line louder over the rest. */
export type TrackKind = (typeof trackKinds)[number];

export const trackKinds = ['part-only', 'part-predominant'] as const;

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

/** The upload limit when the deployment sets none. */
export const defaultUploadLimitMiB = 10;

const bytesPerMiB = 1024 * 1024;

/** The limit in bytes, for checking a file before it is sent. */
export const uploadLimitBytes = (limitMiB: number): number => limitMiB * bytesPerMiB;

/** The limit as the screens say it: "10 MB". */
export const uploadLimitText = (limitMiB: number): string => `${limitMiB.toString()} MB`;

/** The upload limit from the deployment's setting, or the default when it is missing or not a number of whole MB. */
export const uploadLimitFrom = (setting: string | undefined): number => {
  const parsed = Number(setting?.trim());
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : defaultUploadLimitMiB;
};

/** The types a Practice Track may be: the extension, and the type sent for it (the bucket allows exactly these). */
export const acceptedAudio = [
  { extension: 'mp3', contentType: 'audio/mpeg' },
  { extension: 'm4a', contentType: 'audio/mp4' },
] as const;

/** For the file picker's `accept`, and for saying which types are fine. */
export const acceptedExtensions: string = acceptedAudio
  .map(({ extension }) => `.${extension}`)
  .join(',');

export const acceptedTypesText = 'MP3 or M4A';

export type UploadFileProblem = 'wrong-type' | 'too-large' | 'empty';

export const uploadFileMessages = (
  limitMiB: number,
): Readonly<Record<UploadFileProblem, string>> => ({
  'wrong-type': `That file is not an ${acceptedTypesText} file. Choose an .mp3 or .m4a file.`,
  'too-large': `That file is over ${uploadLimitText(limitMiB)}. Choose a smaller file, or compress it.`,
  empty: 'That file is empty. Choose another.',
});

export type FileCheck =
  | { readonly ok: true; readonly extension: string; readonly contentType: string }
  | { readonly ok: false; readonly problem: UploadFileProblem };

const extensionOf = (fileName: string): string =>
  fileName.includes('.') ? (fileName.split('.').at(-1) ?? '').toLowerCase() : '';

/** Whether a chosen file may be uploaded: right type by its extension, not empty, within the limit. */
export const checkUploadFile = (
  file: { readonly name: string; readonly size: number },
  limitMiB: number,
): FileCheck => {
  const accepted = acceptedAudio.find(({ extension }) => extension === extensionOf(file.name));
  if (accepted === undefined) return { ok: false, problem: 'wrong-type' };
  if (file.size === 0) return { ok: false, problem: 'empty' };
  if (file.size > uploadLimitBytes(limitMiB)) return { ok: false, problem: 'too-large' };
  return { ok: true, extension: accepted.extension, contentType: accepted.contentType };
};

/** Where a track's file lives in the bucket: under its Piece, named by the track's own id. */
export const trackFilePath = (pieceId: string, trackId: string, extension: string): string =>
  `${pieceId}/${trackId}.${extension}`;

/** What the storage service's answer to an upload means: the bucket turned the file down, or it failed. */
export const uploadProblemOfStatus = (status: number): UploadFileProblem | 'failed' => {
  if (status === 413) return 'too-large';
  if (status === 415) return 'wrong-type';
  return 'failed';
};

/** The wording for a kind, in the badge. */
export const kindText = (source: TrackSource): string => {
  if (source.type === 'combined') return 'Combined';
  return source.kind === 'part-only' ? 'Part only' : 'Part + mix';
};

/** What a kind means, in a sentence, for the upload dialog. */
export const kindDescription: Readonly<Record<TrackKind, string>> = {
  'part-only': 'Just that line.',
  'part-predominant': 'That line louder, over the rest.',
};

/** The three looks of a kind badge: solid, outlined and tinted, so colour is never the only cue. */
export type BadgeStyle = 'solid' | 'outlined' | 'tinted';

export const badgeStyleOf = (source: TrackSource): BadgeStyle => {
  if (source.type === 'combined') return 'solid';
  return source.kind === 'part-only' ? 'outlined' : 'tinted';
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
export const indicatorText = (source: TrackSource, nameOf: PartNames): string => {
  if (source.type === 'combined') return combinedTrackLabel;
  return `${nameOf(source.voicePartId)} ${source.kind === 'part-only' ? 'only' : '+ mix'}`;
};

/** A track's row in the panel: its label, or what it is when it has none. */
export const trackTitle = (track: PracticeTrack, nameOf: PartNames): string =>
  track.label === '' ? sourceName(track.source, nameOf) : track.label;

/** Why a change to a Practice Track was not made. */
export type TrackProblem =
  'not-allowed' | 'no-kind' | 'label-too-long' | 'no-file' | 'gone' | 'invalid' | 'failed';

export const trackMessages: Readonly<Record<TrackProblem, string>> = {
  'not-allowed': 'You do not have permission to do that.',
  'no-kind': 'Choose whether the track is part-only or part-predominant.',
  'label-too-long': `A label is up to ${trackLabelMaxLength.toString()} characters.`,
  'no-file': 'The file did not arrive. Try uploading it again.',
  gone: 'That Practice Track no longer exists.',
  invalid: 'That track could not be saved. Check the Voice Part, kind and label.',
  failed: 'That did not work. Try again in a moment.',
};

/** Which problem a refusal from the Practice Track functions means. */
export const trackProblemOf = ({ code, hint }: DatabaseRefusal): TrackProblem => {
  if (code === '42501') return 'not-allowed';
  if (code === 'P0002') return 'gone';
  if (code === '22023' && hint === 'kind') return 'no-kind';
  if (code === '22023' && hint === 'label') return 'label-too-long';
  if (code === '22023' && hint === 'file') return 'no-file';
  if (code === '22023' || code === '23505') return 'invalid';
  return 'failed';
};

/** Whether New Practice Track is shown: adding one needs `append`. */
export const mayUploadTrack = (held: readonly Permission[]): boolean => held.includes('append');

export type TrackAction = 'rename' | 'delete';

/** The row actions a Singer holding these Permissions is shown: Rename needs `update`, Delete `delete`. */
export const trackActionsFor = (held: readonly Permission[]): readonly TrackAction[] => [
  ...(held.includes('update') ? (['rename'] as const) : []),
  ...(held.includes('delete') ? (['delete'] as const) : []),
];
