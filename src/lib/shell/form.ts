// Shell: reading a posted form. Every command decodes its form once, here, and works with the
// decoded value from then on; anything missing or malformed becomes the command's own `invalid`.
import { fail, type ActionFailure } from '@sveltejs/kit';
import { Effect, Schema } from 'effect';
import type { DatabaseRefusal } from '../core/voice-parts';

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

/**
 * Runs a command as a form action: what it answers, or a refusal carrying the message to show for
 * the problem it failed with.
 */
export const runAction =
  <Problem extends string>(messages: Readonly<Record<Problem, string>>) =>
  <A>(command: Effect.Effect<A, Problem>): Promise<A | Refusal> =>
    Effect.runPromise(
      command.pipe(
        Effect.match({
          onFailure: (problem): Refusal => fail(400, { problem: messages[problem] }),
          onSuccess: (answer) => answer,
        }),
      ),
    );
