<script lang="ts">
  // Home: a vertical timeline with the next Performance as a hero node on the rail. The hero's primary
  // action is the play-through; "Overview" is the quiet secondary one. `parts` controls how much
  // Voice Part info the Piece rows show: 'dots' (S A T B All), 'status' (what you'd hear), 'none'.
  import { Collapsible } from 'bits-ui';
  import Play from '@lucide/svelte/icons/play';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Star from '@lucide/svelte/icons/star';
  import { SINGER, TODAY, daysUntil, fmtDate, past, piece, upcoming, type Performance } from '../data';
  import Btn from '../ui/Btn.svelte';
  import MajorBadge from '../ui/MajorBadge.svelte';
  import PartDots from '../ui/PartDots.svelte';
  import PerformanceOverview from '../ui/PerformanceOverview.svelte';
  import TrackStatus from '../ui/TrackStatus.svelte';
  let { parts }: { parts: 'dots' | 'status' | 'none' } = $props();
  const [next, ...later] = upcoming();
  let overview = $state(false);
</script>

{#snippet pieceRow(perf: Performance, id: string, i: number)}
  {@const p = piece(id)}
  <li>
    <a href="/piece/{id}" class="flex min-h-12 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 hover:border-violet-400 dark:border-zinc-800 dark:bg-zinc-900">
      <span class="w-4 text-sm text-zinc-400">{i + 1}</span>
      <span class="flex-1 truncate text-sm font-medium">{p.title}</span>
      {#if parts === 'dots'}<PartDots piece={p} />{:else if parts === 'status'}<TrackStatus piece={p} />{/if}
    </a>
  </li>
{/snippet}

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Hi {SINGER.name}</h1>
  <p class="text-zinc-500">You sing {SINGER.part}.</p>

  <Collapsible.Root class="mt-6">
    <Collapsible.Trigger class="group flex min-h-10 items-center gap-1 text-sm text-zinc-500"><ChevronDown class="size-4 transition group-data-[state=closed]:-rotate-90" /> {past().length} past Performance</Collapsible.Trigger>
    <Collapsible.Content>
      <ol class="mt-1 ml-3 border-l-2 border-zinc-200 pl-6 opacity-60 dark:border-zinc-800">
        {#each past() as perf (perf.id)}<li class="py-2"><p class="text-xs text-zinc-500">{fmtDate(perf.date)}</p><a href="/perform/{perf.id}" class="font-medium hover:underline">{perf.title}</a></li>{/each}
      </ol>
    </Collapsible.Content>
  </Collapsible.Root>

  <div class="relative mt-2 ml-3 border-l-2 border-violet-600/40 pl-6 lg:pl-10">
    <span class="absolute -top-0.5 -left-3 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap text-yellow-300">TODAY · {fmtDate(TODAY)}</span>

    <ol class="flex flex-col gap-10 pt-9">
      {#if next}
        <li class="relative">
          <span class="absolute top-6 -left-[2.1rem] size-4 rounded-full border-4 border-zinc-50 bg-violet-600 lg:-left-[3.1rem] dark:border-zinc-950"></span>
          <section class="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white lg:p-8">
            <p class="flex flex-wrap items-center gap-2 text-sm text-violet-200">Next Performance · in {daysUntil(next.date)} days {#if next.major}<span class="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-amber-950"><Star class="size-3 fill-current" /> Major</span>{/if}</p>
            <h2 class="mt-1 text-3xl font-semibold tracking-tight lg:text-4xl">{next.title}</h2>
            <p class="mt-1 text-violet-100">{fmtDate(next.date)} · {next.venue}</p>

            <ol class="mt-5 flex flex-wrap gap-2">
              {#each next.pieceIds as id, i (id)}
                <li><a href="/piece/{id}" class="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm hover:bg-white/25"><span class="text-violet-200">{i + 1}</span>{piece(id).title}</a></li>
              {/each}
            </ol>

            <div class="mt-6 flex flex-wrap items-center gap-2">
              <Btn href="/perform/{next.id}" class="!bg-white !text-violet-700 hover:!bg-violet-50"><Play class="size-5" /> Start play-through</Btn>
              <Btn variant="ghost" class="text-white hover:!bg-white/15" onclick={() => (overview = true)}><ListChecks class="size-5" /> Overview</Btn>
            </div>
          </section>
          <PerformanceOverview perf={next} bind:open={overview} {parts} />
        </li>
      {/if}

      {#each later as perf (perf.id)}
        <li class="relative">
          <span class="absolute top-1.5 -left-[2.05rem] size-3.5 rounded-full border-2 border-zinc-50 lg:-left-[3.05rem] dark:border-zinc-950 {perf.major ? 'bg-amber-400' : 'bg-violet-600'}"></span>
          <div class="{perf.major ? 'rounded-3xl border border-amber-300 bg-amber-50/60 p-4 lg:p-5 dark:border-amber-400/30 dark:bg-amber-400/5' : ''}">
            <p class="text-sm text-zinc-500">{fmtDate(perf.date)} · {perf.venue} · in {daysUntil(perf.date)} days</p>
            <div class="mt-1 flex flex-wrap items-center justify-between gap-3">
              <h2 class="flex items-center gap-2 text-lg font-semibold">{perf.title}{#if perf.major}<MajorBadge />{/if}</h2>
              <Btn href="/perform/{perf.id}" variant="soft" size="sm"><Play class="size-4" /> Play through</Btn>
            </div>
            <ol class="mt-3 grid gap-2 sm:grid-cols-2">
              {#each perf.pieceIds as id, i (id)}{@render pieceRow(perf, id, i)}{/each}
            </ol>
          </div>
        </li>
      {/each}
    </ol>
  </div>
</div>
