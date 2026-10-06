<script lang="ts">
  import { VOICE_PARTS, type Piece } from '../data.svelte';
  let { piece }: { piece: Piece } = $props();
  const cells = $derived([
    ...VOICE_PARTS.map((p) => ({ label: p[0], name: p, has: piece.tracks.some((t) => t.part === p) })),
    { label: 'All', name: 'Combined', has: piece.tracks.some((t) => t.kind === 'combined') }
  ]);
</script>

<span class="inline-flex gap-1" role="img" aria-label="Practice Tracks: {cells.filter((c) => c.has).map((c) => c.name).join(', ') || 'none yet'}">
  {#each cells as c (c.name)}
    <span class="grid h-6 min-w-6 place-items-center rounded px-1 text-[11px] font-bold {c.has ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700'}">{c.label}</span>
  {/each}
</span>
