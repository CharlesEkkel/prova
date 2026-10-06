<script lang="ts">
  // The major Performance, always one tap away: a slim banner across the top of every screen.
  import Star from '@lucide/svelte/icons/star';
  import { daysUntil, fmtDate, majorPerformance } from '../data';
  import { openOverview } from '../ui.svelte';
  const perf = majorPerformance();
</script>

{#if perf}
  <button onclick={() => openOverview(perf.id)} class="flex min-h-10 w-full items-center justify-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-sm text-amber-950">
    <Star class="size-4 shrink-0 fill-current" />
    <span class="truncate"><b>{perf.title}</b> <span class="hidden sm:inline">· {fmtDate(perf.date)}</span> · {daysUntil(perf.date)} days</span>
    <span class="hidden rounded-full bg-amber-950/10 px-3 py-0.5 text-xs font-semibold sm:inline">Open</span>
  </button>
{/if}
