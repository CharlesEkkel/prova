// PROTOTYPE: which management actions a Singer sees for each kind of thing, filtered by their Permissions.
// update = rename and tag only, append = add new things, delete = remove things (see CONTEXT.md).
import type { Component } from 'svelte';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash from '@lucide/svelte/icons/trash';
import Upload from '@lucide/svelte/icons/upload';
import FileUp from '@lucide/svelte/icons/file-up';
import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
import Star from '@lucide/svelte/icons/star';
import Minus from '@lucide/svelte/icons/circle-minus';
import { can } from './access.svelte';
import type { Performance, Piece, Score, Track } from './data.svelte';
import { makeChoirScore, openManage, removePieceFromPerformance, setMajor } from './manage.svelte';

export type Action = { key: string; label: string; icon: Component<{ class?: string }>; danger?: boolean; run: () => void };

export function pieceActions(p: Piece, inPerformance?: string): Action[] {
  const a: Action[] = [];
  const target = { type: 'piece' as const, id: p.id, name: p.title };
  if (can('update')) a.push({ key: 'rename', label: 'Rename…', icon: Pencil, run: () => openManage({ kind: 'rename', target }) });
  if (can('append')) {
    a.push({ key: 'track', label: 'Upload Practice Track…', icon: Upload, run: () => openManage({ kind: 'upload-track', pieceId: p.id }) });
    a.push({ key: 'score', label: 'Upload Score…', icon: FileUp, run: () => openManage({ kind: 'upload-score', pieceId: p.id }) });
  }
  if (can('update')) {
    a.push({ key: 'tag', label: 'Add to a Performance…', icon: CalendarPlus, run: () => openManage({ kind: 'add-to-performance', pieceId: p.id }) });
    if (inPerformance) a.push({ key: 'untag', label: 'Remove from this Performance', icon: Minus, run: () => removePieceFromPerformance(p.id, inPerformance) });
  }
  if (can('delete')) a.push({ key: 'delete', label: 'Delete Piece…', icon: Trash, danger: true, run: () => openManage({ kind: 'delete', target }) });
  return a;
}

export function performanceActions(perf: Performance): Action[] {
  const a: Action[] = [];
  const target = { type: 'performance' as const, id: perf.id, name: perf.title };
  if (can('update')) {
    a.push({ key: 'rename', label: 'Rename…', icon: Pencil, run: () => openManage({ kind: 'rename', target }) });
    a.push({ key: 'major', label: perf.major ? 'Unmark as major' : 'Mark as major', icon: Star, run: () => setMajor(perf.id, !perf.major) });
  }
  if (can('delete')) a.push({ key: 'delete', label: 'Delete Performance…', icon: Trash, danger: true, run: () => openManage({ kind: 'delete', target }) });
  return a;
}

export function trackActions(t: Track, name: string): Action[] {
  const a: Action[] = [];
  const target = { type: 'track' as const, id: t.id, pieceId: t.pieceId, name };
  if (can('update')) a.push({ key: 'rename', label: 'Rename label…', icon: Pencil, run: () => openManage({ kind: 'rename', target }) });
  if (can('delete')) a.push({ key: 'delete', label: 'Delete Practice Track…', icon: Trash, danger: true, run: () => openManage({ kind: 'delete', target }) });
  return a;
}

export function scoreActions(s: Score, pieceId: string): Action[] {
  const a: Action[] = [];
  const target = { type: 'score' as const, id: s.id, pieceId, name: s.label };
  if (can('update')) {
    a.push({ key: 'rename', label: 'Rename label…', icon: Pencil, run: () => openManage({ kind: 'rename', target }) });
    if (!s.choir) a.push({ key: 'choir', label: 'Make this the choir score', icon: Star, run: () => makeChoirScore(pieceId, s.id) });
  }
  if (can('delete')) a.push({ key: 'delete', label: 'Delete Score…', icon: Trash, danger: true, run: () => openManage({ kind: 'delete', target }) });
  return a;
}
