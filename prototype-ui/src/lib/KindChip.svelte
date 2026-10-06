<script lang="ts">
  import { kindLabel, type Track } from './data';
  let { track }: { track: Track } = $props();
</script>

<!-- Combined = solid dark; part-only = outlined; part-predominant = outlined with a filled "mix" half.
     Shape + text, never colour alone. -->
<span class="chip {track.kind}">
  {#if track.kind === 'combined'}◼◼◼◼{:else if track.kind === 'part-only'}◻{:else}◧{/if}
  {kindLabel(track)}
</span>

<style>
  .chip { display: inline-flex; gap: 6px; align-items: center; padding: 2px 9px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; border: 2px solid var(--ink); }
  .combined { background: var(--ink); color: #fff; }
  .part-only { background: #fff; color: var(--ink); }
  .part-predominant { background: linear-gradient(90deg, #fff 55%, #cfc8e6 55%); color: var(--ink); }
</style>
