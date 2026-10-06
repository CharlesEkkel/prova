<script lang="ts">
  // Variant A "Now playing + queue": a big player card; the running order sits beside it (below on
  // phones). Options live in a popover. Score is a collapsible panel under the player.
  import { Collapsible, Popover } from 'bits-ui';
  import Settings from '@lucide/svelte/icons/settings-2';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { fmt, kindLabel, type Performance } from '../data';
  import { currentItem, emptyPaused, queueOf, session, startPlaythrough } from '../player.svelte';
  import Btn from '../ui/Btn.svelte';
  import KindBadge from '../ui/KindBadge.svelte';
  import PauseCard from '../ui/PauseCard.svelte';
  import PlaythroughOptions from '../ui/PlaythroughOptions.svelte';
  import QueueList from '../ui/QueueList.svelte';
  import ScoreMock from '../ui/ScoreMock.svelte';
  import Scrubber from '../ui/Scrubber.svelte';
  import Transport from '../ui/Transport.svelte';
  let { perf }: { perf: Performance } = $props();
  const q = $derived(queueOf(perf));
  const cur = $derived(currentItem());
  const idx = $derived(q.findIndex((x) => x.piece.id === cur?.piece.id));
  const next = $derived(q[idx + 1]);
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-10 lg:py-10">
  <div class="flex items-center justify-between gap-3">
    <div><a href="/" class="text-sm text-zinc-500 hover:underline">‹ Home</a><h1 class="text-xl font-semibold tracking-tight lg:text-2xl">{perf.title}</h1></div>
    <Popover.Root>
      <Popover.Trigger><Btn variant="outline" size="sm" aria-label="Play-through options"><Settings class="size-4" /> Options</Btn></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} class="z-50 w-80 max-w-[92vw] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <h2 class="mb-1 font-semibold">Play-through options</h2>
          <PlaythroughOptions />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  </div>

  <div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
    <section class="flex flex-col gap-5">
      {#if session.done}
        <div class="rounded-3xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h2 class="text-2xl font-semibold">That's the whole Performance 🎶</h2>
          <Btn class="mt-4" onclick={() => startPlaythrough(perf.id)}>Play it again</Btn>
        </div>
      {:else if cur}
        <div class="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-5 lg:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Piece {idx + 1} of {q.length}</p>
            <h2 class="mt-1 text-3xl font-semibold tracking-tight lg:text-4xl">{cur.piece.title}</h2>
            <p class="text-zinc-500">{cur.piece.composer}</p>
          </div>
          {#if emptyPaused()}
            <PauseCard title={cur.piece.title} />
          {:else if cur.track}
            <KindBadge track={cur.track} />
            <Scrubber track={cur.track} />
            <Transport />
          {/if}
          <Collapsible.Root>
            <Collapsible.Trigger class="group flex min-h-11 items-center gap-1 text-sm font-medium text-violet-700 dark:text-violet-300"><ChevronDown class="size-4 transition group-data-[state=closed]:-rotate-90" /> Choir score</Collapsible.Trigger>
            <Collapsible.Content class="pt-2"><ScoreMock piece={cur.piece} class="h-64" /></Collapsible.Content>
          </Collapsible.Root>
        </div>
        <p class="text-sm text-zinc-500">Up next: <b class="text-zinc-900 dark:text-zinc-100">{next ? next.piece.title : 'end of the Performance'}</b>{#if next?.track} · {kindLabel(next.track)} · {fmt(next.track.durationSec)}{/if}</p>
      {/if}
    </section>

    <aside>
      <h2 class="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Running order</h2>
      <QueueList {perf} />
    </aside>
  </div>
</div>
