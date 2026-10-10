<script lang="ts">
  // The player for one Piece: the part indicator, a Start button (nothing plays on its own), a seek
  // slider, back and forward 10 seconds, and play/pause. #24 shows the same screen for a Play-through.
  // Leaving the screen stops the audio.
  import { Pause, Play, RotateCcw, RotateCw } from '@lucide/svelte';
  import { onDestroy } from 'svelte';
  import { trackAudioPath } from '../../core/paths';
  import type { PieceId } from '../../core/pieces';
  import {
    choiceOptions,
    defaultChoice,
    trackForChoice,
    type PartChoice,
  } from '../../core/playthrough';
  import { durationText, indicatorText, type PracticeTrack } from '../../core/practice-tracks';
  import { createAudioPlayer } from '../../shell/audio-player.svelte';
  import type { VoicePart } from '../../shell/voice-parts';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from '../ui/Btn.svelte';
  import PartIndicator from './PartIndicator.svelte';

  const {
    pieceId,
    tracks,
    voiceParts,
    voicePartId,
  }: {
    readonly pieceId: PieceId;
    readonly tracks: readonly PracticeTrack[];
    readonly voiceParts: readonly VoicePart[];
    /** The Voice Part in effect on this Piece: the Singer's default. */
    readonly voicePartId: string | null;
  } = $props();

  const player = createAudioPlayer();
  onDestroy(player.stop);

  // Picking a part in the indicator plays it once; it is forgotten when the Singer leaves.
  let choice = $state<PartChoice>(defaultChoice);
  // Where the thumb is while the Singer drags it, before the audio has been asked to move.
  let scrubbing = $state<number | null>(null);
  const track = $derived(trackForChoice(tracks, voicePartId, choice));
  const options = $derived(choiceOptions(tracks));
  const nameOf = (id: string): string => voiceParts.find((part) => part.id === id)?.name ?? '';
  const selected = $derived(
    track === undefined ? '' : track.source.type === 'combined' ? 'all' : track.source.voicePartId,
  );
  const sourceOf = (found: PracticeTrack): [string, number | null] => [
    trackAudioPath(pieceId, found.id),
    found.durationSeconds,
  ];

  const start = async (): Promise<void> => {
    if (track === undefined) return;
    await player.start(...sourceOf(track));
  };
  const choose = async (next: PartChoice): Promise<void> => {
    choice = next;
    const chosen = trackForChoice(tracks, voicePartId, next);
    if (chosen !== undefined) await player.switchTo(...sourceOf(chosen));
  };
  const remaining = $derived(Math.max(0, player.length - player.position));
</script>

{#if tracks.length === 0}
  <p
    class="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700"
  >
    No Practice Track for this Piece yet.
  </p>
{:else}
  <div
    data-testid="player"
    class="flex flex-col gap-4 rounded-3xl border bg-white p-5 dark:bg-zinc-900"
  >
    <div>
      <PartIndicator
        text={track === undefined ? 'Choose a track' : indicatorText(track.source, nameOf)}
        {voiceParts}
        hasCombined={options.hasCombined}
        voicePartIds={options.voicePartIds}
        {selected}
        onChoose={choose}
      />
    </div>

    {#if track === undefined}
      <p class="text-sm text-zinc-500">
        This Piece has no track for the whole choir or for your Voice Part. Choose another above.
      </p>
    {:else if !player.started}
      <Btn onclick={start} class="self-start"><Play class="size-5 fill-current" /> Start</Btn>
    {:else}
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
    {/if}

    {#if player.failed}
      <AlertMessage>That track could not be played. Try again in a moment.</AlertMessage>
    {/if}
  </div>
{/if}
