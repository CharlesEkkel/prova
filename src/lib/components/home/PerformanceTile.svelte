<script lang="ts">
  // A Performance on Home: one link to its Overview, listing its Pieces with what the Singer would
  // hear on each. The next Performance is the large hero; nothing here starts playback.
  import { ChevronRight } from '@lucide/svelte';
  import type { ChoirTimeZone } from '../../core/choir-time';
  import { overviewLink } from '../../core/paths';
  import { performanceWhen } from '../../core/performances';
  import type { HomeTile } from '../../shell/performances';
  import MajorBadge from '../ui/MajorBadge.svelte';

  const {
    tile,
    hero = false,
    choirTimeZone,
  }: {
    readonly tile: HomeTile;
    /** The next Performance, shown largest. */
    readonly hero?: boolean;
    readonly choirTimeZone: ChoirTimeZone;
  } = $props();

  const when = $derived(
    [
      performanceWhen(tile.startsAt, tile.endsAt, choirTimeZone),
      ...(tile.venue === '' ? [] : [tile.venue]),
    ].join(' · '),
  );

  const surface = $derived(
    hero
      ? 'bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white hover:shadow-xl hover:brightness-110 lg:p-8'
      : tile.isMajor
        ? 'border border-amber-300 bg-amber-50/60 p-4 hover:border-amber-400 hover:shadow-md lg:p-5 dark:border-amber-400/30 dark:bg-amber-400/5'
        : 'border bg-white p-4 hover:border-primary-400 hover:shadow-md lg:p-5 dark:bg-zinc-900',
  );
  const muted = $derived(hero ? 'text-primary-100' : 'text-zinc-500');
</script>

<a href={overviewLink(tile.id)} class="block rounded-3xl transition {surface}">
  {#if hero}
    <p class="flex flex-wrap items-center gap-2 text-sm {muted}">
      Next Performance {#if tile.isMajor}<MajorBadge />{/if}
    </p>
  {/if}
  <span class="mt-1 flex items-center justify-between gap-3">
    <h2
      class="flex flex-wrap items-center gap-2 font-semibold tracking-tight {hero
        ? 'text-3xl lg:text-4xl'
        : 'text-lg'}"
    >
      {tile.name}
      {#if tile.isMajor && !hero}<MajorBadge />{/if}
    </h2>
    <ChevronRight class="size-5 shrink-0 {muted}" aria-hidden="true" />
  </span>
  <p class="mt-1 text-sm {muted}">{when}</p>
  <ol class="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
    {#each tile.pieces as piece, index (piece.id)}
      <li class="flex min-h-9 items-center gap-3 text-sm">
        <span class="w-4 shrink-0 {muted}">{index + 1}</span>
        <span class="min-w-0 flex-1 truncate font-medium">{piece.title}</span>
        <span
          class="inline-flex items-center gap-1.5 text-xs whitespace-nowrap {piece.heard.playable
            ? muted
            : hero
              ? 'text-amber-200'
              : 'text-amber-700 dark:text-amber-400'}"
        >
          <span
            class="size-1.5 rounded-full {piece.heard.playable ? 'bg-emerald-500' : 'bg-amber-500'}"
            aria-hidden="true"
          ></span>
          {piece.heard.text}
        </span>
      </li>
    {:else}
      <li class="text-sm {muted}">No Pieces yet.</li>
    {/each}
  </ol>
</a>
