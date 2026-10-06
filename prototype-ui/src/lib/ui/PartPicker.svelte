<script lang="ts">
  // Choose the Voice Part to play for this Piece. A part other than the Singer's default is saved as a
  // Part Override; ALL plays the Combined Track this time only.
  import { ToggleGroup } from 'bits-ui';
  import Star from '@lucide/svelte/icons/star';
  import { SINGER, VOICE_PARTS, combinedOf, isOverridden, partTracksOf, type Piece, type VoicePart } from '../data.svelte';
  import { partChoice, setPart } from '../player.svelte';
  let { piece }: { piece: Piece } = $props();
  const choice = $derived(partChoice(piece.id));
  const missing = $derived(choice !== 'All' && partTracksOf(piece, choice).length === 0 && combinedOf(piece) !== undefined);
  const item = 'relative grid h-12 flex-1 place-items-center rounded-xl text-base font-bold text-zinc-600 disabled:opacity-35 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:text-zinc-400 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900';
</script>

<div>
  <ToggleGroup.Root type="single" value={choice} onValueChange={(v) => v && setPart(piece.id, v as VoicePart | 'All')} aria-label="Voice Part" class="flex gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800">
    {#each VOICE_PARTS as p (p)}
      <ToggleGroup.Item value={p} aria-label={p} disabled={partTracksOf(piece, p).length === 0} class={item}>{p[0]}{#if p === SINGER.part}<Star class="absolute top-1 right-1 size-3 fill-amber-400 text-amber-400" />{/if}</ToggleGroup.Item>
    {/each}
    <ToggleGroup.Item value="All" aria-label="All parts (Combined Track)" disabled={!combinedOf(piece)} class="{item} !flex-[1.4] !text-sm">ALL</ToggleGroup.Item>
  </ToggleGroup.Root>
  <p class="mt-2 text-xs text-zinc-500">
    {#if choice === 'All'}
      Playing the Combined Track.
    {:else if missing}
      No {choice} Practice Track for this Piece, so the Combined Track plays.
    {:else if isOverridden(piece.id)}
      Part Override for this Piece (you usually sing {SINGER.part}).
      <button class="font-medium text-violet-700 underline dark:text-violet-300" onclick={() => setPart(piece.id, SINGER.part)}>Reset</button>
    {:else}
      <Star class="inline size-3 fill-amber-400 text-amber-400" /> your part. Pick another to override it for this Piece.
    {/if}
  </p>
</div>
