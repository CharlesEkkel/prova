<script lang="ts">
  // Overview of the Pieces in a Performance (the hero's quiet secondary action).
  import { Dialog } from 'bits-ui';
  import Play from '@lucide/svelte/icons/play';
  import X from '@lucide/svelte/icons/x';
  import { fmtDate, piece, type Performance } from '../data';
  import Btn from './Btn.svelte';
  import MajorBadge from './MajorBadge.svelte';
  import PartDots from './PartDots.svelte';
  import TrackStatus from './TrackStatus.svelte';
  let { perf, open = $bindable(false), parts }: { perf: Performance; open: boolean; parts: 'dots' | 'status' | 'none' } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <Dialog.Content class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl dark:bg-zinc-900">
      <div class="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <Dialog.Title class="flex items-center gap-2 text-lg font-semibold">{perf.title}{#if perf.major}<MajorBadge />{/if}</Dialog.Title>
          <Dialog.Description class="text-sm text-zinc-500">{fmtDate(perf.date)} · {perf.venue} · {perf.pieceIds.length} Pieces</Dialog.Description>
        </div>
        <Dialog.Close class="grid size-10 shrink-0 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X class="size-5" /></Dialog.Close>
      </div>
      <ol class="flex-1 divide-y divide-zinc-100 overflow-y-auto px-5 dark:divide-zinc-800">
        {#each perf.pieceIds as id, i (id)}
          {@const p = piece(id)}
          <li>
            <a href="/piece/{id}" onclick={() => (open = false)} class="flex min-h-14 items-center gap-3 py-2">
              <span class="w-5 text-sm text-zinc-400">{i + 1}</span>
              <span class="min-w-0 flex-1"><span class="block truncate font-medium">{p.title}</span><span class="block truncate text-sm text-zinc-500">{p.composer}</span></span>
              {#if parts === 'dots'}<PartDots piece={p} />{:else if parts === 'status'}<TrackStatus piece={p} />{/if}
            </a>
          </li>
        {/each}
      </ol>
      <div class="p-5 pt-3"><Btn href="/perform/{perf.id}" class="w-full"><Play class="size-4" /> Start play-through</Btn></div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
