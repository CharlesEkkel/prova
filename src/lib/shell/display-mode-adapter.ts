// Thin adapter: components call these plain async functions and never see Effect types.
import { Effect } from 'effect';
import {
  applyDisplayMode,
  loadDisplayMode,
  saveDisplayMode,
  watchSystemPreference,
  type DisplayMode,
} from './display-mode';

export const getDisplayMode = (): Promise<DisplayMode> => Effect.runPromise(loadDisplayMode);

/** Saves and applies the Display Mode. Resolves to whether the page is now dark. */
export const setDisplayMode = (mode: DisplayMode): Promise<boolean> =>
  Effect.runPromise(saveDisplayMode(mode));

export { applyDisplayMode, watchSystemPreference };
