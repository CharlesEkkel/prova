<script lang="ts">
  // The indicator saying which part is playing (e.g. "Alto + mix"). Overriding is rare, so it is tucked
  // behind a click on the indicator: choose another Voice Part (saved as a Part Override for this Piece),
  // or ALL to play the Combined Track this once.
  import { Popover, ToggleGroup } from 'bits-ui';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { SINGER, VOICE_PARTS, combinedOf, isOverridden, kindLabel, partTracksOf, type Piece, type Track, type VoicePart } from '../data.svelte';
  import { partChoice, setPart } from '../player.svelte';
  import KindBadge from './KindBadge.svelte';
  let { piece, track }: { piece: Piece; track: Track } = $props();
  const choice = $derived(partChoice(piece.id));
  const missing = $derived(choice !== 'All' && partTracksOf(piece, choice).length === 0);
  const item = 'grid h-11 flex-1 place-items-center rounded-xl text-base font-bold text-zinc-600 disabled:opacity-35 data-[state=on]:bg-zinc-900 data-[state=on]:text-white dark:text-zinc-400 dark:data-[state=on]:bg-zinc-100 dark:data-[state=on]:text-zinc-900';
</script>

<div class="flex items-center gap-2">
  <Popover.Root>
    <Popover.Trigger class="group inline-flex items-center gap-1 rounded-lg p-0.5 pr-1.5 ring-1 ring-transparent transition hover:ring-violet-400" aria-label="Playing {kindLabel(track)}. Change Voice Part">
      <KindBadge {track} /><ChevronDown class="size-3.5 text-zinc-400 transition group-hover:text-violet-600 group-data-[state=open]:rotate-180" />
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="start" sideOffset={8} class="z-50 w-80 max-w-[92vw] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h3 class="mb-2 text-sm font-semibold">Voice Part for this Piece</h3>
        <ToggleGroup.Root type="single" value={choice} onValueChange={(v) => v && setPart(piece.id, v as VoicePart | 'All')} aria-label="Voice Part" class="flex gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800">
          {#each VOICE_PARTS as p (p)}
            <ToggleGroup.Item value={p} aria-label={p} disabled={partTracksOf(piece, p).length === 0} class={item}>{p[0]}</ToggleGroup.Item>
          {/each}
          <ToggleGroup.Item value="All" aria-label="All parts (Combined Track)" disabled={!combinedOf(piece)} class="{item} !flex-[1.4] !text-sm">ALL</ToggleGroup.Item>
        </ToggleGroup.Root>
        <p class="mt-2 text-xs text-zinc-500">
          {#if choice === 'All'}
            Playing the Combined Track this time.
          {:else if missing}
            No {choice} Practice Track for this Piece, so the Combined Track plays.
          {:else if isOverridden(piece.id)}
            Part Override for this Piece. You usually sing {SINGER.part}.
            <button class="font-medium text-violet-700 underline dark:text-violet-300" onclick={() => setPart(piece.id, SINGER.part)}>Reset</button>
          {:else}
            You sing {SINGER.part}. Picking another part saves an override for this Piece.
          {/if}
        </p>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
  {#if isOverridden(piece.id)}<span class="text-xs font-medium text-amber-700 dark:text-amber-400">override</span>{/if}
</div>
