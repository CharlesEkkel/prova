// Shell: the choir's Voice Parts, and a Singer's choice of their default one.
import { Data, Effect, Schema } from 'effect';
import { callSupabase, callSupabaseAs, type Supabase, type SupabaseCallFailed } from './supabase';

export const VoicePartId = Schema.String.check(Schema.isUUID()).pipe(Schema.brand('VoicePartId'));
export type VoicePartId = typeof VoicePartId.Type;

export const VoicePart = Schema.Struct({
  id: VoicePartId,
  name: Schema.String,
  short_label: Schema.String,
});
export type VoicePart = typeof VoicePart.Type;

export class NoVoicePartChosen extends Data.TaggedError('NoVoicePartChosen')<{
  readonly cause: unknown;
}> {}

const VoicePartChoice = Schema.Struct({ voice_part: VoicePartId });
const decodeVoicePartChoice = Schema.decodeUnknownEffect(VoicePartChoice);

/** The configured Voice Parts, in their set order. */
export const loadVoiceParts = (
  supabase: Supabase,
): Effect.Effect<readonly VoicePart[], SupabaseCallFailed> =>
  callSupabaseAs(Schema.Array(VoicePart), () =>
    supabase.from('voice_parts').select('id, name, short_label').order('position'),
  );

/** The Voice Part a Singer picked on the choose-part form. */
export const readVoicePartChoice = (
  request: Request,
): Effect.Effect<VoicePartId, NoVoicePartChosen> =>
  Effect.tryPromise({
    try: () => request.formData(),
    catch: (cause) => new NoVoicePartChosen({ cause }),
  }).pipe(
    Effect.flatMap((form) => decodeVoicePartChoice(Object.fromEntries(form))),
    Effect.mapError((cause) => new NoVoicePartChosen({ cause })),
    Effect.map(({ voice_part }) => voice_part),
  );

/** Saves the signed-in Singer's default Voice Part. The database refuses one that does not exist. */
export const chooseVoicePart = (
  supabase: Supabase,
  chosen: VoicePartId,
): Effect.Effect<void, SupabaseCallFailed> =>
  callSupabase(() => supabase.rpc('set_my_default_voice_part', { chosen })).pipe(Effect.asVoid);
