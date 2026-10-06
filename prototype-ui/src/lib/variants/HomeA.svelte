<script lang="ts">
  // Variant A "Split dashboard": Performances on the left, repertoire table on the right (stacked on phones).
  import { Collapsible } from 'bits-ui';
  import Play from '@lucide/svelte/icons/play';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { PIECES, SINGER, daysUntil, fmtDate, past, piece, upcoming } from '../data';
  import Btn from '../ui/Btn.svelte';
  import PartDots from '../ui/PartDots.svelte';
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Hi {SINGER.name}</h1>
  <p class="text-zinc-500">You sing {SINGER.part}.</p>

  <div class="mt-8 grid gap-10 lg:grid-cols-[2fr_3fr]">
    <section>
      <h2 class="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Upcoming Performances</h2>
      <div class="flex flex-col gap-3">
        {#each upcoming() as perf (perf.id)}
          <div class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div class="flex items-start justify-between gap-3">
              <div><h3 class="font-semibold">{perf.title}</h3><p class="text-sm text-zinc-500">{fmtDate(perf.date)} · {perf.venue}</p></div>
              <span class="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{daysUntil(perf.date)} days</span>
            </div>
            <p class="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{perf.pieceIds.length} Pieces · {perf.pieceIds.filter((id) => piece(id).tracks.length === 0).length} without Practice Tracks</p>
            <Btn href="/perform/{perf.id}" size="sm" class="mt-3"><Play class="size-4" /> Play through</Btn>
          </div>
        {/each}
      </div>
      <Collapsible.Root class="mt-4">
        <Collapsible.Trigger class="group flex min-h-10 items-center gap-1 text-sm font-medium text-violet-700 dark:text-violet-300">
          <ChevronDown class="size-4 transition group-data-[state=closed]:-rotate-90" /> Past Performances
        </Collapsible.Trigger>
        <Collapsible.Content class="mt-2 flex flex-col gap-2">
          {#each past() as perf (perf.id)}
            <a href="/perform/{perf.id}" class="rounded-xl border border-zinc-200 p-3 text-sm opacity-70 hover:opacity-100 dark:border-zinc-800">{perf.title} <span class="text-zinc-500">· {fmtDate(perf.date)}</span></a>
          {/each}
        </Collapsible.Content>
      </Collapsible.Root>
    </section>

    <section>
      <h2 class="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Repertoire · {PIECES.length} Pieces</h2>
      <ul class="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {#each PIECES as p (p.id)}
          <li>
            <a href="/piece/{p.id}" class="flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <span class="min-w-0 flex-1"><span class="block truncate font-medium">{p.title}</span><span class="block truncate text-sm text-zinc-500">{p.composer}</span></span>
              <PartDots piece={p} />
            </a>
          </li>
        {/each}
      </ul>
    </section>
  </div>
</div>
