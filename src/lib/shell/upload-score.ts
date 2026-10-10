// Shell: uploading a Score from the browser, in the same three steps as a Practice Track (ADR 0003).
// First an address for the PDF is asked for (it works only for a Singer with `append`), then the file
// goes to it with progress, then the Score is registered. Every failure comes back as the message to
// show.
import { Effect } from 'effect';
import { formActions } from '../core/paths';
import type { PieceId } from '../core/pieces';
import { scoreMessages } from '../core/score-problems';
import type { AcceptedScore, UploadRules } from '../core/upload-rules';
import { callAction, requestTicket } from './page-action';
import { uploadFile } from './storage';
import type { UploadOutcome } from './upload-track';

export type ScoreUpload = {
  readonly pieceId: PieceId;
  readonly file: File;
  readonly accepted: AcceptedScore;
  readonly label: string;
  /** Whether to make this the choir score. */
  readonly makeChoirScore: boolean;
  readonly rules: UploadRules<AcceptedScore>;
};

const upload = (
  { pieceId, file, accepted, label, makeChoirScore, rules }: ScoreUpload,
  onProgress: (fraction: number) => void,
): Effect.Effect<void, string> =>
  Effect.gen(function* () {
    const ticket = yield* requestTicket(
      formActions.scores.ticket,
      { piece: pieceId },
      scoreMessages.failed,
    );

    const sent = yield* Effect.promise(() =>
      uploadFile(ticket, file, accepted.contentType, onProgress),
    );
    if (!sent.ok) {
      return yield* Effect.fail(
        sent.problem === 'failed' ? scoreMessages.failed : rules.messages[sent.problem],
      );
    }

    yield* callAction(
      formActions.scores.add,
      {
        piece: pieceId,
        path: ticket.path,
        label,
        // A ticked box is sent; an unticked one is not.
        ...(makeChoirScore ? { choir: 'on' } : {}),
      },
      scoreMessages.failed,
    );
  });

/** Uploads the PDF and registers the Score. Answers whether it worked, or the message to show. */
export const uploadScore = (
  request: ScoreUpload,
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
