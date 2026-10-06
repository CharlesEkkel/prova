<script lang="ts">
  // PROTOTYPE: the Performance play-through = the shared player screen with a running order.
  // Winter Concert contains an empty Piece (Sicut Cervus): try the pause state and "skip empty".
  import { onDestroy, untrack } from 'svelte';
  import { page } from '$app/state';
  import { performance as findPerf } from '$lib/data.svelte';
  import { endSession, session, startPlaythrough } from '$lib/player.svelte';
  import PlayerScreen from '$lib/variants/PlayerScreen.svelte';
  const perf = $derived(findPerf(page.params.id));
  // arriving via the overview has already started the play-through; a direct URL starts it here
  $effect(() => {
    const id = perf.id;
    untrack(() => {
      if (session.perfId !== id) startPlaythrough(id);
    });
  });
  onDestroy(endSession);
</script>

<PlayerScreen {perf} />
