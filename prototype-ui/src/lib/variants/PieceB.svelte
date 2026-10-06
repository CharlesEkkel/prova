<script lang="ts">
  // Variant B "Player + part picker": a big player card with a Voice Part toggle (S A T B + All) that
  // loads the matching Practice Track. Tracks and Scores live in tabs beside it on wide screens.
  import { Tabs, ToggleGroup } from 'bits-ui';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import RotateCw from '@lucide/svelte/icons/rotate-cw';
  import Star from '@lucide/svelte/icons/star';
  import { VOICE_PARTS, combinedOf, fmt, isOverridden, partFor, partTracksOf, type Piece, type VoicePart } from '../data';
  import { isCurrent, load, player, skipBy, toggle } from '../player.svelte';
  import Btn from '../ui/Btn.svelte';
  import KindBadge from '../ui/KindBadge.svelte';
  import ScoreMock from '../ui/ScoreMock.svelte';
  import Scrubber from '../ui/Scrubber.svelte';
  import TrackRow from '../ui/TrackRow.svelte';
  let { piece }: { piece: Piece } = $props();
  let pick = $state<string>(partFor(piece.id));
  const track = $derived(pick === 'All' ? combinedOf(piece) : partTracksOf(piece, pick as VoicePart)[0]);
  const playing = $derived(track && isCurrent(track) && player.playing);
  function choose(v: string) {
    if (!v) return; // single-select ToggleGroup reports '' when the active item is clicked again
    pick = v;
    const next = v === 'All' ? combinedOf(piece) : partTracksOf(piece, v as VoicePart)[0];
    if (next) load(next);
  }
  const item = 'relative grid h-14 flex-1 place-items-center rounded-xl text-lg font-bold text-zinc-600 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:text-zinc-400 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900';
  const tab = 'min-h-11 flex-1 border-b-2 border-transparent text-sm font-medium text-zinc-500 data-[state=active]:border-violet-600 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300';
</script>

<div class="mx-auto w-full max-w-7xl px-4 py-6 lg:px-10 lg:py-10">
  <a href="/" class="text-sm text-zinc-500 hover:underline">‹ Home</a>
  <h1 class="mt-2 text-2xl font-semibold tracking-tight lg:text-3xl">{piece.title}</h1>
  <p class="text-zinc-500">{piece.composer}</p>

  <div class="mt-6 grid gap-8 lg:grid-cols-2">
    <section class="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-5 lg:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <ToggleGroup.Root type="single" value={pick} onValueChange={choose} aria-label="Voice Part" class="flex gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800">
        {#each VOICE_PARTS as p (p)}
          <ToggleGroup.Item value={p} aria-label={p} class={item}>{p[0]}{#if p === partFor(piece.id)}<Star class="absolute top-1 right-1 size-3 fill-amber-400 text-amber-400" />{/if}</ToggleGroup.Item>
        {/each}
        <ToggleGroup.Item value="All" aria-label="All parts, Combined Track" class="{item} !flex-[1.4] !text-base">ALL</ToggleGroup.Item>
      </ToggleGroup.Root>
      <p class="-mt-2 text-xs text-zinc-500"><Star class="inline size-3 fill-amber-400 text-amber-400" /> your part{#if isOverridden(piece.id)} (Part Override for this Piece){/if} · ALL = Combined Track</p>

      {#if track}
        <div class="flex items-center justify-between"><KindBadge {track} /><span class="text-sm text-zinc-500 tabular-nums">{fmt(track.durationSec)}</span></div>
        <Scrubber {track} />
        <div class="flex items-center justify-center gap-6">
          <Btn variant="ghost" size="icon" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}><RotateCcw class="size-6" /></Btn>
          <Btn size="iconLg" aria-label={playing ? 'Pause' : 'Play'} onclick={() => (isCurrent(track) ? toggle() : load(track))}>
            {#if playing}<Pause class="size-7" />{:else}<Play class="size-7" />{/if}
          </Btn>
          <Btn variant="ghost" size="icon" aria-label="Forward 10 seconds" onclick={() => skipBy(10)}><RotateCw class="size-6" /></Btn>
        </div>
      {:else}
        <p class="py-10 text-center text-zinc-500">No Practice Track for {pick} yet.</p>
      {/if}
    </section>

    <Tabs.Root value="tracks">
      <Tabs.List class="flex border-b border-zinc-200 dark:border-zinc-800">
        <Tabs.Trigger value="tracks" class={tab}>Practice Tracks ({piece.tracks.length})</Tabs.Trigger>
        <Tabs.Trigger value="scores" class={tab}>Scores ({piece.scores.length})</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="tracks" class="flex flex-col gap-2 pt-4">
        {#each piece.tracks as t (t.id)}<TrackRow track={t} />{:else}<p class="text-zinc-500">No Practice Tracks yet.</p>{/each}
      </Tabs.Content>
      <Tabs.Content value="scores" class="flex flex-col gap-3 pt-4">
        <ScoreMock {piece} class="h-56" />
        <ul class="text-sm">{#each piece.scores as s (s.id)}<li class="py-1">{s.label}{#if s.choir} <b>(choir score)</b>{/if}</li>{/each}</ul>
      </Tabs.Content>
    </Tabs.Root>
  </div>
</div>
