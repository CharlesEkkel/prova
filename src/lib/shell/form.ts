// Shell: reading a posted form. Every command decodes its form once, here, and works with the
// decoded value from then on; anything missing or malformed becomes the command's own `invalid`.
import { fail, type ActionFailure } from '@sveltejs/kit';
import { Effect, Schema } from 'effect';
import type { DatabaseRefusal } from '../core/voice-parts';
import type { UploadTicket } from './storage';
import type { Supabase } from './supabase';

/** Decodes the form in `request` with `schema`, or fails with `invalid`. */
export const decodeForm =
  <A, I, Invalid>(schema: Schema.Codec<A, I>, invalid: Invalid) =>
  (request: Request): Effect.Effect<A, Invalid> =>
    Effect.tryPromise(() => request.formData()).pipe(
      Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(Object.fromEntries(form))),
      Effect.mapError((): Invalid => invalid),
    );

const DatabaseError = Schema.Struct({
  code: Schema.optionalKey(Schema.String),
  hint: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
const isDatabaseError = Schema.is(DatabaseError);

/** What the database said when it refused a call, or nothing when `cause` is not one of its refusals. */
export const refusalOf = (cause: unknown): DatabaseRefusal => (isDatabaseError(cause) ? cause : {});

export type Refusal = ActionFailure<{ readonly problem: string }>;

/** A command: reads its form, asks the database, and says why if it was refused. */
type Command<A, Problem> = (supabase: Supabase, request: Request) => Effect.Effect<A, Problem>;

/**
 * Runs commands as form actions: what they answer, or a refusal carrying the message to show for
 * the problem they failed with.
 */
export const formRunner = <Problem extends string>(messages: Readonly<Record<Problem, string>>) => {
  const run = <A>(effect: Effect.Effect<A, Problem>): Promise<A | Refusal> =>
    Effect.runPromise(
      effect.pipe(
        Effect.match({
          onFailure: (problem): Refusal => fail(400, { problem: messages[problem] }),
          onSuccess: (answer) => answer,
        }),
      ),
    );
  return {
    /** The form action that changes something: success, or a refusal. */
    command: (
      command: Command<unknown, Problem>,
      supabase: Supabase,
      request: Request,
    ): Promise<{ readonly ok: true } | Refusal> =>
      run(command(supabase, request).pipe(Effect.as({ ok: true } as const))),
    /** The form action that answers an upload ticket, or a refusal. */
    ticket: (
      issue: Command<UploadTicket, Problem>,
      supabase: Supabase,
      request: Request,
    ): Promise<{ readonly ticket: UploadTicket } | Refusal> =>
      run(issue(supabase, request).pipe(Effect.map((ticket) => ({ ticket })))),
  };
};
