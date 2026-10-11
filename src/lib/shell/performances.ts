// Shell: Performances as the database holds them, decoded once at this edge, and the writes to them.
// Each command reads its form once, then calls one RPC; the database decides whether the caller may
// and whether the change is allowed.
import { Effect, Schema } from 'effect';
import {
  isPerformanceId,
  performanceMessages,
  performanceProblemOf,
  performanceTimesOf,
  type PerformanceId,
  type PerformanceProblem,
  type SidebarPerformance,
} from '../core/performances';
import type { PieceId, PieceSummary } from '../core/pieces';
import type { PlaythroughTrack, WhatYouWouldHear } from '../core/playthrough';
import { trackKinds } from '../core/practice-tracks';
import { loadChoirTimeZone } from './choir-time-zone';
import { formRunner, refusalOf } from './form';
import { PieceIdSchema } from './pieces';
import { sourceOf } from './practice-tracks';
import { callSupabase, callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

export const PerformanceIdSchema = Schema.declare(isPerformanceId);

// Rows as PostgREST sends them; timestamps become moments in `performanceOf`.
const PerformanceRow = Schema.Struct({
  id: PerformanceIdSchema,
  name: Schema.String,
  starts_at: Schema.String,
  ends_at: Schema.String,
  is_major: Schema.Boolean,
});

const performanceOf = (row: typeof PerformanceRow.Type): SidebarPerformance => ({
  id: row.id,
  name: row.name,
  startsAt: new Date(row.starts_at),
  endsAt: new Date(row.ends_at),
  isMajor: row.is_major,
});

const performanceColumns = 'id, name, starts_at, ends_at, is_major';

/** Every Performance, in no particular order; `sidebarPerformances` orders them. */
export const loadPerformances = (
  supabase: Supabase,
): Effect.Effect<readonly SidebarPerformance[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(PerformanceRow), () =>
    supabase.from('performances').select(performanceColumns),
  ).pipe(Effect.map((rows) => rows.map(performanceOf)));

/** A Performance as its Overview shows it: its details and its Pieces in running order. */
/** What the Edit Performance dialog changes: name, times and venue. */
export type PerformanceDetails = SidebarPerformance & { readonly venue: string };

export type PerformanceOverview = PerformanceDetails & {
  readonly pieces: readonly PieceSummary[];
};

const OverviewRow = Schema.Struct({
  ...PerformanceRow.fields,
  venue: Schema.String,
  performance_pieces: Schema.Array(
    Schema.Struct({
      position: Schema.Number,
      piece: Schema.Struct({ id: PieceIdSchema, title: Schema.String, composer: Schema.String }),
    }),
  ),
});

/** One Performance with its running order, or null when there is none with that id. */
export const loadOverview = (
  supabase: Supabase,
  id: PerformanceId,
): Effect.Effect<PerformanceOverview | null, SupabaseCallFailed> =>
  callSupabaseAs(Schema.NullOr(OverviewRow), () =>
    supabase
      .from('performances')
      .select(
        `${performanceColumns}, venue, performance_pieces(position, piece:pieces(id, title, composer))`,
      )
      .eq('id', id)
      .maybeSingle(),
  ).pipe(
    Effect.map((row) =>
      row === null
        ? null
        : {
            ...performanceOf(row),
            venue: row.venue,
            pieces: row.performance_pieces
              .toSorted((a, b) => a.position - b.position)
              .map(({ piece }) => piece),
          },
    ),
  );

/** A Piece as Home lists it: enough to say what the Singer would hear on it. */
export type HomePiece = PieceSummary & { readonly tracks: readonly PlaythroughTrack[] };

/** A Performance as Home shows it: its details and its Pieces, with their tracks, in running order. */
export type HomePerformance = PerformanceDetails & {
  readonly pieces: readonly HomePiece[];
};

/** A Performance as a Home tile shows it: each Piece says what the Singer would hear on it. */
export type HomeTile = Omit<HomePerformance, 'pieces'> & {
  readonly pieces: readonly (PieceSummary & { readonly heard: WhatYouWouldHear })[];
};

const HomeRow = Schema.Struct({
  ...PerformanceRow.fields,
  venue: Schema.String,
  performance_pieces: Schema.Array(
    Schema.Struct({
      position: Schema.Number,
      piece: Schema.Struct({
        id: PieceIdSchema,
        title: Schema.String,
        composer: Schema.String,
        practice_tracks: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            voice_part_id: Schema.NullOr(Schema.String),
            kind: Schema.NullOr(Schema.Literals(trackKinds)),
            created_at: Schema.String,
          }),
        ),
      }),
    }),
  ),
});

/** First uploaded first, as `loadTracks` lists them, so the resolver picks the same one. */
const byUpload = (
  a: { readonly id: string; readonly created_at: string },
  b: { readonly id: string; readonly created_at: string },
): number =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id.localeCompare(b.id);

/** Every Performance with its Pieces and their tracks, in no particular order; `homeTimeline` orders them. */
export const loadHomePerformances = (
  supabase: Supabase,
): Effect.Effect<readonly HomePerformance[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(HomeRow), () =>
    supabase
      .from('performances')
      .select(
        `${performanceColumns}, venue, performance_pieces(position, piece:pieces(id, title, composer, practice_tracks(id, voice_part_id, kind, created_at)))`,
      ),
  ).pipe(
    Effect.map((rows) =>
      rows.map((row) => ({
        ...performanceOf(row),
        venue: row.venue,
        pieces: row.performance_pieces
          .toSorted((a, b) => a.position - b.position)
          .map(({ piece: { practice_tracks, ...piece } }) => ({
            ...piece,
            tracks: practice_tracks.toSorted(byUpload).map((track) => ({
              id: track.id,
              source: sourceOf(track.voice_part_id, track.kind),
            })),
          })),
      })),
    ),
  );

const MembershipRow = Schema.Struct({ performance_id: PerformanceIdSchema });

/** The Performances a Piece is in. */
export const loadPerformancesOfPiece = (
  supabase: Supabase,
  piece: PieceId,
): Effect.Effect<readonly PerformanceId[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(MembershipRow), () =>
    supabase.from('performance_pieces').select('performance_id').eq('piece_id', piece),
  ).pipe(Effect.map((rows) => rows.map(({ performance_id }) => performance_id)));

const EntryRow = Schema.Struct({ piece_id: PieceIdSchema, performance_id: PerformanceIdSchema });

/** Which Performance each Piece is in, for every Piece at once: one entry per Piece per Performance. */
export const loadPerformanceEntries = (
  supabase: Supabase,
): Effect.Effect<
  readonly { readonly pieceId: PieceId; readonly performanceId: PerformanceId }[],
  SupabaseCallFailed
> =>
  callSupabaseAs(Schema.Array(EntryRow), () =>
    supabase.from('performance_pieces').select('piece_id, performance_id'),
  ).pipe(
    Effect.map((rows) =>
      rows.map(({ piece_id, performance_id }) => ({
        pieceId: piece_id,
        performanceId: performance_id,
      })),
    ),
  );

// Plain text for the name and venue: the database decides what they may be. The times are read in
// the Choir Time Zone, and `piece` repeats, once per Piece, in the order they were ticked.
const DetailFields = {
  name: Schema.String,
  starts: Schema.String,
  ends: Schema.String,
  venue: Schema.String,
};
const NewPerformanceForm = Schema.Struct({
  ...DetailFields,
  major: Schema.optionalKey(Schema.String),
  pieces: Schema.Array(PieceIdSchema),
});
const EditPerformanceForm = Schema.Struct({ ...DetailFields, performance: PerformanceIdSchema });
const PerformanceForm = Schema.Struct({ performance: PerformanceIdSchema });
const AddPieceForm = Schema.Struct({
  piece: PieceIdSchema,
  performances: Schema.Array(PerformanceIdSchema),
});
const RemovePieceForm = Schema.Struct({ performance: PerformanceIdSchema, piece: PieceIdSchema });
const ReorderForm = Schema.Struct({
  performance: PerformanceIdSchema,
  pieces: Schema.Array(PieceIdSchema),
});

/** A form's fields, with the repeated `piece` and `in` ones gathered into lists. */
const fieldsOf = (form: FormData): Readonly<Record<string, unknown>> => ({
  ...Object.fromEntries(form),
  pieces: form.getAll('piece'),
  performances: form.getAll('in'),
});

const readForm =
  <A, I>(schema: Schema.Codec<A, I>) =>
  (request: Request): Effect.Effect<A, PerformanceProblem> =>
    Effect.tryPromise(() => request.formData()).pipe(
      Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(fieldsOf(form))),
      Effect.mapError((): PerformanceProblem => 'invalid'),
    );

const problemOf = ({ cause }: SupabaseCallFailed): PerformanceProblem =>
  performanceProblemOf(refusalOf(cause));

/** The times a form gave, read in the Choir Time Zone, or `invalid`. */
const timesIn = (supabase: Supabase, starts: string, ends: string) =>
  loadChoirTimeZone(supabase).pipe(
    Effect.mapError((): PerformanceProblem => 'failed'),
    Effect.flatMap((zone) => {
      const times = performanceTimesOf(starts, ends, zone);
      return times === null ? Effect.fail<PerformanceProblem>('invalid') : Effect.succeed(times);
    }),
  );

/** Creates a Performance with its first Pieces, and answers with its id. */
export const createPerformance = (
  supabase: Supabase,
  request: Request,
): Effect.Effect<PerformanceId, PerformanceProblem> =>
  readForm(NewPerformanceForm)(request).pipe(
    Effect.flatMap((form) =>
      timesIn(supabase, form.starts, form.ends).pipe(
        Effect.flatMap(({ startsAt, endsAt }) =>
          callSupabaseAs(PerformanceIdSchema, () =>
            supabase.rpc('add_performance', {
              performance_name: form.name,
              performance_starts_at: startsAt.toISOString(),
              performance_ends_at: endsAt.toISOString(),
              performance_venue: form.venue,
              performance_is_major: form.major !== undefined,
              first_piece_ids: [...form.pieces],
            }),
          ).pipe(Effect.mapError(problemOf)),
        ),
      ),
    ),
  );

export const updatePerformance = (
  supabase: Supabase,
  request: Request,
): Effect.Effect<void, PerformanceProblem> =>
  readForm(EditPerformanceForm)(request).pipe(
    Effect.flatMap((form) =>
      timesIn(supabase, form.starts, form.ends).pipe(
        Effect.flatMap(({ startsAt, endsAt }) =>
          callSupabase(() =>
            supabase.rpc('update_performance', {
              target: form.performance,
              performance_name: form.name,
              performance_starts_at: startsAt.toISOString(),
              performance_ends_at: endsAt.toISOString(),
              performance_venue: form.venue,
            }),
          ).pipe(Effect.mapError(problemOf)),
        ),
      ),
    ),
    Effect.asVoid,
  );

type RpcReply = PromiseLike<{ readonly data?: unknown; readonly error: unknown }>;

/** A command that decodes its form, then makes one RPC call with what it said. */
const performanceCommand =
  <A, I>(schema: Schema.Codec<A, I>, call: (supabase: Supabase, input: A) => RpcReply) =>
  (supabase: Supabase, request: Request): Effect.Effect<void, PerformanceProblem> =>
    readForm(schema)(request).pipe(
      Effect.flatMap((input) =>
        callSupabase(() => call(supabase, input)).pipe(Effect.mapError(problemOf)),
      ),
      Effect.asVoid,
    );

export const deletePerformance = performanceCommand(PerformanceForm, (supabase, { performance }) =>
  supabase.rpc('delete_performance', { target: performance }),
);

export const addPieceToPerformances = performanceCommand(
  AddPieceForm,
  (supabase, { piece, performances }) =>
    supabase.rpc('add_piece_to_performances', {
      target_piece: piece,
      performance_ids: [...performances],
    }),
);

export const removePieceFromPerformance = performanceCommand(
  RemovePieceForm,
  (supabase, { performance, piece }) =>
    supabase.rpc('remove_piece_from_performance', {
      target_performance: performance,
      target_piece: piece,
    }),
);

export const reorderPerformance = performanceCommand(
  ReorderForm,
  (supabase, { performance, pieces }) =>
    supabase.rpc('reorder_performance', { target: performance, ordered: [...pieces] }),
);

/** Runs Performance commands as form actions, with the messages a refusal shows. */
export const performanceForm = formRunner(performanceMessages);
