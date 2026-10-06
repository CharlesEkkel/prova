<script lang="ts">
  // PROTOTYPE: the Piece view = the same player screen as the play-through, without a running order and
  // with a Start button. Try: Ubi Caritas (part-predominant), Zadok (part-only), Silvy (Part Override),
  // Sicut Cervus (no tracks), Hallelujah (Combined only).
  import { onDestroy, untrack } from 'svelte';
  import { page } from '$app/state';
  import { endSession, preparePiece } from '$lib/player.svelte';
  import PlayerScreen from '$lib/variants/PlayerScreen.svelte';
  $effect(() => {
    const id = page.params.id;
    untrack(() => preparePiece(id));
  });
  onDestroy(endSession);
</script>

<PlayerScreen />
