<script lang="ts">
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import { fmt, type Track } from '../data';
  import { isCurrent, isPlaying, playTrack } from '../player.svelte';
  import Btn from './Btn.svelte';
  import KindBadge from './KindBadge.svelte';
  let { track, emphasis = false }: { track: Track; emphasis?: boolean } = $props();
</script>

<div class="flex items-center gap-3 rounded-2xl border p-2 pr-4 transition {isCurrent(track) ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : emphasis ? 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}">
  <Btn variant={isCurrent(track) ? 'solid' : 'soft'} size="icon" aria-label="{isPlaying(track) ? 'Pause' : 'Play'} {track.part ?? 'Combined'} track" onclick={() => playTrack(track)}>
    {#if isPlaying(track)}<Pause class="size-5" />{:else}<Play class="size-5" />{/if}
  </Btn>
  <div class="flex-1"><KindBadge {track} /></div>
  <span class="text-sm tabular-nums text-zinc-500">{fmt(track.durationSec)}</span>
</div>
