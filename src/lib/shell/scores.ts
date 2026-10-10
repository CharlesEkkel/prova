// Shell: a Piece's Scores as the database holds them, and the commands that change them. Each command
// reads its form once, then calls one RPC; the database decides whether the caller may. A file
// reaches the bucket first (see storage.ts), and `add_score` registers it.
import { Effect, Schema } from 'effect';
import type { PieceId } from '../core/pieces';
import { scoreMessages, scoreProblemOf, type ScoreProblem } from '../core/score-problems';
import { isScoreId, type Score, type ScoreId } from '../core/scores';
import { scoreFilePath } from '../core/upload-rules';
import { decodeForm, refusalOf, runAction, type Refusal } from './form';
import { PieceIdSchema } from './pieces';
import { removeFiles, startUpload, type UploadTicket } from './storage';
import { callSupabase, callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

const bucket = 'scores';

export const ScoreIdSchema = Schema.declare(isScoreId);

const ScoreRow = Schema.Struct({
  id: ScoreIdSchema,
  label: Schema.String,
  isChoirScore: Schema.Boolean,
}).pipe(Schema.encodeKeys({ isChoirScore: 'is_choir_score' }));

const scoreColumns = 'id, label, is_choir_score';

/** A Piece's Scores, the first uploaded first. */
export const loadScores = (
  supabase: Supabase,
  piece: PieceId,
): Effect.Effect<readonly Score[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(ScoreRow), () =>
    supabase
      .from('scores')
      .select(scoreColumns)
      .eq('piece_id', piece)
      .order('created_at')
      .order('id'),
  );

const StoredFile = Schema.Struct({ object_path: Schema.String });

/** Where a Score's file is stored, or null when the Piece has no such Score (or it may not be read). */
export const loadScoreFile = (
  supabase: Supabase,
  piece: PieceId,
  score: ScoreId,
): Effect.Effect<string | null, SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(StoredFile), () =>
    supabase.from('scores').select('object_path').eq('piece_id', piece).eq('id', score),
  ).pipe(Effect.map(([row]) => row?.object_path ?? null));

/** Where each of a Piece's Score files is stored. */
export const loadPieceScoreFiles = (
  supabase: Supabase,
  piece: PieceId,
): Effect.Effect<readonly string[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(StoredFile), () =>
    supabase.from('scores').select('object_path').eq('piece_id', piece),
  ).pipe(Effect.map((rows) => rows.map(({ object_path }) => object_path)));

/** Removes a Piece's Score files, once the Piece is gone. A failure leaves stray files, never a Score with no file. */
export const removeScoreFiles = (
  supabase: Supabase,
  paths: readonly string[],
): Effect.Effect<void, SupabaseCallFailed> => removeFiles(supabase, bucket, paths);

const problemOf = (cause: unknown): ScoreProblem => scoreProblemOf(refusalOf(cause));

const readForm = <A, I>(schema: Schema.Codec<A, I>) => decodeForm(schema, 'invalid' as const);

/** A command on a Score: reads its form, asks the database, and says why if it was refused. */
export type ScoreCommand<A = void> = (
  supabase: Supabase,
  request: Request,
) => Effect.Effect<A, ScoreProblem>;

const TicketForm = Schema.Struct({ piece: PieceIdSchema });

/** An address a browser may upload a new Score's PDF to, if this Singer may append. */
export const issueScoreTicket: ScoreCommand<UploadTicket> = (supabase, request) =>
  readForm(TicketForm)(request).pipe(
    Effect.flatMap(({ piece }) =>
      startUpload(supabase, bucket, (id) => scoreFilePath(piece, id)).pipe(
        Effect.mapError(({ cause }) => problemOf(cause)),
      ),
    ),
  );

// The browser sends every field as text. `choir` is "on" only when the box was ticked.
const AddForm = Schema.Struct({
  piece: PieceIdSchema,
  path: Schema.String,
  label: Schema.String,
  choir: Schema.optionalKey(Schema.String),
});

/** Registers an uploaded file as a Score of the Piece. */
export const addScore: ScoreCommand = (supabase, request) =>
  readForm(AddForm)(request).pipe(
    Effect.flatMap(({ piece, path, label, choir }) =>
      callSupabase(() =>
        supabase.rpc('add_score', {
          target_piece: piece,
          file_path: path,
          score_label: label,
          make_choir: choir === 'on',
        }),
      ).pipe(Effect.mapError(({ cause }) => problemOf(cause))),
    ),
    Effect.asVoid,
  );

const RenameForm = Schema.Struct({ score: ScoreIdSchema, label: Schema.String });
const ScoreForm = Schema.Struct({ score: ScoreIdSchema });

export const renameScore: ScoreCommand = (supabase, request) =>
  readForm(RenameForm)(request).pipe(
    Effect.flatMap(({ score, label }) =>
      callSupabase(() => supabase.rpc('rename_score', { target: score, score_label: label })).pipe(
        Effect.mapError(({ cause }) => problemOf(cause)),
      ),
    ),
    Effect.asVoid,
  );

/** Makes a Score the choir score, in place of the current one. */
export const makeChoirScore: ScoreCommand = (supabase, request) =>
  readForm(ScoreForm)(request).pipe(
    Effect.flatMap(({ score }) =>
      callSupabase(() => supabase.rpc('make_choir_score', { target: score })).pipe(
        Effect.mapError(({ cause }) => problemOf(cause)),
      ),
    ),
    Effect.asVoid,
  );

/** Deletes a Score: its row first, then its file. A failure in between leaves a stray file, never a Score with no file. */
export const deleteScore: ScoreCommand = (supabase, request) =>
  readForm(ScoreForm)(request).pipe(
    Effect.flatMap(({ score }) =>
      callSupabaseAs(Schema.String, () => supabase.rpc('delete_score', { target: score })).pipe(
        Effect.mapError(({ cause }) => problemOf(cause)),
      ),
    ),
    Effect.flatMap((path) =>
      removeFiles(supabase, bucket, [path]).pipe(Effect.orElseSucceed(() => undefined)),
    ),
  );

const runScore = runAction(scoreMessages);

/** The form action that changes a Score: success, or a refusal carrying the message to show. */
export const runScoreAction = (
  command: ScoreCommand,
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ok: true } | Refusal> =>
  runScore(command(supabase, request).pipe(Effect.as({ ok: true } as const)));

/** The form action that answers an upload ticket, or a refusal carrying the message to show. */
export const runIssueScoreTicket = (
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ticket: UploadTicket } | Refusal> =>
  runScore(issueScoreTicket(supabase, request).pipe(Effect.map((ticket) => ({ ticket }))));
