// Shell: the choir's Voice Parts, and a Singer's choice of their default one.
import { Effect, Schema } from 'effect';
import { callSupabase, callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

export const VoicePartId = Schema.String.check(Schema.isUUID()).pipe(Schema.brand('VoicePartId'));
export type VoicePartId = typeof VoicePartId.Type;

/** A Voice Part as the app uses it, decoded from the database's `voice_parts` columns. */
export const VoicePart = Schema.Struct({
  id: VoicePartId,
  name: Schema.String,
  shortLabel: Schema.String,
}).pipe(Schema.encodeKeys({ shortLabel: 'short_label' }));
export type VoicePart = typeof VoicePart.Type;

/** A Voice Part as the admin portal lists it, with how many Singers have it as their default. */
export const AdminVoicePart = Schema.Struct({
  id: VoicePartId,
  name: Schema.String,
  shortLabel: Schema.String,
  singerCount: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
}).pipe(Schema.encodeKeys({ shortLabel: 'short_label', singerCount: 'singer_count' }));
export type AdminVoicePart = typeof AdminVoicePart.Type;

/** Why a Voice Part choice was not saved. */
export type VoicePartProblem = 'none-chosen' | 'unavailable';

/** What a screen says when a Singer's Voice Part choice was not saved. */
export const voicePartChoiceMessages: Readonly<Record<VoicePartProblem, string>> = {
  'none-chosen': 'Choose your Voice Part to continue.',
  unavailable: 'That Voice Part is not available. Choose another.',
};

const VoicePartChoice = Schema.Struct({ voice_part: VoicePartId });
const decodeVoicePartChoice = Schema.decodeUnknownEffect(VoicePartChoice);

/** The configured Voice Parts, in their set order. */
export const loadVoiceParts = (
  supabase: Supabase,
): Effect.Effect<readonly VoicePart[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(VoicePart), () =>
    supabase.from('voice_parts').select('id, name, short_label').order('position'),
  );

/** The Voice Part picked on the choose-part form. */
const readVoicePartChoice = (request: Request): Effect.Effect<VoicePartId, VoicePartProblem> =>
  Effect.tryPromise(() => request.formData()).pipe(
    Effect.flatMap((form) => decodeVoicePartChoice(Object.fromEntries(form))),
    Effect.mapError((): VoicePartProblem => 'none-chosen'),
    Effect.map(({ voice_part }) => voice_part),
  );

/** Saves the Voice Part picked on the choose-part form as the signed-in Singer's default. */
export const saveVoicePartChoice = (
  supabase: Supabase,
  request: Request,
): Effect.Effect<void, VoicePartProblem> =>
  readVoicePartChoice(request).pipe(
    Effect.flatMap((chosen) =>
      // The database refuses a Voice Part that does not exist.
      callSupabase(() => supabase.rpc('set_my_default_voice_part', { chosen })),
    ),
    Effect.mapError((problem) => (problem === 'none-chosen' ? problem : 'unavailable')),
    Effect.asVoid,
  );

/** The Voice Parts for the admin portal, in order, each with the Singers who would choose again. */
export const loadAdminVoiceParts = (
  supabase: Supabase,
): Effect.Effect<readonly AdminVoicePart[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(AdminVoicePart), () => supabase.rpc('admin_voice_parts'));
