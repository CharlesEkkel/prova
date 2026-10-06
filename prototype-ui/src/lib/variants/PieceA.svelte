<script lang="ts">
  // Variant A "Track list + score": your part first, Combined always visible, other parts folded away.
  // Wide screens put the score beside the list; phones stack them.
  import { Collapsible } from 'bits-ui';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import FileText from '@lucide/svelte/icons/file-text';
  import { combinedOf, isOverridden, partFor, partTracksOf, type Piece } from '../data';
  import ScoreMock from '../ui/ScoreMock.svelte';
  import TrackRow from '../ui/TrackRow.svelte';
  let { piece }: { piece: Piece } = $props();
  const mine = $derived(partTracksOf(piece, partFor(piece.id)));
  const combined = $derived(combinedOf(piece));
  const others = $derived(piece.tracks.filter((t) => t.part && t.part !== partFor(piece.id)));
  const h = 'mt-6 mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase';
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-10 lg:py-10">
  <a href="/" class="text-sm text-zinc-500 hover:underline">‹ Home</a>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight lg:text-3xl">{piece.title}</h1>
  <p class="text-zinc-500">{piece.composer}</p>

  <div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
    <div>
      <h2 class="{h} !mt-0">Your part: {partFor(piece.id)}
        {#if isOverridden(piece.id)}<span class="rounded bg-amber-100 px-1.5 py-0.5 tracking-normal text-amber-800 normal-case dark:bg-amber-500/15 dark:text-amber-300">Part Override</span>{/if}</h2>
      <div class="flex flex-col gap-2">
        {#each mine as t (t.id)}<TrackRow track={t} emphasis />{:else}
          <p class="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">No {partFor(piece.id)} Practice Track yet. Use the Combined Track below.</p>
        {/each}
      </div>

      <h2 class={h}>Everyone together</h2>
      {#if combined}<TrackRow track={combined} />{:else}<p class="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">No Combined Track yet.</p>{/if}

      {#if others.length}
        <Collapsible.Root class="mt-4">
          <Collapsible.Trigger class="group flex min-h-11 items-center gap-1 text-sm font-medium text-violet-700 dark:text-violet-300"><ChevronDown class="size-4 transition group-data-[state=closed]:-rotate-90" /> Other Voice Parts ({others.length})</Collapsible.Trigger>
          <Collapsible.Content class="mt-2 flex flex-col gap-2">{#each others as t (t.id)}<TrackRow track={t} />{/each}</Collapsible.Content>
        </Collapsible.Root>
      {/if}
    </div>

    <div class="lg:sticky lg:top-6 lg:self-start">
      <h2 class="{h} !mt-0">Score</h2>
      <ScoreMock {piece} class="h-72 lg:h-[26rem]" />
      <ul class="mt-3 flex flex-col gap-1">
        {#each piece.scores as s (s.id)}
          <li class="flex min-h-10 items-center gap-2 text-sm"><FileText class="size-4 text-zinc-400" /><span class="flex-1">{s.label}</span>{#if s.choir}<span class="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">Choir score</span>{/if}</li>
        {/each}
      </ul>
    </div>
  </div>
</div>
