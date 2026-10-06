<script lang="ts">
  // The one place a Performance gets started: every Performance tile opens this. Set the play-through
  // options, tap a Piece to start the play-through from it, or press Play at the bottom to start from Piece 1.
  import { Dialog } from 'bits-ui';
  import Play from '@lucide/svelte/icons/play';
  import X from '@lucide/svelte/icons/x';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { goto } from '$app/navigation';
  import { pieceActions } from '../actions';
  import { fmtDate, performance, piece, resolveTrack } from '../data.svelte';
  import { options, startPlaythrough } from '../player.svelte';
  import { ui } from '../ui.svelte';
  import Btn from './Btn.svelte';
  import MajorBadge from './MajorBadge.svelte';
  import ManageMenu from './ManageMenu.svelte';
  import PlaythroughOptions from './PlaythroughOptions.svelte';
  import TrackStatus from './TrackStatus.svelte';

  const perf = $derived(ui.overview ? performance(ui.overview) : null);
  const rows = $derived(
    perf
      ? perf.pieceIds.map((id) => {
          const p = piece(id);
          const track = resolveTrack(p, options.preferCombined);
          return { p, track, skipped: options.skipEmpty && track === null };
        })
      : []
  );
  const playing = $derived(rows.filter((r) => !r.skipped).length);

  function start() {
    if (!perf) return;
    startPlaythrough(perf.id);
    const href = `/perform/${perf.id}`;
    ui.overview = null;
    goto(href);
  }
  /** a Piece opens on its own, exactly as if opened from the Repertoire page */
  function openPiece(pieceId: string) {
    ui.overview = null;
    goto(`/piece/${pieceId}`);
  }
</script>

<Dialog.Root open={ui.overview !== null} onOpenChange={(o) => { if (!o) ui.overview = null; }}>
  <Dialog.Portal>
    {#if perf}
      <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <Dialog.Content class="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[88dvh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl dark:bg-zinc-900">
        <div class="flex items-start justify-between gap-3 p-5 pb-2">
          <div>
            <Dialog.Title class="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">{perf.title}{#if perf.major}<MajorBadge />{/if}</Dialog.Title>
            <Dialog.Description class="text-sm text-zinc-500">{fmtDate(perf.date)} · {perf.venue} · {perf.pieceIds.length} Pieces</Dialog.Description>
          </div>
          <Dialog.Close class="grid size-10 shrink-0 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X class="size-5" /></Dialog.Close>
        </div>

        <div class="flex-1 overflow-y-auto px-5">
          <h3 class="mt-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Play options</h3>
          <PlaythroughOptions />

          <h3 class="mt-4 mb-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Pieces</h3>
          <ol class="divide-y divide-zinc-100 dark:divide-zinc-800">
            {#each rows as r, i (r.p.id)}
              <li class="{r.skipped ? 'opacity-45' : ''}">
                <ManageMenu actions={pieceActions(r.p, perf.id)}>
                  <button onclick={() => openPiece(r.p.id)} class="group flex min-h-14 w-full items-center gap-3 py-2 text-left">
                    <span class="w-5 shrink-0 text-sm text-zinc-400">{i + 1}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-medium">{r.p.title}</span>
                      <span class="block truncate text-sm text-zinc-500">{r.p.composer}</span>
                    </span>
                    {#if r.skipped}<span class="text-xs whitespace-nowrap text-zinc-500">Skipped</span>{:else}<TrackStatus piece={r.p} preferCombined={options.preferCombined} />{/if}
                    <ChevronRight class="size-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5" />
                  </button>
                </ManageMenu>
              </li>
            {/each}
          </ol>
        </div>

        <div class="border-t border-zinc-100 p-5 dark:border-zinc-800">
          <Btn class="w-full" onclick={() => start()}><Play class="size-5 fill-current" /> Play through · {playing} {playing === 1 ? 'Piece' : 'Pieces'}</Btn>
        </div>
      </Dialog.Content>
    {/if}
  </Dialog.Portal>
</Dialog.Root>
