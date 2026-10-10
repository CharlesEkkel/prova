<script lang="ts">
  // The controls of a started player: a seek slider with the time played and left, back and forward
  // 10 seconds, and play/pause. Shared by the Piece's player and the Score viewer, which show the same
  // audio.
  import { Pause, Play, RotateCcw, RotateCw } from '@lucide/svelte';
  import { durationText } from '../../core/practice-tracks';
  import type { AudioPlayer } from '../../shell/audio-player.svelte';
  import Btn from '../ui/Btn.svelte';

  const { player }: { readonly player: AudioPlayer } = $props();

  // Where the thumb is while the Singer drags it, before the audio has been asked to move.
  let scrubbing = $state<number | null>(null);
  const remaining = $derived(Math.max(0, player.length - player.position));
</script>

<div class="w-full">
  <!-- A native range: it reports only what the Singer does, so the playing position never seeks itself. -->
  <input
    type="range"
    aria-label="Seek"
    min="0"
    max={Math.max(player.length, 1)}
    step="1"
    value={scrubbing ?? player.position}
    oninput={(event) => {
      scrubbing = event.currentTarget.valueAsNumber;
    }}
    onchange={(event) => {
      player.seek(event.currentTarget.valueAsNumber);
      scrubbing = null;
    }}
    class="h-6 w-full cursor-pointer accent-primary-600"
  />
  <div class="mt-1 flex justify-between text-xs text-zinc-500 tabular-nums">
    <span data-testid="position">{durationText(scrubbing ?? player.position)}</span>
    <span>{player.length > 0 ? `-${durationText(remaining) ?? ''}` : ''}</span>
  </div>
</div>
<div class="flex items-center justify-center gap-2 sm:gap-4">
  <Btn
    variant="ghost"
    size="icon"
    aria-label="Back 10 seconds"
    onclick={() => {
      player.skipBy(-10);
    }}><RotateCcw class="size-5" /></Btn
  >
  <Btn
    size="icon"
    class="size-14!"
    aria-label={player.playing ? 'Pause' : 'Play'}
    onclick={player.toggle}
  >
    {#if player.playing}<Pause class="size-7" />{:else}<Play class="size-7" />{/if}
  </Btn>
  <Btn
    variant="ghost"
    size="icon"
    aria-label="Forward 10 seconds"
    onclick={() => {
      player.skipBy(10);
    }}><RotateCw class="size-5" /></Btn
  >
</div>
