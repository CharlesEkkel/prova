// Shell: uploading a Practice Track from the browser, in the three steps ADR 0003 describes. First an
// address for the file is asked for (it works only for a Singer with `append`), then the file goes
// to it with progress, then the track is registered. Every failure comes back as the message to show.
import { deserialize } from '$app/forms';
import { Effect, Schema } from 'effect';
import { actionPath, formActions } from '../core/paths';
import type { PieceId } from '../core/pieces';
import {
  trackMessages,
  uploadFileMessages,
  type FileCheck,
  type TrackKind,
} from '../core/practice-tracks';
import { readDurationSeconds } from './audio-duration';
import { uploadFile } from './storage';

type AcceptedFile = Extract<FileCheck, { readonly ok: true }>;

export type TrackUpload = {
  readonly pieceId: PieceId;
  readonly file: File;
  readonly accepted: AcceptedFile;
  /** The Voice Part's id, or null for the Combined Track. */
  readonly voicePartId: string | null;
  readonly kind: TrackKind | '';
  readonly label: string;
  readonly limitMiB: number;
};

export type UploadOutcome =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

const Ticket = Schema.Struct({
  ticket: Schema.Struct({ path: Schema.String, url: Schema.String, apiKey: Schema.String }),
});
const isTicket = Schema.is(Ticket);
const Refusal = Schema.Struct({ problem: Schema.String });
const isRefusal = Schema.is(Refusal);

/** Posts to one of the Piece page's form actions from here and reads the answer the way the page would. */
const callAction = (
  name: string,
  fields: Readonly<Record<string, string>>,
): Effect.Effect<unknown, string> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(actionPath(name), {
        method: 'POST',
        headers: { 'x-sveltekit-action': 'true' },
        body: new URLSearchParams(fields),
      });
      return deserialize(await response.text());
    },
    catch: () => trackMessages.failed,
  }).pipe(
    Effect.flatMap((result) =>
      result.type === 'success'
        ? Effect.succeed(result.data)
        : Effect.fail(
            result.type === 'failure' && isRefusal(result.data)
              ? result.data.problem
              : trackMessages.failed,
          ),
    ),
  );

const secondsText = (seconds: number | null): string =>
  seconds === null ? '' : seconds.toString();

const upload = (
  { pieceId, file, accepted, voicePartId, kind, label, limitMiB }: TrackUpload,
  onProgress: (fraction: number) => void,
): Effect.Effect<void, string> =>
  Effect.gen(function* () {
    const seconds = yield* Effect.promise(() => readDurationSeconds(file));
    const issued = yield* callAction(formActions.tracks.ticket, {
      piece: pieceId,
      extension: accepted.extension,
    });
    if (!isTicket(issued)) return yield* Effect.fail(trackMessages.failed);
    const { ticket } = issued;

    const sent = yield* Effect.promise(() =>
      uploadFile(ticket, file, accepted.contentType, onProgress),
    );
    if (!sent.ok) {
      return yield* Effect.fail(
        sent.problem === 'failed'
          ? trackMessages.failed
          : uploadFileMessages(limitMiB)[sent.problem],
      );
    }

    yield* callAction(formActions.tracks.add, {
      piece: pieceId,
      path: ticket.path,
      part: voicePartId ?? '',
      kind: voicePartId === null ? '' : kind,
      label,
      seconds: secondsText(seconds),
    });
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
