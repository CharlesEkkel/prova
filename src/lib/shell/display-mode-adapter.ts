// Thin adapter: components call these plain async functions and never see Effect types.
import { Effect } from 'effect';
import { loadDisplayMode, saveDisplayMode, type DisplayMode } from './display-mode';

export const getDisplayMode = (): Promise<DisplayMode> => Effect.runPromise(loadDisplayMode);

export const setDisplayMode = (mode: DisplayMode): Promise<void> =>
  Effect.runPromise(saveDisplayMode(mode));
