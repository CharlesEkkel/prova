<script lang="ts">
  import { piecePath } from '../core/paths';
  import { hasNoPracticeTrack, type RepertoireEntry } from '../core/pieces';

  const { piece }: { readonly piece: RepertoireEntry } = $props();
</script>

<a href={piecePath(piece.id)} class="block min-w-0 px-4 py-2.5">
  <span class="block truncate font-medium">{piece.title}</span>
  {#if piece.composer !== ''}
    <span class="block truncate text-sm text-zinc-500">{piece.composer}</span>
  {/if}
  {#if hasNoPracticeTrack(piece)}
    <span
      class="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
      >No Practice Track yet</span
    >
  {/if}
</a>
