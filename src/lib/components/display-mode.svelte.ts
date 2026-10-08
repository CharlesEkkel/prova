// View model: the device's Display Mode, shared by the sidebar, the drawer and the phone header.
// `$state` is the one deliberate exception to immutability.
import {
  applyDisplayMode,
  getDisplayMode,
  setDisplayMode,
  watchSystemPreference,
} from '../shell/display-mode-adapter';
import type { DisplayMode } from '../shell/display-mode';

let mode = $state<DisplayMode>('system');
let dark = $state(false);

export const displayMode = {
  get mode() {
    return mode;
  },
  get dark() {
    return dark;
  },
  choose: async (next: DisplayMode) => {
    mode = next;
    dark = await setDisplayMode(next);
  },
  /** Reads the saved mode, and follows the device live while it is System. Returns how to stop. */
  start: async (): Promise<() => void> => {
    mode = await getDisplayMode();
    dark = applyDisplayMode(mode);
    return watchSystemPreference(() => {
      if (mode === 'system') dark = applyDisplayMode(mode);
    });
  },
};
