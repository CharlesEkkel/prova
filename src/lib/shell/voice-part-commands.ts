// Shell: an Admin's writes to the Voice Part list. Each command reads its form once, then calls one
// RPC; the database decides whether the caller may and whether the name and short label are allowed.
import { fail, type ActionFailure } from '@sveltejs/kit';
import { Effect, Schema } from 'effect';
import {
  voicePartEditMessages,
  voicePartProblemOf,
  type VoicePartEditProblem,
} from '../core/voice-parts';
import { failureOrNull } from './run';
import { callSupabase, type Supabase } from './supabase';
import { VoicePartId } from './voice-parts';

// Plain text here: the database decides what a name and short label may be, and says which rule broke.
const FormText = Schema.String;
const NewPartForm = Schema.Struct({ name: FormText, label: FormText });
const EditPartForm = Schema.Struct({ ...NewPartForm.fields, part: VoicePartId });
/** The Voice Parts in the order the Admin dropped them, as one `part` field per Voice Part. */
const ReorderForm = Schema.Struct({ parts: Schema.Array(VoicePartId) });
const PartForm = Schema.Struct({ part: VoicePartId });

const ErrorWithCode = Schema.Struct({ code: Schema.String });
const ErrorWithHint = Schema.Struct({ hint: Schema.String });
const hasCode = Schema.is(ErrorWithCode);
const hasHint = Schema.is(ErrorWithHint);

/** Which problem a failed call means, from the code and hint the database answered with. */
const problemOf = (cause: unknown): VoicePartEditProblem =>
  voicePartProblemOf({
    ...(hasCode(cause) ? { code: cause.code } : {}),
    ...(hasHint(cause) ? { hint: cause.hint } : {}),
  });

/** A form's fields, with the repeated `part` ones (a new order) gathered into `parts`. */
const fieldsOf = (form: FormData): Readonly<Record<string, unknown>> => ({
  ...Object.fromEntries(form),
  parts: form.getAll('part'),
});

type RpcReply = PromiseLike<{ readonly data?: unknown; readonly error: unknown }>;

/** A Voice Part command: decode the submitted form, then make one RPC call with what it said. */
const voicePartCommand =
  <A, I>(schema: Schema.Codec<A, I>, call: (supabase: Supabase, input: A) => RpcReply) =>
  (supabase: Supabase, request: Request): Effect.Effect<void, VoicePartEditProblem> =>
    Effect.tryPromise(() => request.formData()).pipe(
      Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(fieldsOf(form))),
      Effect.mapError((): VoicePartEditProblem => 'invalid'),
      Effect.flatMap((input) =>
        callSupabase(() => call(supabase, input)).pipe(
          Effect.mapError(({ cause }) => problemOf(cause)),
        ),
      ),
      Effect.asVoid,
    );

export const addVoicePart = voicePartCommand(NewPartForm, (supabase, { name, label }) =>
  supabase.rpc('admin_add_voice_part', { part_name: name, part_label: label }),
);

export const updateVoicePart = voicePartCommand(EditPartForm, (supabase, { part, name, label }) =>
  supabase.rpc('admin_update_voice_part', { target: part, part_name: name, part_label: label }),
);

export const reorderVoiceParts = voicePartCommand(ReorderForm, (supabase, { parts }) =>
  supabase.rpc('admin_reorder_voice_parts', { ordered: [...parts] }),
);

export const removeVoicePart = voicePartCommand(PartForm, (supabase, { part }) =>
  supabase.rpc('admin_remove_voice_part', { target: part }),
);

type VoicePartCommand = typeof addVoicePart;

/** What a form action returns: success, or a refusal carrying the message to show. */
export const runVoicePartAction = async (
  run: VoicePartCommand,
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ok: true } | ActionFailure<{ readonly problem: string }>> => {
  const problem = await failureOrNull(run(supabase, request));
  return problem === null ? { ok: true } : fail(400, { problem: voicePartEditMessages[problem] });
};
