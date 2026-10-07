// Display Mode: the shell side of dark mode. The pre-paint script in app.html mirrors resolveDark.
import { Effect, Schema } from 'effect';

export const DisplayMode = Schema.Literals(['system', 'light', 'dark']);
export type DisplayMode = typeof DisplayMode.Type;

export const displayModeStorageKey = 'prova-display-mode';

export const resolveDark = (mode: DisplayMode, systemPrefersDark: boolean): boolean =>
  mode === 'dark' || (mode === 'system' && systemPrefersDark);

const decodeDisplayMode = Schema.decodeUnknownEffect(DisplayMode);

/** Reads the saved Display Mode, falling back to `system` when nothing valid is saved. */
export const loadDisplayMode: Effect.Effect<DisplayMode> = Effect.try(() =>
  localStorage.getItem(displayModeStorageKey),
).pipe(
  Effect.flatMap(decodeDisplayMode),
  Effect.orElseSucceed((): DisplayMode => 'system'),
);

export const saveDisplayMode = (mode: DisplayMode): Effect.Effect<void> =>
  Effect.sync(() => {
    localStorage.setItem(displayModeStorageKey, mode);
    document.documentElement.classList.toggle(
      'dark',
      resolveDark(mode, matchMedia('(prefers-color-scheme: dark)').matches),
    );
  });
