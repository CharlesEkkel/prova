// Shell: reading a posted form. Every command decodes its form once, here, and works with the
// decoded value from then on; anything missing or malformed becomes the command's own `invalid`.
import { Effect, Schema } from 'effect';

/** Decodes the form in `request` with `schema`, or fails with `invalid`. */
export const decodeForm =
  <A, I, Invalid>(schema: Schema.Codec<A, I>, invalid: Invalid) =>
  (request: Request): Effect.Effect<A, Invalid> =>
    Effect.tryPromise(() => request.formData()).pipe(
      Effect.flatMap((form) => Schema.decodeUnknownEffect(schema)(Object.fromEntries(form))),
      Effect.mapError((): Invalid => invalid),
    );
