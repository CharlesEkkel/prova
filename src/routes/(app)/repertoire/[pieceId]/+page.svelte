<script lang="ts">
  import { ArrowLeft } from '@lucide/svelte';
  import { paths } from '../../../../lib/core/paths';
  import { hasNoPracticeTrack } from '../../../../lib/core/pieces';
  import type { PageData } from './$types';

  const { data }: { readonly data: PageData } = $props();
  const piece = $derived(data.piece);
</script>

<!-- A placeholder: #18 and #24 turn this into the player screen in single-Piece mode. -->
<div class="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">
  <a href={paths.repertoire} class="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-500">
    <ArrowLeft class="size-4" aria-hidden="true" /> Repertoire
  </a>

  <header>
    <h1 class="text-2xl font-semibold tracking-tight">{piece.title}</h1>
    {#if piece.composer !== ''}
      <p class="text-zinc-500">{piece.composer}</p>
    {/if}
  </header>

  {#if piece.notes !== ''}
    <section aria-labelledby="notes-heading">
      <h2 id="notes-heading" class="text-sm font-semibold">Conductor’s Notes</h2>
      <p class="mt-1 whitespace-pre-wrap">{piece.notes}</p>
    </section>
  {/if}

  {#if hasNoPracticeTrack(piece)}
    <p class="text-sm text-zinc-500">No Practice Track for this Piece yet.</p>
  {/if}
</div>
