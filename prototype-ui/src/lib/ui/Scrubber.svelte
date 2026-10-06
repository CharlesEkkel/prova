<script lang="ts">
  import { Slider } from 'bits-ui';
  import { fmt, type Track } from '../data.svelte';
  import { player, seek } from '../player.svelte';
  let { track, times = true }: { track: Track; times?: boolean } = $props();
  const active = $derived(player.track?.id === track.id);
  const pos = $derived(active ? player.pos : 0);
</script>

<div class="w-full">
  <Slider.Root
    type="single"
    value={pos}
    onValueChange={(v) => seek(v)}
    max={track.durationSec}
    step={1}
    disabled={!active}
    class="relative flex h-6 w-full touch-none items-center select-none"
  >
    {#snippet children({ thumbItems })}
      <span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <Slider.Range class="absolute h-full bg-violet-600" />
      </span>
      {#each thumbItems as t (t.index)}
        <Slider.Thumb index={t.index} aria-label="Seek" class="block size-4 rounded-full bg-violet-600 shadow ring-4 ring-violet-600/20 transition hover:scale-110 disabled:opacity-0" />
      {/each}
    {/snippet}
  </Slider.Root>
  {#if times}
    <div class="mt-1 flex justify-between text-xs tabular-nums text-zinc-500"><span>{fmt(pos)}</span><span>-{fmt(track.durationSec - pos)}</span></div>
  {/if}
</div>
