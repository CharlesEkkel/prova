<script lang="ts">
  // Variant B "Setlist accordion": the whole running order is the screen. The current Piece is the open
  // accordion item with player and score; options are always visible in a side card (top card on phones).
  import { Accordion } from 'bits-ui';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import type { Performance } from '../data';
  import { currentItem, emptyPaused, jumpTo, options, queueOf, session, startPlaythrough } from '../player.svelte';
  import Btn from '../ui/Btn.svelte';
  import KindBadge from '../ui/KindBadge.svelte';
  import PauseCard from '../ui/PauseCard.svelte';
  import PlaythroughOptions from '../ui/PlaythroughOptions.svelte';
  import ScoreMock from '../ui/ScoreMock.svelte';
  import Scrubber from '../ui/Scrubber.svelte';
  import Transport from '../ui/Transport.svelte';
  let { perf }: { perf: Performance } = $props();
  const q = $derived(queueOf(perf));
  const cur = $derived(currentItem());
  const hidden = $derived(perf.pieceIds.length - q.length);
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 lg:px-10 lg:py-10">
  <a href="/" class="text-sm text-zinc-500 hover:underline">‹ Home</a>
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">{perf.title}</h1>

  <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
    <div class="order-2 lg:order-1">
      {#if session.done}
        <div class="mb-4 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900"><b>Finished the Performance 🎶</b><br /><Btn class="mt-3" size="sm" onclick={() => startPlaythrough(perf.id)}>Play again</Btn></div>
      {/if}
      <Accordion.Root type="single" value={session.done ? '' : (cur?.piece.id ?? '')} onValueChange={(v) => v && jumpTo(v)} class="flex flex-col gap-2">
        {#each q as item, i (item.piece.id)}
          <Accordion.Item value={item.piece.id} class="overflow-hidden rounded-2xl border {item.track ? 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900' : 'border-dashed border-zinc-300 dark:border-zinc-700'} data-[state=open]:border-violet-500">
            <Accordion.Header>
              <Accordion.Trigger class="group flex min-h-16 w-full items-center gap-3 px-4 text-left">
                <span class="grid size-8 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{i + 1}</span>
                <span class="min-w-0 flex-1"><span class="block truncate font-medium">{item.piece.title}</span>{#if !item.track}<span class="text-xs text-amber-700 dark:text-amber-400">no Practice Track yet</span>{/if}</span>
                {#if item.track}<KindBadge track={item.track} />{/if}
                <ChevronDown class="size-4 shrink-0 text-zinc-400 transition group-data-[state=open]:rotate-180" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content class="flex flex-col gap-4 px-4 pb-4">
              {#if item.track && !emptyPaused()}
                <Scrubber track={item.track} />
                <Transport big={false} />
              {:else}
                <PauseCard title={item.piece.title} />
              {/if}
              <ScoreMock piece={item.piece} class="h-48 lg:h-72" />
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    </div>

    <aside class="order-1 rounded-2xl border border-zinc-200 bg-white p-4 lg:sticky lg:top-6 lg:order-2 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 class="font-semibold">Options</h2>
      <PlaythroughOptions />
      {#if options.skipEmpty && hidden > 0}<p class="mt-1 text-xs text-zinc-500">{hidden} Piece hidden (no Practice Tracks)</p>{/if}
    </aside>
  </div>
</div>
