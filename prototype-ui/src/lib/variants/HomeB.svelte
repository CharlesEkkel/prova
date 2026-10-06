<script lang="ts">
  // Variant B "Timeline + tabs": a vertical timeline through time (past collapsed above Today), with
  // Repertoire one tab away. On wide screens each Performance node shows its Pieces as a two-column grid.
  import { Collapsible, Tabs } from 'bits-ui';
  import Play from '@lucide/svelte/icons/play';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { PIECES, TODAY, fmtDate, past, piece, upcoming } from '../data';
  import Btn from '../ui/Btn.svelte';
  import PartDots from '../ui/PartDots.svelte';
  const tab = 'min-h-11 flex-1 border-b-2 border-transparent px-4 text-sm font-medium text-zinc-500 data-[state=active]:border-violet-600 data-[state=active]:text-violet-700 lg:flex-none dark:data-[state=active]:text-violet-300';
</script>

<div class="mx-auto w-full max-w-5xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Plan</h1>
  <Tabs.Root value="timeline" class="mt-4">
    <Tabs.List class="flex border-b border-zinc-200 dark:border-zinc-800">
      <Tabs.Trigger value="timeline" class={tab}>Timeline</Tabs.Trigger>
      <Tabs.Trigger value="repertoire" class={tab}>Repertoire</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="timeline" class="pt-6">
      <Collapsible.Root>
        <Collapsible.Trigger class="group mb-2 flex min-h-10 items-center gap-1 text-sm text-zinc-500"><ChevronDown class="size-4 transition group-data-[state=closed]:-rotate-90" /> {past().length} past Performance</Collapsible.Trigger>
        <Collapsible.Content>
          <ol class="mb-4 ml-2 border-l-2 border-zinc-200 pl-6 opacity-60 dark:border-zinc-800">
            {#each past() as perf (perf.id)}<li class="py-2"><p class="text-xs text-zinc-500">{fmtDate(perf.date)}</p><a href="/perform/{perf.id}" class="font-medium hover:underline">{perf.title}</a></li>{/each}
          </ol>
        </Collapsible.Content>
      </Collapsible.Root>

      <div class="relative ml-2 border-l-2 border-violet-600 pb-2 pl-6">
        <span class="absolute -top-1 -left-2.5 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap text-yellow-300">TODAY · {fmtDate(TODAY)}</span>
        <ol class="flex flex-col gap-8 pt-8">
          {#each upcoming() as perf (perf.id)}
            <li class="relative">
              <span class="absolute top-1.5 -left-[2.1rem] size-3 rounded-full border-2 border-zinc-50 bg-violet-600 dark:border-zinc-950"></span>
              <p class="text-sm text-zinc-500">{fmtDate(perf.date)} · {perf.venue}</p>
              <div class="mt-1 flex items-center justify-between gap-3">
                <h2 class="text-lg font-semibold">{perf.title}</h2>
                <Btn href="/perform/{perf.id}" size="sm"><Play class="size-4" /> Play through</Btn>
              </div>
              <ol class="mt-3 grid gap-2 lg:grid-cols-2">
                {#each perf.pieceIds as id, i (id)}
                  {@const p = piece(id)}
                  <li><a href="/piece/{id}" class="flex min-h-12 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 hover:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900"><span class="text-sm text-zinc-400">{i + 1}</span><span class="flex-1 truncate text-sm font-medium">{p.title}</span><PartDots piece={p} /></a></li>
                {/each}
              </ol>
            </li>
          {/each}
        </ol>
      </div>
    </Tabs.Content>

    <Tabs.Content value="repertoire" class="pt-4">
      <ul class="grid gap-2 lg:grid-cols-2">
        {#each PIECES as p (p.id)}
          <li><a href="/piece/{p.id}" class="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900"><span class="min-w-0 flex-1"><b class="block truncate">{p.title}</b><span class="text-sm text-zinc-500">{p.composer}</span></span><PartDots piece={p} /></a></li>
        {/each}
      </ul>
    </Tabs.Content>
  </Tabs.Root>
</div>
