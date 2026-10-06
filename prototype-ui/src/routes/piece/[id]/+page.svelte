<script lang="ts">
  // PROTOTYPE: three variants of the Piece view (Practice Tracks + Scores), via ?variant=A|B|C
  // Sidebar Pieces: Ubi Caritas (part-predominant), Zadok (part-only), Silvy (Part Override),
  // Sicut Cervus (no tracks), Hallelujah (Combined only).
  import { page } from '$app/state';
  import { piece as findPiece } from '$lib/data';
  import PrototypeSwitcher from '$lib/ui/PrototypeSwitcher.svelte';
  import PieceA from '$lib/variants/PieceA.svelte';
  import PieceB from '$lib/variants/PieceB.svelte';
  import PieceC from '$lib/variants/PieceC.svelte';
  const variants = [
    { key: 'A', name: 'Track list + score' },
    { key: 'B', name: 'Player + part picker' },
    { key: 'C', name: 'Score-first' }
  ];
  const variant = $derived(page.url.searchParams.get('variant') ?? 'A');
  const piece = $derived(findPiece(page.params.id));
</script>

{#key piece.id}
  {#if variant === 'A'}<PieceA {piece} />{:else if variant === 'B'}<PieceB {piece} />{:else}<PieceC {piece} />{/if}
{/key}
<PrototypeSwitcher {variants} />
