// Shell: writes to the Repertoire. Each command reads its form once, then calls one RPC; the database
// decides whether the caller may and whether the Piece is allowed.
import { fail, redirect, type ActionFailure } from '@sveltejs/kit';
import { Effect, Schema } from 'effect';
import { piecePath } from '../core/paths';
import { pieceMessages, pieceProblemOf, type PieceId, type PieceProblem } from '../core/pieces';
import { PieceIdSchema } from './pieces';
import { failureOrNull } from './run';
import { callSupabase, callSupabaseAs, type Supabase } from './supabase';

// Plain text here: the database decides what a title, composer and notes may be, and says which rule broke.
const PieceFields = { title: Schema.String, composer: Schema.String, notes: Schema.String };
const NewPieceForm = Schema.Struct(PieceFields);
const EditPieceForm = Schema.Struct({ ...PieceFields, piece: PieceIdSchema });
const PieceForm = Schema.Struct({ piece: PieceIdSchema });

const ErrorWithCode = Schema.Struct({ code: Schema.String });
const hasCode = Schema.is(ErrorWithCode);

const problemOf = (cause: unknown): PieceProblem =>
  pieceProblemOf(hasCode(cause) ? { code: cause.code } : {});

const decodeForm =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (request: Request): Effect.Effect<A, PieceProblem> =>
    Effect.tryPromise(() => request.formData()).pipe(
      Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(Object.fromEntries(form))),
      Effect.mapError((): PieceProblem => 'invalid'),
    );

/** Adds a Piece and answers with its id. */
export const addPiece = (
  supabase: Supabase,
  request: Request,
): Effect.Effect<PieceId, PieceProblem> =>
  decodeForm(NewPieceForm)(request).pipe(
    Effect.flatMap(({ title, composer, notes }) =>
      callSupabaseAs(PieceIdSchema, () =>
        supabase.rpc('add_piece', {
          piece_title: title,
          piece_composer: composer,
          piece_notes: notes,
        }),
      ).pipe(Effect.mapError(({ cause }) => problemOf(cause))),
    ),
  );

export const updatePiece = (
  supabase: Supabase,
  request: Request,
): Effect.Effect<void, PieceProblem> =>
  decodeForm(EditPieceForm)(request).pipe(
    Effect.flatMap(({ piece, title, composer, notes }) =>
      callSupabase(() =>
        supabase.rpc('update_piece', {
          target: piece,
          piece_title: title,
          piece_composer: composer,
          piece_notes: notes,
        }),
      ).pipe(Effect.mapError(({ cause }) => problemOf(cause))),
    ),
    Effect.asVoid,
  );

export const deletePiece = (
  supabase: Supabase,
  request: Request,
): Effect.Effect<void, PieceProblem> =>
  decodeForm(PieceForm)(request).pipe(
    Effect.flatMap(({ piece }) =>
      callSupabase(() => supabase.rpc('delete_piece', { target: piece })).pipe(
        Effect.mapError(({ cause }) => problemOf(cause)),
      ),
    ),
    Effect.asVoid,
  );

type Refusal = ActionFailure<{ readonly problem: string }>;

const refusal = (problem: PieceProblem): Refusal => fail(400, { problem: pieceMessages[problem] });

/** The form action that adds a Piece and opens its page, or refuses with the message to show. */
export const runAddPiece = async (supabase: Supabase, request: Request): Promise<Refusal> => {
  const outcome = await Effect.runPromise(
    addPiece(supabase, request).pipe(
      Effect.match({
        onFailure: (problem) => ({ problem }) as const,
        onSuccess: (id) => ({ id }) as const,
      }),
    ),
  );
  return 'problem' in outcome ? refusal(outcome.problem) : redirect(303, piecePath(outcome.id));
};

/** The form action that edits or deletes a Piece: success, or a refusal carrying the message. */
export const runPieceAction = async (
  run: typeof updatePiece,
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ok: true } | Refusal> => {
  const problem = await failureOrNull(run(supabase, request));
  return problem === null ? { ok: true } : refusal(problem);
};
