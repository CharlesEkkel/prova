<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { SPEED } from '../player.svelte';

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
    if ((e.target as HTMLElement | null)?.closest('input, textarea, [contenteditable], [role=slider]')) return;
    if (e.key === 'ArrowLeft') cycle(-1);
    if (e.key === 'ArrowRight') cycle(1);
  }
</script>

<svelte:window {onkeydown} />

{#if dev}
  <div role="group" aria-label="Prototype variant switcher" class="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black py-1.5 pr-4 pl-1.5 text-sm whitespace-nowrap text-white shadow-2xl lg:bottom-28">
    <button onclick={() => cycle(-1)} aria-label="Previous variant" class="grid size-9 place-items-center rounded-full bg-zinc-800 hover:bg-zinc-700"><ChevronLeft class="size-5" /></button>
    <span><b>{variants[idx].key}</b> <span class="text-zinc-300">({variants[idx].name})</span></span>
    <button onclick={() => cycle(1)} aria-label="Next variant" class="grid size-9 place-items-center rounded-full bg-zinc-800 hover:bg-zinc-700"><ChevronRight class="size-5" /></button>
    <span class="text-xs text-yellow-300">time ×{SPEED}</span>
  </div>
{/if}
