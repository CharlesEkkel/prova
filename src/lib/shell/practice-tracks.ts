// Shell: a Piece's Practice Tracks as the database holds them, and the commands that change them.
// Each command reads its form once, then calls one RPC; the database decides whether the caller may.
// A file reaches the bucket first (see storage.ts), and `add_practice_track` registers it.
import { Effect, Schema } from 'effect';
import type { PieceId } from '../core/pieces';
import {
  combinedSource,
  isTrackId,
  isTrackKind,
  trackKinds,
  type PracticeTrack,
} from '../core/practice-tracks';
import { trackMessages, trackProblemOf, type TrackProblem } from '../core/track-problems';
import { isAudioExtension, trackFilePath } from '../core/upload-rules';
import { decodeForm, formRunner, refusalOf } from './form';
import { PieceIdSchema } from './pieces';
import { removeFiles, startUpload, type UploadTicket } from './storage';
import { callSupabase, callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

export const TrackIdSchema = Schema.declare(isTrackId);

const TrackRow = Schema.Struct({
  id: TrackIdSchema,
  voicePartId: Schema.NullOr(Schema.String),
  kind: Schema.NullOr(Schema.Literals(trackKinds)),
  label: Schema.String,
  durationSeconds: Schema.NullOr(Schema.Int),
}).pipe(Schema.encodeKeys({ voicePartId: 'voice_part_id', durationSeconds: 'duration_seconds' }));
type TrackRow = typeof TrackRow.Type;

const trackOf = ({ id, voicePartId, kind, label, durationSeconds }: TrackRow): PracticeTrack => ({
  id,
  source:
    voicePartId !== null && kind !== null ? { type: 'part', voicePartId, kind } : combinedSource,
  label,
  durationSeconds,
});

const trackColumns = 'id, voice_part_id, kind, label, duration_seconds';

/** A Piece's Practice Tracks, the first uploaded first. */
export const loadTracks = (
  supabase: Supabase,
  piece: PieceId,
): Effect.Effect<readonly PracticeTrack[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(TrackRow), () =>
    supabase
      .from('practice_tracks')
      .select(trackColumns)
      .eq('piece_id', piece)
      .order('created_at')
      .order('id'),
  ).pipe(Effect.map((rows) => rows.map(trackOf)));

const bucket = 'practice-tracks';

const problemOf = (cause: unknown): TrackProblem => trackProblemOf(refusalOf(cause));

const invalidForm: TrackProblem = 'invalid';
const readForm = <A, I>(schema: Schema.Codec<A, I>) => decodeForm(schema, invalidForm);

/** A command on a track: reads its form, asks the database, and says why if it was refused. */
export type TrackCommand<A = void> = (
  supabase: Supabase,
  request: Request,
) => Effect.Effect<A, TrackProblem>;

const TicketForm = Schema.Struct({
  piece: PieceIdSchema,
  extension: Schema.declare(isAudioExtension),
});

/** An address a browser may upload a new track's file to, if this Singer may append. */
export const issueTicket: TrackCommand<UploadTicket> = (supabase, request) =>
  readForm(TicketForm)(request).pipe(
    Effect.flatMap(({ piece, extension }) =>
      startUpload(supabase, bucket, (id) => trackFilePath(piece, id, extension)).pipe(
        Effect.mapError(({ cause }) => problemOf(cause)),
      ),
    ),
  );

// The browser sends every field as text; an empty one means "none" (the Combined Track has no part
// or kind, and a length that could not be read is blank).
const AddForm = Schema.Struct({
  piece: PieceIdSchema,
  path: Schema.String,
  part: Schema.String,
  kind: Schema.String,
  label: Schema.String,
  seconds: Schema.String,
});

const secondsOf = (text: string): number | null => {
  const seconds = Number.parseInt(text, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

/** Registers an uploaded file as a Practice Track of the Piece. */
export const addTrack: TrackCommand = (supabase, request) =>
  readForm(AddForm)(request).pipe(
    Effect.flatMap(({ piece, path, part, kind, label, seconds }) => {
      const length = secondsOf(seconds);
      return callSupabase(() =>
        supabase.rpc('add_practice_track', {
          target_piece: piece,
          file_path: path,
          track_label: label,
          ...(part === '' ? {} : { part }),
          ...(isTrackKind(kind) ? { track_kind: kind } : {}),
          ...(length === null ? {} : { track_seconds: length }),
        }),
      ).pipe(Effect.mapError(({ cause }) => problemOf(cause)));
    }),
    Effect.asVoid,
  );

const RenameForm = Schema.Struct({ track: TrackIdSchema, label: Schema.String });
const TrackForm = Schema.Struct({ track: TrackIdSchema });

export const renameTrack: TrackCommand = (supabase, request) =>
  readForm(RenameForm)(request).pipe(
    Effect.flatMap(({ track, label }) =>
      callSupabase(() =>
        supabase.rpc('rename_practice_track', { target: track, track_label: label }),
      ).pipe(Effect.mapError(({ cause }) => problemOf(cause))),
    ),
    Effect.asVoid,
  );

/** Deletes a track: its row first, then its file. A failure in between leaves a stray file, never a track with no file. */
export const deleteTrack: TrackCommand = (supabase, request) =>
  readForm(TrackForm)(request).pipe(
    Effect.flatMap(({ track }) =>
      callSupabaseAs(Schema.String, () =>
        supabase.rpc('delete_practice_track', { target: track }),
      ).pipe(Effect.mapError(({ cause }) => problemOf(cause))),
    ),
    Effect.flatMap((path) =>
      removeFiles(supabase, bucket, [path]).pipe(Effect.orElseSucceed(() => undefined)),
    ),
  );

/** Runs the track commands as the Piece page's form actions. */
export const trackForm = formRunner(trackMessages);
