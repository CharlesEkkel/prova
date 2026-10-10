<script lang="ts">
  // A Piece's title, composer and Conductor's Notes, as the top of its page shows them.
  import type { RepertoireEntry } from '../core/pieces';

  const { piece }: { readonly piece: RepertoireEntry } = $props();
</script>

<div class="flex flex-col gap-4">
  <header>
    <h1 class="text-2xl font-semibold tracking-tight">{piece.title}</h1>
    <p class="text-zinc-500">{piece.composer}</p>
  </header>

  {#if piece.notes !== ''}
    <section aria-labelledby="notes-heading">
      <h2 id="notes-heading" class="text-sm font-semibold">Conductor’s Notes</h2>
      <p class="mt-1 whitespace-pre-wrap">{piece.notes}</p>
    </section>
  {/if}
</div>
