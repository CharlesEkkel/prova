// Thin adapter: hooks and routes run shell Effects through these and get plain results back.
import { Effect } from 'effect';

/** The Effect's value, or null when it fails. */
export const valueOrNull = <A, E>(effect: Effect.Effect<A, E>): Promise<A | null> =>
  Effect.runPromise(effect.pipe(Effect.orElseSucceed(() => null)));

/** Why the Effect failed, or null when it succeeds. */
export const failureOrNull = <E>(effect: Effect.Effect<unknown, E>): Promise<E | null> =>
  Effect.runPromise(
    effect.pipe(Effect.match({ onFailure: (failure) => failure, onSuccess: () => null })),
  );
