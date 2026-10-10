<script lang="ts">
  // The playback of one Piece: the audio player its screens share (the player, and the Score viewer's
  // controls) and the Score documents they have open. Leaving the Piece stops the audio and lets go of
  // the documents. Keyed by Piece where it is used, so moving to another Piece starts fresh.
  import { onDestroy, type Snippet } from 'svelte';
  import { createAudioPlayer, type AudioPlayer } from '../shell/audio-player.svelte';
  import { closePdfs } from '../shell/pdf';

  const { children }: { readonly children: Snippet<[AudioPlayer]> } = $props();

  const player = createAudioPlayer();
  onDestroy(() => {
    player.stop();
    closePdfs();
  });
</script>

{@render children(player)}
