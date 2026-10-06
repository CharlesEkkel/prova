<script lang="ts">
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import RotateCw from '@lucide/svelte/icons/rotate-cw';
  import { piece, type Track } from '../data';
  import { player, skipBy, toggle } from '../player.svelte';
  import Btn from '../ui/Btn.svelte';
  import KindBadge from '../ui/KindBadge.svelte';
  import Scrubber from '../ui/Scrubber.svelte';
  let { track }: { track: Track } = $props();
  const p = $derived(piece(track.pieceId));
</script>

<!-- Mobile: compact two-row card. Desktop (lg): full-width bar, info | transport + seek | badge. -->
<div class="border-t border-zinc-200 bg-white/90 px-4 py-2 backdrop-blur lg:grid lg:grid-cols-[1fr_minmax(24rem,40rem)_1fr] lg:items-center lg:gap-6 lg:px-6 lg:py-3 dark:border-zinc-800 dark:bg-zinc-900/90">
  <div class="flex items-center gap-3">
    <div class="min-w-0 flex-1">
      <a href="/piece/{p.id}" class="block truncate text-sm font-semibold hover:underline">{p.title}</a>
      <div class="mt-0.5"><KindBadge {track} /></div>
    </div>
    <Btn variant="ghost" size="icon" class="lg:hidden" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}><RotateCcw class="size-5" /></Btn>
    <Btn size="icon" class="lg:hidden" aria-label={player.playing ? 'Pause' : 'Play'} onclick={toggle}>{#if player.playing}<Pause class="size-5" />{:else}<Play class="size-5" />{/if}</Btn>
  </div>
  <div class="flex flex-col items-center gap-0.5">
    <div class="hidden items-center gap-3 lg:flex">
      <Btn variant="ghost" size="icon" aria-label="Back 10 seconds" onclick={() => skipBy(-10)}><RotateCcw class="size-5" /></Btn>
      <Btn size="icon" aria-label={player.playing ? 'Pause' : 'Play'} onclick={toggle}>{#if player.playing}<Pause class="size-5" />{:else}<Play class="size-5" />{/if}</Btn>
      <Btn variant="ghost" size="icon" aria-label="Forward 10 seconds" onclick={() => skipBy(10)}><RotateCw class="size-5" /></Btn>
    </div>
    <Scrubber {track} />
  </div>
  <div class="hidden justify-end text-sm text-zinc-500 lg:flex">{p.composer}</div>
</div>
