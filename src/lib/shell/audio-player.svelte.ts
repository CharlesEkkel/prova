// Shell: plays one Practice Track at a time through an audio element. Nothing plays until `start`,
// and `stop` (called when the Singer leaves the screen) silences it and lets go of the file.
// `$state` is the one deliberate exception to immutability.

export type AudioPlayer = ReturnType<typeof createAudioPlayer>;

/** How a Piece plays its audio. `knownLength` is the stored length, used until the file says its own. */
export const createAudioPlayer = () => {
  let element: HTMLAudioElement | null = null;
  let started = $state(false);
  let playing = $state(false);
  let position = $state(0);
  let length = $state(0);
  let failed = $state(false);
  let knownLength = 0;

  const audio = (): HTMLAudioElement => {
    if (element !== null) return element;
    const created = new Audio();
    created.preload = 'metadata';
    created.addEventListener('play', () => {
      playing = true;
    });
    created.addEventListener('pause', () => {
      playing = false;
    });
    created.addEventListener('ended', () => {
      playing = false;
    });
    created.addEventListener('timeupdate', () => {
      position = created.currentTime;
    });
    created.addEventListener('durationchange', () => {
      length = Number.isFinite(created.duration) ? created.duration : knownLength;
    });
    created.addEventListener('error', () => {
      failed = true;
      playing = false;
    });
    element = created;
    return created;
  };

  const play = async (): Promise<void> => {
    try {
      await audio().play();
      failed = false;
    } catch {
      // A browser refusing to play (or a file that will not load) is shown as "could not play".
      failed = true;
    }
  };

  const load = (src: string, seconds: number | null): void => {
    const target = audio();
    knownLength = seconds ?? 0;
    length = knownLength;
    position = 0;
    failed = false;
    target.src = src;
  };

  return {
    get started() {
      return started;
    },
    get playing() {
      return playing;
    },
    get position() {
      return position;
    },
    get length() {
      return length;
    },
    get failed() {
      return failed;
    },
    /** Loads this track and plays it. Only ever called by the Singer pressing Start. */
    start: async (src: string, seconds: number | null): Promise<void> => {
      started = true;
      load(src, seconds);
      await play();
    },
    /** Changes the track; keeps playing if the Singer had already started. */
    switchTo: async (src: string, seconds: number | null): Promise<void> => {
      audio().pause();
      load(src, seconds);
      if (started) await play();
    },
    toggle: async (): Promise<void> => {
      if (audio().paused) await play();
      else audio().pause();
    },
    seek: (seconds: number): void => {
      const target = audio();
      target.currentTime = Math.max(0, length > 0 ? Math.min(seconds, length) : seconds);
      position = target.currentTime;
    },
    skipBy: (seconds: number): void => {
      const target = audio();
      const next = target.currentTime + seconds;
      target.currentTime = Math.max(0, length > 0 ? Math.min(next, length) : next);
      position = target.currentTime;
    },
    /** Silences the audio and lets go of the file, for when the Singer leaves the screen. */
    stop: (): void => {
      if (element === null) return;
      element.pause();
      element.removeAttribute('src');
      element.load();
      element = null;
      started = false;
      playing = false;
      position = 0;
    },
  };
};
