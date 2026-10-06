<script lang="ts">
  // Compact part info: just what you would hear if you pressed play on this Piece.
  import { kindLabel, partFor, partTracksOf, resolveTrack, type Piece } from '../data';
  let { piece }: { piece: Piece } = $props();
  const track = $derived(resolveTrack(piece, false));
  const hasMine = $derived(partTracksOf(piece, partFor(piece.id)).length > 0);
</script>

{#if !track}
  <span class="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400"><span class="size-1.5 rounded-full bg-amber-500"></span>No tracks yet</span>
{:else}
  <span class="inline-flex items-center gap-1.5 text-xs text-zinc-500"><span class="size-1.5 rounded-full {hasMine ? 'bg-emerald-500' : 'bg-zinc-400'}"></span>{hasMine ? kindLabel(track) : 'Combined only'}</span>
{/if}
