<script lang="ts">
  // The "In Performances" list on a Piece's page: each Performance it is in, upcoming first, as a
  // link that opens that Performance's Overview on this page.
  import { Calendar } from '@lucide/svelte';
  import type { ChoirTimeZone } from '../../core/choir-time';
  import { overviewLink } from '../../core/paths';
  import { performanceWhen, type SidebarEntry } from '../../core/performances';

  const {
    performances,
    choirTimeZone,
  }: { readonly performances: readonly SidebarEntry[]; readonly choirTimeZone: ChoirTimeZone } =
    $props();
</script>

{#if performances.length > 0}
  <section aria-labelledby="in-performances-heading">
    <h2 id="in-performances-heading" class="text-sm font-semibold">In Performances</h2>
    <ul class="mt-1 flex flex-col">
      {#each performances as performance (performance.id)}
        <li class="flex min-h-11 items-center gap-2 {performance.archived ? 'opacity-60' : ''}">
          <Calendar class="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <a
            href={overviewLink(performance.id)}
            class="font-medium underline-offset-2 hover:underline">{performance.name}</a
          >
          <span class="text-sm text-zinc-500">
            {performanceWhen(
              performance.startsAt,
              performance.endsAt,
              choirTimeZone,
            )}{performance.archived ? ' · archived' : ''}
          </span>
        </li>
      {/each}
    </ul>
  </section>
{/if}
