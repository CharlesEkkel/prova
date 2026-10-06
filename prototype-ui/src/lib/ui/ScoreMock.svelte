<script lang="ts">
  import type { Piece } from '../data';
  let { piece, class: cls = 'h-64' }: { piece: Piece; class?: string } = $props();
  const score = $derived(piece.scores.find((s) => s.choir));
  const staves = 'repeating-linear-gradient(transparent 0 14px, #52525b 14px 15px, transparent 15px 18px, #52525b 18px 19px, transparent 19px 22px, #52525b 22px 23px, transparent 23px 26px, #52525b 26px 27px, transparent 27px 30px, #52525b 30px 31px, transparent 31px 56px)';
</script>

{#if score}
  <div class="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white {cls} dark:border-zinc-800" role="img" aria-label="Choir score for {piece.title}">
    <div class="absolute inset-x-4 top-12 bottom-4 opacity-50" style:background={staves}></div>
    <span class="absolute top-3 left-4 text-xs text-zinc-500">{piece.title} · {score.label}</span>
  </div>
{:else}
  <div class="grid place-items-center rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 {cls}">No Score uploaded for this Piece yet</div>
{/if}
