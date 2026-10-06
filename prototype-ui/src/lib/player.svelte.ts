// PROTOTYPE: fake in-memory audio player. No real audio. Time runs at SPEED x so
// auto-advance and the empty-Piece pause are quick to see.
import { PERFORMANCES, performance, piece, resolveTrack, type Performance, type Piece, type Track } from './data';

export const SPEED = 8;
export const player = $state({ track: null as Track | null, playing: false, pos: 0 });
let onEnd: (() => void) | null = null;

export function load(track: Track, autoplay = true) {
  player.track = track;
  player.pos = 0;
  player.playing = autoplay;
}
export function toggle() {
  if (player.track) player.playing = !player.playing;
}
export function seek(s: number) {
  player.pos = s;
}
export function skipBy(d: number) {
  if (player.track) player.pos = Math.min(player.track.durationSec, Math.max(0, player.pos + d));
}
export function stop() {
  player.track = null;
  player.playing = false;
  player.pos = 0;
}
/** play this track, or toggle if it is already the loaded one */
export function playTrack(t: Track) {
  if (player.track?.id === t.id) toggle();
  else load(t);
}
export const isCurrent = (t: Track) => player.track?.id === t.id;
export const isPlaying = (t: Track) => isCurrent(t) && player.playing;

if (typeof window !== 'undefined') {
  setInterval(() => {
    if (!player.playing || !player.track) return;
    const n = player.pos + 0.25 * SPEED;
    if (n >= player.track.durationSec) {
      player.pos = player.track.durationSec;
      player.playing = false;
      onEnd?.();
    } else player.pos = n;
  }, 250);
}

// ---- Performance play-through session ----
export const options = $state({ skipEmpty: false, preferCombined: false });
export const session = $state({ perfId: null as string | null, pieceId: null as string | null, done: false });

export type QueueItem = { piece: Piece; track: Track | null };
export const queueOf = (perf: Performance): QueueItem[] =>
  perf.pieceIds
    .map((id) => piece(id))
    .map((p) => ({ piece: p, track: resolveTrack(p, options.preferCombined) }))
    .filter((q) => !(options.skipEmpty && q.track === null));

export const currentItem = (): QueueItem | null => {
  if (!session.perfId) return null;
  const q = queueOf(performance(session.perfId));
  return q.find((x) => x.piece.id === session.pieceId) ?? q[0] ?? null;
};
export const emptyPaused = () => session.perfId !== null && !session.done && currentItem()?.track === null;

function enter(item: QueueItem | undefined) {
  if (!item) return;
  session.pieceId = item.piece.id;
  session.done = false;
  if (item.track) load(item.track);
  else stop();
}
export function startPlaythrough(perfId: string) {
  session.perfId = perfId;
  enter(queueOf(performance(perfId))[0]);
}
export function endPlaythrough() {
  session.perfId = null;
  session.pieceId = null;
  stop();
}
export function go(delta: number) {
  if (!session.perfId) return;
  const q = queueOf(performance(session.perfId));
  const i = q.findIndex((x) => x.piece.id === session.pieceId);
  const target = q[i + delta];
  if (target) enter(target);
  else if (delta > 0) {
    session.done = true;
    stop();
  }
}
export function jumpTo(pieceId: string) {
  if (!session.perfId) return;
  enter(queueOf(performance(session.perfId)).find((x) => x.piece.id === pieceId));
}
onEnd = () => go(1);
void PERFORMANCES;
