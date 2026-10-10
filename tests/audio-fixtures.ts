// Small audio files made on the spot, so no binary is kept in the repository.

const frameHeader = [0xff, 0xfb, 0x90, 0x04];
/** One MPEG-1 Layer III frame at 128 kbps and 44.1 kHz: 1,152 samples, 417 bytes. */
const frameBytes = 417;
const secondsPerFrame = 1152 / 44100;

/** A silent MP3 about this long. The frames decode to silence, so a browser can play and seek it. */
export const silentMp3 = (seconds: number): Uint8Array<ArrayBuffer> => {
  const frames = Math.max(1, Math.round(seconds / secondsPerFrame));
  const bytes = new Uint8Array(frames * frameBytes);
  for (let frame = 0; frame < frames; frame += 1) bytes.set(frameHeader, frame * frameBytes);
  return bytes;
};

/** Bytes of exactly this size, for testing a size limit. The content does not matter to the bucket. */
export const bytesOfSize = (size: number): Uint8Array<ArrayBuffer> => new Uint8Array(size);
