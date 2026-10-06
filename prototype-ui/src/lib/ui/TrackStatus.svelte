<script lang="ts">
  // Compact part info: just what you would hear if you pressed play on this Piece.
  import { kindLabel, partFor, partTracksOf, resolveTrack, type Piece } from '../data.svelte';
  let { piece, preferCombined = false, onDark = false }: { piece: Piece; preferCombined?: boolean; onDark?: boolean } = $props();
  const track = $derived(resolveTrack(piece, preferCombined));
  const hasMine = $derived(partTracksOf(piece, partFor(piece.id)).length > 0);
</script>

{#if !track}
  <span class="inline-flex items-center gap-1.5 text-xs whitespace-nowrap {onDark ? 'text-amber-200' : 'text-amber-700 dark:text-amber-400'}"><span class="size-1.5 rounded-full bg-amber-500"></span>No tracks yet</span>
{:else}
  <span class="inline-flex items-center gap-1.5 text-xs whitespace-nowrap {onDark ? 'text-violet-100' : 'text-zinc-500'}"><span class="size-1.5 rounded-full {track.kind !== 'combined' ? 'bg-emerald-500' : 'bg-zinc-400'}"></span>{track.kind === 'combined' && !preferCombined && !hasMine ? 'Combined only' : kindLabel(track)}</span>
{/if}
