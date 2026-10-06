// PROTOTYPE: fake in-memory audio player. No real audio. Time runs at SPEED x so
// auto-advance and the empty-Piece pause are quick to see.
import { FORCE_COMBINED, OVERRIDES, SINGER, partFor, performance, piece, resolveTrack, type Performance, type Piece, type Score, type Track, type VoicePart } from './data.svelte';

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

// ---- Session: a Performance play-through (perfId set) or a single Piece (perfId null) ----
export const options = $state({ skipEmpty: false, preferCombined: false });
export const session = $state({ perfId: null as string | null, pieceId: null as string | null, started: false, done: false });

/** Score viewer. `pages` and `selected` live for one playback session, so closing and reopening the
 *  fullscreen score returns to the same page. */
export const score = $state({ open: false, pages: {} as Record<string, number>, selected: {} as Record<string, string> });

export type QueueItem = { piece: Piece; track: Track | null };
const itemFor = (p: Piece): QueueItem => ({ piece: p, track: resolveTrack(p, options.preferCombined) });
export const queueOf = (perf: Performance): QueueItem[] =>
  perf.pieceIds.map((id) => itemFor(piece(id))).filter((q) => !(options.skipEmpty && q.track === null));

export const currentItem = (): QueueItem | null => {
  if (session.perfId) {
    const q = queueOf(performance(session.perfId));
    return q.find((x) => x.piece.id === session.pieceId) ?? q[0] ?? null;
  }
  return session.pieceId ? itemFor(piece(session.pieceId)) : null;
};
export const emptyPaused = () => session.started && !session.done && currentItem()?.track === null;

export const scoreOf = (p: Piece): Score | undefined =>
  p.scores.find((s) => s.id === score.selected[p.id]) ?? p.scores.find((s) => s.choir) ?? p.scores[0];
export const pageOf = (s: Score) => score.pages[s.id] ?? 1;

function resetSessionMemory() {
  score.pages = {};
  score.selected = {};
  for (const k of Object.keys(FORCE_COMBINED)) delete FORCE_COMBINED[k];
}

function enter(item: QueueItem | undefined) {
  if (!item) return;
  session.pieceId = item.piece.id;
  session.started = true;
  session.done = false;
  if (item.track) {
    load(item.track);
    score.open = scoreOf(item.piece) !== undefined; // the score goes fullscreen while a Piece plays
  } else {
    stop();
    score.open = false;
  }
}

export function startPlaythrough(perfId: string) {
  resetSessionMemory();
  session.perfId = perfId;
  enter(queueOf(performance(perfId))[0]);
}
/** Piece view: show the player for one Piece without playing yet */
export function preparePiece(pieceId: string) {
  resetSessionMemory();
  session.perfId = null;
  session.pieceId = pieceId;
  session.started = false;
  session.done = false;
  stop();
  score.open = false;
}
export function startPiece() {
  const item = currentItem();
  if (item?.track) enter(item);
}
export function endSession() {
  session.perfId = null;
  session.pieceId = null;
  session.started = false;
  session.done = false;
  score.open = false;
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
    score.open = false; // Performance finished: leave the fullscreen score
    stop();
  }
}
export function jumpTo(pieceId: string) {
  if (!session.perfId) return;
  enter(queueOf(performance(session.perfId)).find((x) => x.piece.id === pieceId));
}
onEnd = () => {
  if (session.perfId) go(1);
  else {
    // single Piece finished: leave the fullscreen score and go back to the idle player
    session.started = false;
    score.open = false;
    stop();
  }
};

// ---- Part override for the current Piece ----
export const partChoice = (pieceId: string): VoicePart | 'All' => (FORCE_COMBINED[pieceId] ? 'All' : partFor(pieceId));

/** switch the Practice Track being played, keeping the position (parts of a Piece share a length) */
function reresolve() {
  if (!session.started) return;
  const item = currentItem();
  if (!item?.track) return stop();
  if (player.track?.id === item.track.id) return;
  const { pos, playing } = player;
  load(item.track, playing);
  player.pos = Math.min(pos, item.track.durationSec);
}
/** a Voice Part is a saved per-Piece Part Override (clearing it when it is the Singer's default part);
 *  'All' just plays the Combined Track this time */
export function setPart(pieceId: string, choice: VoicePart | 'All') {
  if (choice === 'All') FORCE_COMBINED[pieceId] = true;
  else {
    delete FORCE_COMBINED[pieceId];
    if (choice === SINGER.part) delete OVERRIDES[pieceId];
    else OVERRIDES[pieceId] = choice;
  }
  reresolve();
}
