<script lang="ts">
  // PROTOTYPE: three variants of the Piece view (Practice Tracks + player + Scores), via ?variant=A|B|C
  // Try other Pieces by changing the URL: /piece/p1 (part-predominant), p2 (part-only), p3 (Part Override),
  // p4 (empty), p5 (Combined only).
  import { page } from '$app/state';
  import { piece as findPiece, PIECES } from '$lib/data';
  import PrototypeSwitcher from '$lib/PrototypeSwitcher.svelte';
  import PieceA from '$lib/variants/PieceA.svelte';
  import PieceB from '$lib/variants/PieceB.svelte';
  import PieceC from '$lib/variants/PieceC.svelte';
  const variants = [
    { key: 'A', name: 'Part-first list' },
    { key: 'B', name: 'Player + part picker' },
    { key: 'C', name: 'Score-first' }
  ];
  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');
  const piece = $derived(findPiece(page.params.id));
</script>

{#key piece.id}
  {#if variant === 'A'}<PieceA {piece} />{:else if variant === 'B'}<PieceB {piece} />{:else}<PieceC {piece} />{/if}
{/key}

<div class="pieces">
  {#each PIECES as p}<a href="/piece/{p.id}?variant={variant}" class:on={p.id === piece.id}>{p.id}</a>{/each}
</div>
<PrototypeSwitcher {variants} />

<style>
  .pieces { position: fixed; top: 34px; right: calc(50% - 215px + 6px); display: flex; gap: 2px; z-index: 50; font-size: 11px; }
  .pieces a { background: #111a; color: #fff; padding: 2px 6px; border-radius: 4px; }
  .pieces a.on { background: #ffcc00; color: #000; }
</style>
