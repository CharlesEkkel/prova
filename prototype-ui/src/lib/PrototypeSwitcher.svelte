<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { SPEED } from './player.svelte';

  let { variants }: { variants: { key: string; name: string }[] } = $props();
  const current = $derived(page.url.searchParams.get('variant') ?? variants[0].key);
  const idx = $derived(Math.max(0, variants.findIndex((v) => v.key === current)));

  function cycle(d: number) {
    const next = variants[(idx + d + variants.length) % variants.length];
    const u = new URL(page.url);
    u.searchParams.set('variant', next.key);
    goto(u, { replaceState: true, noScroll: true, keepFocus: true });
  }
  function onkeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest('input, textarea, [contenteditable]')) return;
    if (e.key === 'ArrowLeft') cycle(-1);
    if (e.key === 'ArrowRight') cycle(1);
  }
</script>

<svelte:window {onkeydown} />

{#if dev}
  <div class="bar" role="group" aria-label="Prototype variant switcher">
    <button onclick={() => cycle(-1)} aria-label="Previous variant">←</button>
    <span><b>{variants[idx].key}</b> ({variants[idx].name})</span>
    <button onclick={() => cycle(1)} aria-label="Next variant">→</button>
    <small>time ×{SPEED}</small>
  </div>
{/if}

<style>
  .bar {
    position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 100;
    display: flex; align-items: center; gap: 12px; padding: 6px 10px; border-radius: 999px;
    background: #111; color: #fff; box-shadow: 0 4px 20px #0006; font-size: 14px; white-space: nowrap;
  }
  button { width: 36px; height: 36px; border-radius: 50%; background: #333; color: #fff; font-size: 18px; }
  small { color: #ffcc00; font-size: 11px; }
</style>
