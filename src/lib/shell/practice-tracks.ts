// Shell: a Piece's Practice Tracks as the database holds them, and the commands that change them.
// Each command reads its form once, then calls one RPC; the database decides whether the caller may.
// A file reaches the bucket first (see storage.ts), and `add_practice_track` registers it.
import { fail, type ActionFailure } from '@sveltejs/kit';
import { Effect, Schema } from 'effect';
import type { PieceId } from '../core/pieces';
import {
  combinedSource,
  isTrackId,
  isTrackKind,
  trackKinds,
  type PracticeTrack,
  type TrackId,
} from '../core/practice-tracks';
import { trackMessages, trackProblemOf, type TrackProblem } from '../core/track-problems';
import { isAudioExtension } from '../core/upload-rules';
import { decodeForm } from './form';
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

const StoredFile = Schema.Struct({ object_path: Schema.String });

/** Where a track's file is stored, or null when the Piece has no such track (or it may not be read). */
export const loadTrackFile = (
  supabase: Supabase,
  piece: PieceId,
  track: TrackId,
): Effect.Effect<string | null, SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(StoredFile), () =>
    supabase.from('practice_tracks').select('object_path').eq('piece_id', piece).eq('id', track),
  ).pipe(Effect.map(([row]) => row?.object_path ?? null));

/** Where each of a Piece's track files is stored. */
export const loadPieceFiles = (
  supabase: Supabase,
  piece: PieceId,
): Effect.Effect<readonly string[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(StoredFile), () =>
    supabase.from('practice_tracks').select('object_path').eq('piece_id', piece),
  ).pipe(Effect.map((rows) => rows.map(({ object_path }) => object_path)));

const DatabaseError = Schema.Struct({
  code: Schema.optionalKey(Schema.String),
  hint: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
const isDatabaseError = Schema.is(DatabaseError);

const problemOf = (cause: unknown): TrackProblem =>
  trackProblemOf(isDatabaseError(cause) ? cause : {});

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
      startUpload(supabase, piece, extension).pipe(
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
      removeFiles(supabase, [path]).pipe(Effect.orElseSucceed(() => undefined)),
    ),
  );

type Refusal = ActionFailure<{ readonly problem: string }>;

/** Runs a command as a form action: what it answers, or a refusal carrying the message to show. */
const runAction = <A>(command: Effect.Effect<A, TrackProblem>): Promise<A | Refusal> =>
  Effect.runPromise(
    command.pipe(
      Effect.match({
        onFailure: (problem): Refusal => fail(400, { problem: trackMessages[problem] }),
        onSuccess: (answer) => answer,
      }),
    ),
  );

/** The form action that changes a track: success, or a refusal carrying the message to show. */
export const runTrackAction = (
  command: TrackCommand,
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ok: true } | Refusal> =>
  runAction(command(supabase, request).pipe(Effect.as({ ok: true } as const)));

/** The form action that answers an upload ticket, or a refusal carrying the message to show. */
export const runIssueTicket = (
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ticket: UploadTicket } | Refusal> =>
  runAction(issueTicket(supabase, request).pipe(Effect.map((ticket) => ({ ticket }))));
