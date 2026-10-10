// What a Practice Track upload may be: the accepted types, the size limit, how a chosen file is
// checked before it is sent, where it is stored, and what the storage service's refusal means.
// See Practice Track in CONTEXT.md and ADR 0003.

/** The types a Practice Track may be: the extension, and the type sent for it (the bucket allows exactly these). */
export const acceptedAudio = [
  { extension: 'mp3', contentType: 'audio/mpeg' },
  { extension: 'm4a', contentType: 'audio/mp4' },
] as const;

export type AcceptedAudio = (typeof acceptedAudio)[number];
export type AudioExtension = AcceptedAudio['extension'];

export const isAudioExtension = (value: unknown): value is AudioExtension =>
  acceptedAudio.some(({ extension }) => extension === value);

/** For the file picker's `accept`. */
export const acceptedExtensions: string = acceptedAudio
  .map(({ extension }) => `.${extension}`)
  .join(',');

export const acceptedTypesText = 'MP3 or M4A';

/** The upload limit for audio when the deployment sets none. */
export const defaultUploadLimitMiB = 10;

/** The upload limit for Scores when the deployment sets none: scanned scores are much larger than audio. */
export const defaultScoreUploadLimitMiB = 20;

const bytesPerMiB = 1024 * 1024;

/** The limit in bytes, for checking a file before it is sent. */
export const uploadLimitBytes = (limitMiB: number): number => limitMiB * bytesPerMiB;

/** The limit as the screens say it: "10 MB". */
export const uploadLimitText = (limitMiB: number): string => `${limitMiB.toString()} MB`;

/** The upload limit from the deployment's setting, or `fallback` when it is missing or not a number of whole MB. */
export const uploadLimitFrom = (
  setting: string | undefined,
  fallback: number = defaultUploadLimitMiB,
): number => {
  const parsed = Number(setting?.trim());
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
};

export type UploadFileProblem = 'wrong-type' | 'too-large' | 'empty';

export type FileCheck<Accepted = AcceptedAudio> =
  | { readonly ok: true; readonly accepted: Accepted }
  | { readonly ok: false; readonly problem: UploadFileProblem };

/** The rules for this deployment's limit, kept together: what it says, and how a chosen file is checked. */
export type UploadRules<Accepted = AcceptedAudio> = {
  readonly limitMiB: number;
  /** "10 MB". */
  readonly limitText: string;
  readonly messages: Readonly<Record<UploadFileProblem, string>>;
  /** Whether a chosen file may be uploaded: right type by its extension, not empty, within the limit. */
  readonly check: (file: { readonly name: string; readonly size: number }) => FileCheck<Accepted>;
};

const extensionOf = (fileName: string): string =>
  fileName.includes('.') ? (fileName.split('.').at(-1) ?? '').toLowerCase() : '';

type AcceptedFile = { readonly extension: string; readonly contentType: string };

/** The rules for one kind of file: what it may be, how that is said, and the limit. */
const rulesFor = <Accepted extends AcceptedFile>(
  accepted: readonly Accepted[],
  wrongTypeMessage: string,
  limitMiB: number,
): UploadRules<Accepted> => ({
  limitMiB,
  limitText: uploadLimitText(limitMiB),
  messages: {
    'wrong-type': wrongTypeMessage,
    'too-large': `That file is over ${uploadLimitText(limitMiB)}. Choose a smaller file, or compress it.`,
    empty: 'That file is empty. Choose another.',
  },
  check: (file) => {
    const found = accepted.find(({ extension }) => extension === extensionOf(file.name));
    if (found === undefined) return { ok: false, problem: 'wrong-type' };
    if (file.size === 0) return { ok: false, problem: 'empty' };
    if (file.size > uploadLimitBytes(limitMiB)) return { ok: false, problem: 'too-large' };
    return { ok: true, accepted: found };
  },
});

export const uploadRules = (limitMiB: number): UploadRules =>
  rulesFor(
    acceptedAudio,
    `That file is not an ${acceptedTypesText} file. Choose an .mp3 or .m4a file.`,
    limitMiB,
  );

/** The one type a Score may be: a PDF, and the type a browser sends for it (the bucket allows exactly this). */
export const acceptedScores = [{ extension: 'pdf', contentType: 'application/pdf' }] as const;

export type AcceptedScore = (typeof acceptedScores)[number];

/** For the Score file picker's `accept`. */
export const acceptedScoreExtensions = '.pdf';

export const acceptedScoreTypesText = 'PDF';

export const scoreUploadRules = (limitMiB: number): UploadRules<AcceptedScore> =>
  rulesFor(
    acceptedScores,
    `That file is not a ${acceptedScoreTypesText}. Choose a .pdf file.`,
    limitMiB,
  );

/** Where a track's file lives in the bucket: under its Piece, named by the track's own id. */
export const trackFilePath = (
  pieceId: string,
  trackId: string,
  extension: AudioExtension,
): string => `${pieceId}/${trackId}.${extension}`;

/** Where a Score's file lives in the bucket: under its Piece, named by the Score's own id. */
export const scoreFilePath = (pieceId: string, scoreId: string): string =>
  `${pieceId}/${scoreId}.pdf`;

/** What the status the storage service reports for an upload means: the bucket turned the file down, or it failed. */
export const uploadProblemOfStatus = (status: number): UploadFileProblem | 'failed' => {
  if (status === 413) return 'too-large';
  if (status === 415) return 'wrong-type';
  return 'failed';
};

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON (a gateway's error page, say): there is no reported status to read.
    return null;
  }
};

/** The status the storage service names in its JSON answer (`"statusCode":"413"`), or null if it names none. */
const reportedStatus = (body: string): number | null => {
  const parsed = safeJson(body);
  if (typeof parsed !== 'object' || parsed === null || !('statusCode' in parsed)) return null;
  const status = Number(parsed.statusCode);
  return Number.isFinite(status) ? status : null;
};

/**
 * What a refused upload means, from the answer to it. The storage service replies with HTTP 400 and
 * says what really happened (413 too large, 415 wrong type) in the JSON body, so that is read first.
 */
export const uploadProblemOfResponse = (
  httpStatus: number,
  body: string,
): UploadFileProblem | 'failed' => uploadProblemOfStatus(reportedStatus(body) ?? httpStatus);
