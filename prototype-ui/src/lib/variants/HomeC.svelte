<script lang="ts">
  // Variant C "Hero + card grid": one big next-Performance hero with the primary action, other
  // Performances beside it, then Repertoire as a responsive card grid (Past in a second tab).
  import { Tabs } from 'bits-ui';
  import Play from '@lucide/svelte/icons/play';
  import { PIECES, SINGER, daysUntil, fmtDate, past, piece, upcoming } from '../data';
  import Btn from '../ui/Btn.svelte';
  import PartDots from '../ui/PartDots.svelte';
  const [next, ...later] = upcoming();
  const tab = 'min-h-10 rounded-full px-4 text-sm font-medium text-zinc-600 data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:text-zinc-400 dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900';
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-10 lg:py-10">
  <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
    {#if next}
      <section class="flex flex-col justify-between gap-6 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white lg:min-h-72 lg:p-10">
        <div>
          <p class="text-sm text-violet-200">Next Performance · in {daysUntil(next.date)} days</p>
          <h1 class="mt-1 text-3xl font-semibold tracking-tight lg:text-5xl">{next.title}</h1>
          <p class="mt-2 text-violet-100">{fmtDate(next.date)} · {next.venue}</p>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <Btn href="/perform/{next.id}" class="!bg-white !text-violet-700 hover:!bg-violet-50"><Play class="size-5" /> Start play-through</Btn>
          <span class="text-sm text-violet-100">Singing {SINGER.part} · {next.pieceIds.length} Pieces</span>
        </div>
      </section>
    {/if}
    <section class="flex flex-col gap-3">
      {#each later as perf (perf.id)}
        <a href="/perform/{perf.id}" class="rounded-2xl border border-zinc-200 bg-white p-4 hover:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900">
          <p class="text-xs text-zinc-500">{fmtDate(perf.date)} · {perf.venue}</p>
          <h2 class="font-semibold">{perf.title}</h2>
          <p class="mt-1 text-sm text-zinc-500">{perf.pieceIds.map((id) => piece(id).title).join(' · ')}</p>
        </a>
      {/each}
    </section>
  </div>

  <Tabs.Root value="repertoire" class="mt-10">
    <Tabs.List class="inline-flex gap-1 rounded-full bg-zinc-200/70 p-1 dark:bg-zinc-800">
      <Tabs.Trigger value="repertoire" class={tab}>Repertoire</Tabs.Trigger>
      <Tabs.Trigger value="past" class={tab}>Past Performances</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="repertoire" class="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each PIECES as p (p.id)}
        <a href="/piece/{p.id}" class="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 hover:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900">
          <div><h3 class="font-semibold">{p.title}</h3><p class="text-sm text-zinc-500">{p.composer}</p></div>
          <PartDots piece={p} />
        </a>
      {/each}
    </Tabs.Content>
    <Tabs.Content value="past" class="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each past() as perf (perf.id)}
        <a href="/perform/{perf.id}" class="rounded-2xl border border-zinc-200 p-4 opacity-70 hover:opacity-100 dark:border-zinc-800"><h3 class="font-semibold">{perf.title}</h3><p class="text-sm text-zinc-500">{fmtDate(perf.date)} · archived</p></a>
      {/each}
    </Tabs.Content>
  </Tabs.Root>
</div>
