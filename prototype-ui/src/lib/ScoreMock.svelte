<script lang="ts">
  import type { Piece } from './data';
  let { piece, height = 260 }: { piece: Piece; height?: number } = $props();
  const score = $derived(piece.scores.find((s) => s.choir));
</script>

{#if score}
  <div class="score" style:height="{height}px" role="img" aria-label="Choir score for {piece.title}">
    <div class="staves"></div>
    <span>{piece.title} · {score.label}</span>
  </div>
{:else}
  <div class="score none" style:height="{Math.min(height, 120)}px">No Score uploaded for this Piece yet</div>
{/if}

<style>
  .score { position: relative; background: #fff; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .staves { position: absolute; inset: 30px 12px 12px; background:
    repeating-linear-gradient(#0000 0 14px, #444 14px 15px, #0000 15px 18px, #444 18px 19px, #0000 19px 22px, #444 22px 23px, #0000 23px 26px, #444 26px 27px, #0000 27px 30px, #444 30px 31px, #0000 31px 52px); opacity: .55; }
  span { position: absolute; top: 6px; left: 12px; font-size: 12px; color: var(--muted); }
  .none { display: grid; place-items: center; border: 2px dashed var(--line); background: none; color: var(--muted); font-size: 14px; text-align: center; padding: 12px; }
</style>
