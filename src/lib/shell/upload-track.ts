// Shell: uploading a Practice Track from the browser, in the three steps ADR 0003 describes. First an
// address for the file is asked for (it works only for a Singer with `append`), then the file goes
// to it with progress, then the track is registered. Every failure comes back as the message to show.
import { Effect } from 'effect';
import { formActions } from '../core/paths';
import type { PieceId } from '../core/pieces';
import type { TrackKind } from '../core/practice-tracks';
import { trackMessages } from '../core/track-problems';
import type { AcceptedAudio, UploadRules } from '../core/upload-rules';
import { readDurationSeconds } from './audio-duration';
import { callAction, requestTicket } from './page-action';
import { uploadFile } from './storage';

export type TrackUpload = {
  readonly pieceId: PieceId;
  readonly file: File;
  readonly accepted: AcceptedAudio;
  /** The Voice Part's id, or null for the Combined Track. */
  readonly voicePartId: string | null;
  readonly kind: TrackKind | '';
  readonly label: string;
  readonly rules: UploadRules;
};

export type UploadOutcome =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

const secondsText = (seconds: number | null): string =>
  seconds === null ? '' : seconds.toString();

const upload = (
  { pieceId, file, accepted, voicePartId, kind, label, rules }: TrackUpload,
  onProgress: (fraction: number) => void,
): Effect.Effect<void, string> =>
  Effect.gen(function* () {
    const seconds = yield* Effect.promise(() => readDurationSeconds(file));
    const ticket = yield* requestTicket(
      formActions.tracks.ticket,
      { piece: pieceId, extension: accepted.extension },
      trackMessages.failed,
    );

    const sent = yield* Effect.promise(() =>
      uploadFile(ticket, file, accepted.contentType, onProgress),
    );
    if (!sent.ok) {
      return yield* Effect.fail(
        sent.problem === 'failed' ? trackMessages.failed : rules.messages[sent.problem],
      );
    }

    yield* callAction(
      formActions.tracks.add,
      {
        piece: pieceId,
        path: ticket.path,
        part: voicePartId ?? '',
        kind: voicePartId === null ? '' : kind,
        label,
        seconds: secondsText(seconds),
      },
      trackMessages.failed,
    );
  });

/** Uploads the file and registers the track. Answers whether it worked, or the message to show. */
export const uploadPracticeTrack = (
  request: TrackUpload,
  onProgress: (fraction: number) => void,
): Promise<UploadOutcome> =>
  Effect.runPromise(
    upload(request, onProgress).pipe(
      Effect.match({
        onFailure: (message): UploadOutcome => ({ ok: false, message }),
        onSuccess: (): UploadOutcome => ({ ok: true }),
      }),
    ),
  );
