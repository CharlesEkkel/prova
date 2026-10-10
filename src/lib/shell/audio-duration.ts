// Shell: how long a chosen audio file is, read from the file itself in the browser. Advisory: it is
// stored so the Practice Tracks panel can show a length, and it is null when the browser cannot say.

const giveUpAfterMs = 4000;

/** The file's length in whole seconds, or null if it cannot be read quickly. */
export const readDurationSeconds = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    const finish = (seconds: number | null): void => {
      URL.revokeObjectURL(url);
      probe.removeAttribute('src');
      resolve(seconds);
    };
    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => {
      finish(Number.isFinite(probe.duration) ? Math.round(probe.duration) : null);
    });
    probe.addEventListener('error', () => {
      finish(null);
    });
    setTimeout(() => {
      finish(null);
    }, giveUpAfterMs);
    probe.src = url;
  });
