<script lang="ts">
  // Home: a vertical timeline with the next Performance as a hero node on the rail. Every Performance tile
  // is one big click target that opens its overview, with a caret on the right; right-click (or the ⋯ button)
  // gives management actions to those allowed to use them.
  import { Collapsible } from 'bits-ui';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import { performanceActions } from '../actions';
  import { can } from '../access.svelte';
  import { SINGER, TODAY, daysUntil, fmtDate, past, piece, upcoming } from '../data.svelte';
  import { openManage } from '../manage.svelte';
  import Btn from '../ui/Btn.svelte';
  import MajorBadge from '../ui/MajorBadge.svelte';
  import ManageMenu from '../ui/ManageMenu.svelte';
  import Tile from '../ui/Tile.svelte';
  import TrackStatus from '../ui/TrackStatus.svelte';
  const next = $derived(upcoming()[0]);
  const later = $derived(upcoming().slice(1));
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-10 lg:py-10">
  <div class="flex items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Hi {SINGER.name}</h1>
      <p class="text-zinc-500">You sing {SINGER.part}.</p>
    </div>
    {#if can('append')}<Btn variant="soft" size="sm" onclick={() => openManage({ kind: 'new-performance' })}><Plus class="size-4" /> New Performance</Btn>{/if}
  </div>

  <Collapsible.Root class="mt-6">
    <Collapsible.Trigger class="group flex min-h-10 items-center gap-1 text-sm text-zinc-500"><ChevronDown class="size-4 transition group-data-[state=closed]:-rotate-90" /> {past().length} past Performance{past().length === 1 ? '' : 's'}</Collapsible.Trigger>
    <Collapsible.Content>
      <ol class="mt-1 ml-3 flex flex-col gap-1 border-l-2 border-zinc-200 pl-6 dark:border-zinc-800">
        {#each past() as perf (perf.id)}
          <li>
            <ManageMenu actions={performanceActions(perf)}>
              <Tile perfId={perf.id} label="Open {perf.title} overview" class="flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 opacity-60 hover:bg-zinc-100 hover:opacity-100 dark:hover:bg-zinc-900">
                <span><span class="block text-xs text-zinc-500">{fmtDate(perf.date)}</span><span class="font-medium">{perf.title}</span></span>
                <ChevronRight class="size-4 text-zinc-400" />
              </Tile>
            </ManageMenu>
          </li>
        {/each}
      </ol>
    </Collapsible.Content>
  </Collapsible.Root>

  <div class="relative mt-2 ml-3 border-l-2 border-violet-600/40 pl-6 lg:pl-10">
    <span class="absolute -top-0.5 -left-3 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap text-yellow-300">TODAY · {fmtDate(TODAY)}</span>

    <ol class="flex flex-col gap-10 pt-9">
      {#if next}
        <li class="relative">
          <span class="absolute top-6 -left-[2.1rem] size-4 rounded-full border-4 border-zinc-50 bg-violet-600 lg:-left-[3.1rem] dark:border-zinc-950"></span>
          <ManageMenu actions={performanceActions(next)} button="overlay" dark>
            <Tile perfId={next.id} label="Open {next.title} overview" class="block rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white hover:shadow-xl hover:brightness-110 lg:p-8">
              <p class="flex flex-wrap items-center gap-2 pr-10 text-sm text-violet-200">Next Performance · in {daysUntil(next.date)} days {#if next.major}<MajorBadge />{/if}</p>
              <div class="mt-1 flex items-center justify-between gap-3">
                <h2 class="text-3xl font-semibold tracking-tight lg:text-4xl">{next.title}</h2>
                <ChevronRight class="size-6 shrink-0 text-violet-200" />
              </div>
              <p class="mt-1 text-violet-100">{fmtDate(next.date)} · {next.venue}</p>
              <ol class="mt-5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {#each next.pieceIds as id, i (id)}
                  {@const p = piece(id)}
                  <li class="flex min-h-9 items-center gap-3 text-sm"><span class="w-4 text-violet-200">{i + 1}</span><span class="flex-1 truncate font-medium">{p.title}</span><TrackStatus piece={p} onDark /></li>
                {:else}
                  <li class="text-sm text-violet-200">No Pieces yet.</li>
                {/each}
              </ol>
            </Tile>
          </ManageMenu>
        </li>
      {/if}

      {#each later as perf (perf.id)}
        <li class="relative">
          <span class="absolute top-6 -left-[2.05rem] size-3.5 rounded-full border-2 border-zinc-50 lg:-left-[3.05rem] dark:border-zinc-950 {perf.major ? 'bg-amber-400' : 'bg-violet-600'}"></span>
          <ManageMenu actions={performanceActions(perf)} button="overlay">
            <Tile perfId={perf.id} label="Open {perf.title} overview" class="block rounded-3xl border p-4 hover:shadow-md lg:p-5 {perf.major ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400 dark:border-amber-400/30 dark:bg-amber-400/5' : 'border-zinc-200 bg-white hover:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900'}">
              <p class="pr-10 text-sm text-zinc-500">{fmtDate(perf.date)} · {perf.venue} · in {daysUntil(perf.date)} days</p>
              <div class="mt-1 flex items-center justify-between gap-3">
                <h2 class="flex items-center gap-2 text-lg font-semibold">{perf.title}{#if perf.major}<MajorBadge />{/if}</h2>
                <ChevronRight class="size-5 shrink-0 text-zinc-400" />
              </div>
              <ol class="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {#each perf.pieceIds as id, i (id)}
                  {@const p = piece(id)}
                  <li class="flex min-h-9 items-center gap-3 text-sm"><span class="w-4 text-zinc-400">{i + 1}</span><span class="flex-1 truncate font-medium">{p.title}</span><TrackStatus piece={p} /></li>
                {:else}
                  <li class="text-sm text-zinc-500">No Pieces yet.</li>
                {/each}
              </ol>
            </Tile>
          </ManageMenu>
        </li>
      {/each}
    </ol>
  </div>
</div>
