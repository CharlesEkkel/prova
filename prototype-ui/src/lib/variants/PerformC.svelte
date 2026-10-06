<script lang="ts">
  // Variant C "Score-first": the choir score fills the screen while you sing. Wide screens get a right
  // rail (progress, transport, up next, options); phones get a bottom control bar and a sheet for the rest.
  import { Dialog, Progress } from 'bits-ui';
  import ListMusic from '@lucide/svelte/icons/list-music';
  import { kindLabel, type Performance } from '../data';
  import { currentItem, emptyPaused, queueOf, session, startPlaythrough } from '../player.svelte';
  import Btn from '../ui/Btn.svelte';
  import PauseCard from '../ui/PauseCard.svelte';
  import PlaythroughOptions from '../ui/PlaythroughOptions.svelte';
  import QueueList from '../ui/QueueList.svelte';
  import ScoreMock from '../ui/ScoreMock.svelte';
  import Scrubber from '../ui/Scrubber.svelte';
  import Transport from '../ui/Transport.svelte';
  let { perf }: { perf: Performance } = $props();
  let sheet = $state(false);
  const q = $derived(queueOf(perf));
  const cur = $derived(currentItem());
  const idx = $derived(Math.max(0, q.findIndex((x) => x.piece.id === cur?.piece.id)));
</script>

{#snippet extras()}
  <h2 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Running order</h2>
  <QueueList {perf} />
  <h2 class="mt-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Options</h2>
  <PlaythroughOptions />
{/snippet}

<div class="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-4 lg:px-10 lg:py-8">
  <Progress.Root value={session.done ? q.length : idx + 1} max={q.length} aria-label="Piece {idx + 1} of {q.length}" class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
    <div class="h-full bg-violet-600 transition-all" style:width="{((session.done ? q.length : idx + 1) / q.length) * 100}%"></div>
  </Progress.Root>

  {#if session.done}
    <div class="m-auto text-center"><h1 class="text-2xl font-semibold">Performance finished 🎶</h1><Btn class="mt-4" onclick={() => startPlaythrough(perf.id)}>Play it again</Btn></div>
  {:else if cur}
    <div class="mt-4 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-3">
          <div><h1 class="text-xl font-semibold tracking-tight lg:text-2xl">{cur.piece.title}</h1><p class="text-sm text-zinc-500">{perf.title} · {idx + 1}/{q.length} · {cur.track ? kindLabel(cur.track) : 'no Practice Track'}</p></div>
          <Btn variant="outline" size="sm" class="lg:hidden" onclick={() => (sheet = true)}><ListMusic class="size-4" /> Queue</Btn>
        </div>
        <ScoreMock piece={cur.piece} class="min-h-80 flex-1 lg:min-h-[28rem]" />
        {#if emptyPaused()}<PauseCard title={cur.piece.title} />{/if}
      </section>

      <aside class="hidden flex-col gap-4 lg:flex">
        <div class="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {#if cur.track && !emptyPaused()}<Scrubber track={cur.track} />{/if}
          <Transport />
        </div>
        {@render extras()}
      </aside>
    </div>

    <div class="sticky bottom-0 -mx-4 mt-4 border-t border-zinc-200 bg-zinc-50/95 px-4 py-2 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {#if cur.track && !emptyPaused()}<Scrubber track={cur.track} times={false} />{/if}
      <Transport big={false} />
    </div>

    <Dialog.Root bind:open={sheet}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 lg:hidden" />
        <Dialog.Content class="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-zinc-50 p-5 shadow-2xl lg:hidden dark:bg-zinc-950">
          <Dialog.Title class="font-semibold">Queue and options</Dialog.Title>
          <Dialog.Description class="sr-only">Running order and play-through options</Dialog.Description>
          {@render extras()}
          <Dialog.Close class="mt-2 min-h-11 rounded-full bg-zinc-200 font-medium dark:bg-zinc-800">Done</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  {/if}
</div>
