// Display Mode: the shell side of dark mode. The pre-paint script in app.html mirrors resolveDark.
import { Effect, Schema } from 'effect';

export const DisplayMode = Schema.Literals(['system', 'light', 'dark']);
export type DisplayMode = typeof DisplayMode.Type;

export const isDisplayMode = Schema.is(DisplayMode);

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

const systemQuery = () => matchMedia('(prefers-color-scheme: dark)');

/** Shows the Display Mode on the page: dark mode is a class on <html>. Returns whether it is dark. */
export const applyDisplayMode = (mode: DisplayMode): boolean => {
  const dark = resolveDark(mode, systemQuery().matches);
  document.documentElement.classList.toggle('dark', dark);
  return dark;
};

export const saveDisplayMode = (mode: DisplayMode): Effect.Effect<boolean> =>
  // Remembering is best effort (storage can be blocked); the choice still applies for this visit.
  Effect.try(() => {
    localStorage.setItem(displayModeStorageKey, mode);
  }).pipe(
    Effect.ignore,
    Effect.map(() => applyDisplayMode(mode)),
  );

/** Calls `onChange` whenever the device switches between light and dark. Returns how to stop. */
export const watchSystemPreference = (onChange: () => void): (() => void) => {
  const query = systemQuery();
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
};
