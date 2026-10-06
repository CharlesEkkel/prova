<script lang="ts">
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import SkipBack from '@lucide/svelte/icons/skip-back';
  import SkipForward from '@lucide/svelte/icons/skip-forward';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import RotateCw from '@lucide/svelte/icons/rotate-cw';
  import { go, player, skipBy, toggle } from '../player.svelte';
  import Btn from './Btn.svelte';
  // `queue`: show previous / next Piece (a Performance play-through); a single Piece has none
  let { disabled = false, big = true, queue = true }: { disabled?: boolean; big?: boolean; queue?: boolean } = $props();
</script>

<div class="flex items-center justify-center gap-2 sm:gap-4">
  {#if queue}<Btn variant="ghost" size="icon" aria-label="Previous Piece" onclick={() => go(-1)}><SkipBack class="size-5" /></Btn>{/if}
  <Btn variant="ghost" size="icon" aria-label="Back 10 seconds" {disabled} onclick={() => skipBy(-10)}><RotateCcw class="size-5" /></Btn>
  <Btn size={big ? 'iconLg' : 'icon'} aria-label={player.playing ? 'Pause' : 'Play'} {disabled} onclick={toggle}>
    {#if player.playing}<Pause class={big ? 'size-7' : 'size-5'} />{:else}<Play class={big ? 'size-7' : 'size-5'} />{/if}
  </Btn>
  <Btn variant="ghost" size="icon" aria-label="Forward 10 seconds" {disabled} onclick={() => skipBy(10)}><RotateCw class="size-5" /></Btn>
  {#if queue}<Btn variant="ghost" size="icon" aria-label="Next Piece" onclick={() => go(1)}><SkipForward class="size-5" /></Btn>{/if}
</div>
