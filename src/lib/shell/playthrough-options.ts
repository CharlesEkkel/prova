// Play-through options as this device remembers them: the Overview's switches start from these.
import { Effect, Schema } from 'effect';
import { defaultPlaythroughOptions, type PlaythroughOptions } from '../core/playthrough';

const playthroughOptionsStorageKey = 'prova-playthrough-options';

const StoredOptions = Schema.fromJsonString(
  Schema.Struct({ skipEmpty: Schema.Boolean, preferVoicePart: Schema.Boolean }),
);

const decodeStoredOptions = Schema.decodeUnknownEffect(StoredOptions);
const encodeStoredOptions = Schema.encodeEffect(StoredOptions);

/** The options this device remembers, or both off when nothing valid is saved. */
export const loadPlaythroughOptions: Effect.Effect<PlaythroughOptions> = Effect.try(() =>
  localStorage.getItem(playthroughOptionsStorageKey),
).pipe(
  Effect.flatMap(decodeStoredOptions),
  Effect.orElseSucceed(() => defaultPlaythroughOptions),
);

/** Remembers the options on this device. Best effort: storage can be blocked, and the choice still applies for this visit. */
export const savePlaythroughOptions = (options: PlaythroughOptions): Effect.Effect<void> =>
  encodeStoredOptions(options).pipe(
    Effect.flatMap((json) =>
      Effect.try(() => {
        localStorage.setItem(playthroughOptionsStorageKey, json);
      }),
    ),
    Effect.ignore,
  );
