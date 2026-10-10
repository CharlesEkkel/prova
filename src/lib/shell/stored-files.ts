// Shell: where the files of a Piece's Practice Tracks and Scores are stored. Both tables keep the
// path of their file in `object_path`; the bucket it is in is storage.ts's business.
import { Effect, Schema } from 'effect';
import type { PieceId } from '../core/pieces';
import { callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

/** The tables whose rows each own one stored file. */
export type FileTable = 'practice_tracks' | 'scores';

const StoredFile = Schema.Struct({ object_path: Schema.String });

/** Where one row's file is stored, or null when the Piece has no such row (or it may not be read). */
export const loadObjectPath = (
  supabase: Supabase,
  table: FileTable,
  piece: PieceId,
  id: string,
): Effect.Effect<string | null, SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(StoredFile), () =>
    supabase.from(table).select('object_path').eq('piece_id', piece).eq('id', id),
  ).pipe(Effect.map(([row]) => row?.object_path ?? null));

/** Where each of a Piece's files in this table is stored. */
export const loadObjectPaths = (
  supabase: Supabase,
  table: FileTable,
  piece: PieceId,
): Effect.Effect<readonly string[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(StoredFile), () =>
    supabase.from(table).select('object_path').eq('piece_id', piece),
  ).pipe(Effect.map((rows) => rows.map(({ object_path }) => object_path)));
