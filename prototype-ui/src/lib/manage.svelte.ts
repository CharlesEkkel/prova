// PROTOTYPE: management actions (rename, delete, upload, tag) over the in-memory data, plus which dialog is open.
import { PERFORMANCES, PIECES, type TrackKind, type VoicePart } from './data.svelte';
import { endSession, refreshPlayback, score, session } from './player.svelte';
import { ui } from './ui.svelte';

export type Target = { type: 'piece' | 'performance' | 'track' | 'score'; id: string; pieceId?: string; name: string };
export type ManageDialog =
  | { kind: 'rename'; target: Target }
  | { kind: 'delete'; target: Target }
  | { kind: 'upload-track'; pieceId: string }
  | { kind: 'upload-score'; pieceId: string }
  | { kind: 'add-to-performance'; pieceId: string }
  | { kind: 'new-piece' }
  | { kind: 'new-performance' };

export const manage = $state<{ dialog: ManageDialog | null }>({ dialog: null });
export const openManage = (d: ManageDialog) => (manage.dialog = d);
export const closeManage = () => (manage.dialog = null);

let seq = 0;
const nid = (p: string) => `${p}-new${++seq}`;
const findPiece = (id?: string) => PIECES.find((p) => p.id === id);

export function rename(t: Target, name: string) {
  const n = name.trim();
  if (!n) return;
  if (t.type === 'piece') {
    const p = findPiece(t.id);
    if (p) p.title = n;
  } else if (t.type === 'performance') {
    const p = PERFORMANCES.find((x) => x.id === t.id);
    if (p) p.title = n;
  } else if (t.type === 'track') {
    const tr = findPiece(t.pieceId)?.tracks.find((x) => x.id === t.id);
    if (tr) tr.label = n;
  } else {
    const sc = findPiece(t.pieceId)?.scores.find((x) => x.id === t.id);
    if (sc) sc.label = n;
  }
}

export function remove(t: Target) {
  if (t.type === 'piece') {
    const i = PIECES.findIndex((p) => p.id === t.id);
    if (i >= 0) PIECES.splice(i, 1);
    PERFORMANCES.forEach((perf) => (perf.pieceIds = perf.pieceIds.filter((id) => id !== t.id)));
    if (session.pieceId === t.id) endSession();
  } else if (t.type === 'performance') {
    const i = PERFORMANCES.findIndex((p) => p.id === t.id);
    if (i >= 0) PERFORMANCES.splice(i, 1);
    if (session.perfId === t.id) endSession();
    if (ui.overview === t.id) ui.overview = null;
  } else if (t.type === 'track') {
    const p = findPiece(t.pieceId);
    if (p) p.tracks = p.tracks.filter((x) => x.id !== t.id);
    refreshPlayback();
  } else {
    const p = findPiece(t.pieceId);
    if (p) p.scores = p.scores.filter((x) => x.id !== t.id);
    delete score.selected[t.pieceId ?? ''];
    if (!p?.scores.length) score.open = false;
  }
}

export function addTrack(pieceId: string, t: { part?: VoicePart; kind: TrackKind; label?: string; durationSec: number }) {
  findPiece(pieceId)?.tracks.push({ id: nid('t'), pieceId, ...t });
}
export function addScore(pieceId: string, label: string, choir: boolean, file: string) {
  const p = findPiece(pieceId);
  if (!p) return;
  if (choir) p.scores.forEach((s) => (s.choir = false)); // only one choir score per Piece
  p.scores.push({ id: nid('s'), label, choir: choir || p.scores.length === 0, file });
}
export function makeChoirScore(pieceId: string, scoreId: string) {
  findPiece(pieceId)?.scores.forEach((s) => (s.choir = s.id === scoreId));
}
export function addPiece(title: string, composer: string): string {
  const id = nid('p');
  PIECES.push({ id, title: title.trim(), composer: composer.trim(), tracks: [], scores: [] });
  return id;
}
export function addPerformance(title: string, date: string, venue: string) {
  PERFORMANCES.push({ id: nid('w'), title: title.trim(), date, venue: venue.trim(), pieceIds: [] });
}
export function addPieceToPerformance(pieceId: string, perfId: string) {
  const perf = PERFORMANCES.find((x) => x.id === perfId);
  if (perf && !perf.pieceIds.includes(pieceId)) perf.pieceIds.push(pieceId);
}
export function removePieceFromPerformance(pieceId: string, perfId: string) {
  const perf = PERFORMANCES.find((x) => x.id === perfId);
  if (perf) perf.pieceIds = perf.pieceIds.filter((id) => id !== pieceId);
}
/** there is one major Performance at a time */
export function setMajor(perfId: string, on: boolean) {
  PERFORMANCES.forEach((p) => (p.major = on && p.id === perfId ? true : undefined));
}
