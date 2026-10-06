<script lang="ts">
  // Three ways to keep the major Performance always one tap away (switched with ui.major):
  //   card   - pinned card at the top of the sidebar / drawer
  //   banner - slim strip across the top of every screen
  //   pill   - small countdown pill in the header
  import Star from '@lucide/svelte/icons/star';
  import Play from '@lucide/svelte/icons/play';
  import { daysUntil, fmtDate, majorPerformance } from '../data';
  let { kind }: { kind: 'card' | 'banner' | 'pill' } = $props();
  const perf = majorPerformance();
</script>

{#if perf}
  {#if kind === 'card'}
    <a href="/perform/{perf.id}" class="group block rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-3.5 text-amber-950 shadow-sm transition hover:shadow-md">
      <p class="flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase"><Star class="size-3 fill-current" /> Major Performance</p>
      <p class="mt-1 font-semibold">{perf.title}</p>
      <p class="flex items-center justify-between text-xs"><span>{fmtDate(perf.date)}</span><span class="font-semibold">{daysUntil(perf.date)} days</span></p>
    </a>
  {:else if kind === 'banner'}
    <a href="/perform/{perf.id}" class="flex min-h-10 items-center justify-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-sm text-amber-950">
      <Star class="size-4 shrink-0 fill-current" />
      <span class="truncate"><b>{perf.title}</b> <span class="hidden sm:inline">· {fmtDate(perf.date)}</span> · {daysUntil(perf.date)} days</span>
      <span class="hidden items-center gap-1 rounded-full bg-amber-950/10 px-3 py-0.5 text-xs font-semibold sm:inline-flex"><Play class="size-3 fill-current" /> Play through</span>
    </a>
  {:else}
    <a href="/perform/{perf.id}" class="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-amber-100 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-200" aria-label="Major Performance: {perf.title}, in {daysUntil(perf.date)} days">
      <Star class="size-4 fill-current" /><span class="hidden sm:inline">{perf.title} ·</span> {daysUntil(perf.date)}d
    </a>
  {/if}
{/if}
