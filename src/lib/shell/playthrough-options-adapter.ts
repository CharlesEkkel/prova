// Thin adapter: components call these plain async functions and never see Effect types.
import { Effect } from 'effect';
import type { PlaythroughOptions } from '../core/playthrough';
import { loadPlaythroughOptions, savePlaythroughOptions } from './playthrough-options';

export const getPlaythroughOptions = (): Promise<PlaythroughOptions> =>
  Effect.runPromise(loadPlaythroughOptions);

export const setPlaythroughOptions = (options: PlaythroughOptions): Promise<void> =>
  Effect.runPromise(savePlaythroughOptions(options));
