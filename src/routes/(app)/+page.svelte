<script lang="ts">
  // Home: a timeline of Performances. The next one is the hero on the rail, later ones follow it.
  // Every tile opens its Performance Overview; nothing here starts playback.
  import PerformanceTile from '../../lib/components/home/PerformanceTile.svelte';
  import type { PageData } from './$types';

  const { data }: { readonly data: PageData } = $props();
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Hi {data.singerName}</h1>
  <p class="text-zinc-500">You sing {data.voicePartName}.</p>

  <div class="relative mt-6 ml-3 border-l-2 border-primary-500/40 pl-6 lg:pl-10">
    <ol class="flex flex-col gap-10 pt-9" aria-label="Upcoming Performances">
      {#if data.next !== null}
        <li class="relative">
          <span
            class="absolute top-6 -left-[2.1rem] size-4 rounded-full border-4 border-zinc-50 bg-primary-500 lg:-left-[3.1rem] dark:border-zinc-950"
            aria-hidden="true"
          ></span>
          <PerformanceTile tile={data.next} hero choirTimeZone={data.choirTimeZone} />
        </li>
      {:else}
        <li class="text-zinc-500">No upcoming Performances.</li>
      {/if}
      {#each data.later as tile (tile.id)}
        <li class="relative">
          <span
            class="absolute top-6 -left-[2.05rem] size-3.5 rounded-full border-2 border-zinc-50 lg:-left-[3.05rem] dark:border-zinc-950 {tile.isMajor
              ? 'bg-amber-400'
              : 'bg-primary-500'}"
            aria-hidden="true"
          ></span>
          <PerformanceTile {tile} choirTimeZone={data.choirTimeZone} />
        </li>
      {/each}
    </ol>
  </div>
</div>
