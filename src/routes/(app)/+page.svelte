<script lang="ts">
  // Home: a timeline of Performances. The next one is the hero on the rail, later ones follow it.
  // Every tile opens its Performance Overview; nothing here starts playback.
  import { Collapsible } from 'bits-ui';
  import { ChevronDown, ChevronRight } from '@lucide/svelte';
  import { overviewLink } from '../../lib/core/paths';
  import { dayIn } from '../../lib/core/performances';
  import PerformanceTile from '../../lib/components/home/PerformanceTile.svelte';
  import MajorBadge from '../../lib/components/ui/MajorBadge.svelte';
  import type { PageData } from './$types';

  const { data }: { readonly data: PageData } = $props();
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 lg:px-10 lg:py-10">
  <h1 class="text-2xl font-semibold tracking-tight lg:text-3xl">Hi {data.singerName}</h1>
  <p class="text-zinc-500">You sing {data.voicePartName}.</p>

  {#if data.past.length > 0}
    <Collapsible.Root class="mt-6">
      <Collapsible.Trigger
        class="group flex min-h-11 items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <ChevronDown
          class="size-4 transition group-data-[state=closed]:-rotate-90"
          aria-hidden="true"
        />
        {data.past.length} past Performance{data.past.length === 1 ? '' : 's'}
      </Collapsible.Trigger>
      <Collapsible.Content>
        <ol
          class="mt-1 ml-3 flex flex-col gap-1 border-l-2 border-zinc-200 pl-6 dark:border-zinc-800"
          aria-label="Past Performances"
        >
          {#each data.past as tile (tile.id)}
            <li>
              <a
                href={overviewLink(tile.id)}
                class="flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 opacity-60 transition hover:bg-zinc-100 hover:opacity-100 dark:hover:bg-zinc-900"
              >
                <span class="min-w-0">
                  <span class="block text-xs text-zinc-500"
                    >{dayIn(tile.startsAt, data.choirTimeZone)}</span
                  >
                  <span class="flex items-center gap-2 font-medium"
                    >{tile.name}{#if tile.isMajor}<MajorBadge />{/if}</span
                  >
                </span>
                <ChevronRight class="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
              </a>
            </li>
          {/each}
        </ol>
      </Collapsible.Content>
    </Collapsible.Root>
  {/if}

  <div
    class="relative ml-3 border-l-2 border-primary-500/40 pl-6 lg:pl-10 {data.past.length > 0
      ? 'mt-2'
      : 'mt-6'}"
  >
    <p
      class="absolute -top-0.5 -left-3 rounded-full bg-primary-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap text-primary-800 uppercase ring-1 ring-primary-300 dark:bg-primary-950 dark:text-primary-200 dark:ring-primary-500/40"
    >
      Today · {dayIn(new Date(), data.choirTimeZone)}
    </p>
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
