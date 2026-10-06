<script lang="ts">
  import { fmt, type Track } from './data';
  import { player, seek } from './player.svelte';
  let { track }: { track: Track } = $props();
  const active = $derived(player.track?.id === track.id);
  const pos = $derived(active ? player.pos : 0);
</script>

<div class="scrub">
  <input type="range" min="0" max={track.durationSec} step="1" value={pos} disabled={!active}
    aria-label="Seek" oninput={(e) => seek(Number(e.currentTarget.value))} />
  <div class="times small muted"><span>{fmt(pos)}</span><span>-{fmt(track.durationSec - pos)}</span></div>
</div>

<style>
  .times { display: flex; justify-content: space-between; font-variant-numeric: tabular-nums; }
</style>
