// Shell: plays one Practice Track at a time through an audio element. Nothing plays until `start`,
// and `stop` (called when the Singer leaves the screen) silences it and lets go of the file.
// `$state` is the one deliberate exception to immutability.

export type AudioPlayer = ReturnType<typeof createAudioPlayer>;

/** How a Piece plays its audio. `knownLength` is the stored length, used until the file says its own. */
export const createAudioPlayer = () => {
  let element: HTMLAudioElement | null = null;
  let started = $state(false);
  let playing = $state(false);
  // True from the moment the track finishes until it plays or is moved again.
  let ended = $state(false);
  let position = $state(0);
  let length = $state(0);
  let failed = $state(false);
  // The browser would not play without a tap first, as when a Play-through opens from a pasted link.
  let blocked = $state(false);
  let knownLength = 0;
  // Which load is current: a play that answers after a newer track was loaded says nothing about it.
  let loads = 0;

  const audio = (): HTMLAudioElement => {
    if (element !== null) return element;
    const created = new Audio();
    created.preload = 'metadata';
    created.addEventListener('play', () => {
      playing = true;
      ended = false;
    });
    created.addEventListener('pause', () => {
      playing = false;
    });
    created.addEventListener('ended', () => {
      playing = false;
      ended = true;
    });
    created.addEventListener('seeked', () => {
      if (created.currentTime < created.duration) ended = false;
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
    const thisLoad = loads;
    try {
      await audio().play();
      if (thisLoad !== loads) return;
      failed = false;
      blocked = false;
    } catch (cause) {
      if (thisLoad !== loads) return;
      // Playing before the Singer has tapped anything is refused; that asks for a tap, not an apology.
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') blocked = true;
      // A file that will not load is shown as "could not play".
      else failed = true;
    }
  };

  const load = (src: string, seconds: number | null): void => {
    const target = audio();
    loads += 1;
    knownLength = seconds ?? 0;
    length = knownLength;
    position = 0;
    failed = false;
    blocked = false;
    ended = false;
    target.src = src;
  };

  return {
    get started() {
      return started;
    },
    get playing() {
      return playing;
    },
    /** Whether the track has just played to its end. A Score viewer that follows the song leaves on it. */
    get ended() {
      return ended;
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
    /** Whether the browser wants a tap before it will play. */
    get blocked() {
      return blocked;
    },
    /**
     * Loads this track and plays it: when the Singer presses Start, or as a Play-through arrives at a
     * Piece. A browser that wants a tap first leaves it `blocked`.
     */
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
    pause: (): void => {
      element?.pause();
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
      ended = false;
      position = 0;
    },
  };
};
