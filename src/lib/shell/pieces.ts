// Shell: the Repertoire as the database holds it, decoded once at this edge.
import { Effect, Schema } from 'effect';
import { isPieceId, repertoireOrder, type PieceId, type RepertoireEntry } from '../core/pieces';
import { callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

export const PieceIdSchema = Schema.declare(isPieceId);

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

/** A Piece as `repertoire()` answers, with what depends on it. */
const RepertoireRow = Schema.Struct({
  id: PieceIdSchema,
  title: Schema.String,
  composer: Schema.String,
  notes: Schema.String,
  practiceTracks: Count,
  scores: Count,
  performances: Count,
}).pipe(Schema.encodeKeys({ practiceTracks: 'practice_tracks' }));

/** Every Piece, A to Z. */
export const loadRepertoire = (
  supabase: Supabase,
): Effect.Effect<readonly RepertoireEntry[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(RepertoireRow), () => supabase.rpc('repertoire')).pipe(
    Effect.map(repertoireOrder),
  );

/** One Piece, or null when there is none with that id. */
export const loadPiece = (
  supabase: Supabase,
  id: PieceId,
): Effect.Effect<RepertoireEntry | null, SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(RepertoireRow), () =>
    supabase.rpc('repertoire', { only_piece: id }),
  ).pipe(Effect.map(([piece]) => piece ?? null));
