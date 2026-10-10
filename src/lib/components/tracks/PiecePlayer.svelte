<script lang="ts">
  // The player for one Piece: the part indicator, a Start button (nothing plays on its own), a seek
  // slider, back and forward 10 seconds, and play/pause. #24 shows the same screen for a Play-through.
  // The audio belongs to the page that owns the player, which stops it when the Singer leaves.
  import { Play } from '@lucide/svelte';
  import { trackAudioPath } from '../../core/paths';
  import type { PieceId } from '../../core/pieces';
  import {
    choiceOptions,
    defaultChoice,
    trackForChoice,
    type PartChoice,
  } from '../../core/playthrough';
  import { indicatorText, type PracticeTrack } from '../../core/practice-tracks';
  import type { AudioPlayer } from '../../shell/audio-player.svelte';
  import type { StartControl } from './start-control';
  import type { VoicePart } from '../../shell/voice-parts';
  import AlertMessage from '../AlertMessage.svelte';
  import Btn from '../ui/Btn.svelte';
  import PartIndicator from './PartIndicator.svelte';
  import PlayerControls from './PlayerControls.svelte';

  const {
    pieceId,
    player,
    tracks,
    voiceParts,
    voicePartId,
    onControl,
  }: {
    readonly pieceId: PieceId;
    readonly player: AudioPlayer;
    readonly tracks: readonly PracticeTrack[];
    readonly voiceParts: readonly VoicePart[];
    /** The Voice Part in effect on this Piece: the Singer's default. */
    readonly voicePartId: string | null;
    /** Hands over what the Score viewer needs to start this player when the Singer has not. */
    readonly onControl: (control: StartControl) => void;
  } = $props();

  // Picking a part in the indicator plays it once; it is forgotten when the Singer leaves.
  let choice = $state<PartChoice>(defaultChoice);
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

  /** Loads the chosen track and plays it. Only ever called by the Singer pressing Start. */
  const start = async (): Promise<void> => {
    if (track === undefined) return;
    await player.start(...sourceOf(track));
  };
  $effect(() => {
    onControl({ canStart: () => track !== undefined && !player.started, start });
  });
  const choose = async (next: PartChoice): Promise<void> => {
    choice = next;
    const chosen = trackForChoice(tracks, voicePartId, next);
    if (chosen !== undefined) await player.switchTo(...sourceOf(chosen));
  };
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
      <PlayerControls {player} />
    {/if}

    {#if player.failed}
      <AlertMessage>That track could not be played. Try again in a moment.</AlertMessage>
    {/if}
  </div>
{/if}
