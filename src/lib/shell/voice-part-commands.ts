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

const Text = Schema.String;
const NewPartForm = Schema.Struct({ name: Text, label: Text });
const EditPartForm = Schema.Struct({ ...NewPartForm.fields, part: VoicePartId });
const MovePartForm = Schema.Struct({
  part: VoicePartId,
  direction: Schema.Literals(['up', 'down']),
});
const PartForm = Schema.Struct({ part: VoicePartId });

const HasCode = Schema.Struct({ code: Schema.String });
const HasHint = Schema.Struct({ hint: Schema.String });
const isHasCode = Schema.is(HasCode);
const isHasHint = Schema.is(HasHint);

/** Which problem a failed call means, from the code and hint the database answered with. */
const problemOf = (cause: unknown): VoicePartEditProblem =>
  voicePartProblemOf({
    ...(isHasCode(cause) ? { code: cause.code } : {}),
    ...(isHasHint(cause) ? { hint: cause.hint } : {}),
  });

type RpcReply = PromiseLike<{ readonly data?: unknown; readonly error: unknown }>;

/** A command: decode the submitted form, then make one RPC call with what it said. */
const command =
  <A, I>(schema: Schema.Codec<A, I>, call: (supabase: Supabase, input: A) => RpcReply) =>
  (supabase: Supabase, request: Request): Effect.Effect<void, VoicePartEditProblem> =>
    Effect.tryPromise(() => request.formData()).pipe(
      Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(Object.fromEntries(form))),
      Effect.mapError((): VoicePartEditProblem => 'invalid'),
      Effect.flatMap((input) =>
        callSupabase(() => call(supabase, input)).pipe(
          Effect.mapError(({ cause }) => problemOf(cause)),
        ),
      ),
      Effect.asVoid,
    );

export const addVoicePart = command(NewPartForm, (supabase, { name, label }) =>
  supabase.rpc('admin_add_voice_part', { part_name: name, part_label: label }),
);

export const updateVoicePart = command(EditPartForm, (supabase, { part, name, label }) =>
  supabase.rpc('admin_update_voice_part', { target: part, part_name: name, part_label: label }),
);

export const moveVoicePart = command(MovePartForm, (supabase, { part, direction }) =>
  supabase.rpc('admin_move_voice_part', { target: part, direction }),
);

export const removeVoicePart = command(PartForm, (supabase, { part }) =>
  supabase.rpc('admin_remove_voice_part', { target: part }),
);

type Command = typeof addVoicePart;

/** What a form action returns: success, or a refusal carrying the message to show. */
export const runVoicePartAction = async (
  run: Command,
  supabase: Supabase,
  request: Request,
): Promise<{ readonly ok: true } | ActionFailure<{ readonly problem: string }>> => {
  const problem = await failureOrNull(run(supabase, request));
  return problem === null ? { ok: true } : fail(400, { problem: voicePartEditMessages[problem] });
};
