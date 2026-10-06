<script lang="ts">
  // Variant C "Score-first": the choir score is the hero (read while you listen). On wide screens the
  // tracks live in a right rail with the Combined Track pinned on top; on phones they become a chip row.
  import { combinedOf, isOverridden, partFor, type Piece } from '../data';
  import { isCurrent, playTrack } from '../player.svelte';
  import KindBadge from '../ui/KindBadge.svelte';
  import ScoreMock from '../ui/ScoreMock.svelte';
  import TrackRow from '../ui/TrackRow.svelte';
  let { piece }: { piece: Piece } = $props();
  const combined = $derived(combinedOf(piece));
  const parts = $derived(piece.tracks.filter((t) => t.part));
  const mine = $derived(partFor(piece.id));
  const chip = 'flex min-h-14 shrink-0 flex-col items-start justify-center gap-0.5 rounded-xl border-2 px-3';
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-10 lg:py-8">
  <a href="/" class="text-sm text-zinc-500 hover:underline">‹ Home</a>
  <div class="mt-2 flex flex-wrap items-baseline gap-x-4">
    <h1 class="text-2xl font-semibold tracking-tight">{piece.title}</h1>
    <p class="text-zinc-500">{piece.composer} · you: <b>{mine}</b>{#if isOverridden(piece.id)} (Part Override){/if}</p>
  </div>

  <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div>
      <ScoreMock {piece} class="h-96 lg:h-[34rem]" />
      {#if piece.scores.length > 1}<p class="mt-2 text-sm text-zinc-500">Also: {piece.scores.filter((s) => !s.choir).map((s) => s.label).join(', ')}</p>{/if}
    </div>

    <!-- phones: horizontal chips -->
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
      {#if combined}
        <button onclick={() => playTrack(combined)} aria-label="Play Combined Track" class="{chip} {isCurrent(combined) ? 'border-violet-500' : 'border-transparent bg-zinc-100 dark:bg-zinc-800'}"><KindBadge track={combined} /></button>
      {/if}
      {#each parts as t (t.id)}
        <button onclick={() => playTrack(t)} class="{chip} {isCurrent(t) ? 'border-violet-500' : 'border-transparent'} {t.part === mine ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-zinc-100 dark:bg-zinc-800'}">
          <KindBadge track={t} />{#if t.part === mine}<small class="text-[11px] text-amber-800 dark:text-amber-300">★ yours</small>{/if}
        </button>
      {/each}
    </div>

    <!-- wide: right rail -->
    <aside class="hidden flex-col gap-2 lg:flex">
      <h2 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Combined</h2>
      {#if combined}<TrackRow track={combined} emphasis />{:else}<p class="text-sm text-zinc-500">No Combined Track yet.</p>{/if}
      <h2 class="mt-4 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Voice Parts</h2>
      {#each parts as t (t.id)}
        <div class={t.part === mine ? 'rounded-2xl ring-2 ring-amber-400' : ''}><TrackRow track={t} /></div>
      {:else}<p class="text-sm text-zinc-500">No part tracks yet.</p>{/each}
    </aside>
  </div>
</div>
