<script lang="ts">
  // PROTOTYPE: Repertoire as its own page, reached from the sidebar (single layout, no variants).
  import { PIECES, performancesOf } from '$lib/data.svelte';
  import MajorBadge from '$lib/ui/MajorBadge.svelte';
  import PartDots from '$lib/ui/PartDots.svelte';
  const sorted = PIECES.toSorted((a, b) => a.title.localeCompare(b.title));
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Repertoire</h1>
  <p class="text-zinc-500">{PIECES.length} Pieces the choir knows or is learning.</p>

  <ul class="mt-6 divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
    {#each sorted as p (p.id)}
      <li>
        <a href="/piece/{p.id}" class="flex min-h-[4.5rem] items-center gap-4 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{p.title}</span>
            <span class="block truncate text-sm text-zinc-500">{p.composer}</span>
            {#if performancesOf(p.id).length}
              <span class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                {#each performancesOf(p.id) as perf (perf.id)}<span class="inline-flex items-center gap-1">{perf.title}{#if perf.major}<MajorBadge class="!px-1.5 !py-0 !text-[10px]" />{/if}</span>{/each}
              </span>
            {/if}
          </span>
          <PartDots piece={p} />
        </a>
      </li>
    {/each}
  </ul>
</div>
