<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { SPEED } from '../player.svelte';

  // `param`: URL search param holding the choice. `value`/`onchange`: optional external state so a choice
  // survives navigation (links drop the query string). `keys`: keyboard shortcuts for previous/next.
  let {
    variants,
    param = 'variant',
    label = '',
    keys = ['ArrowLeft', 'ArrowRight'],
    bottom = 'bottom-24 lg:bottom-28',
    value,
    onchange
  }: {
    variants: { key: string; name: string }[];
    param?: string;
    label?: string;
    keys?: [string, string];
    bottom?: string;
    value?: string;
    onchange?: (key: string) => void;
  } = $props();
  const current = $derived(value ?? page.url.searchParams.get(param) ?? variants[0].key);
  const idx = $derived(Math.max(0, variants.findIndex((v) => v.key === current)));

  function cycle(d: number) {
    const next = variants[(idx + d + variants.length) % variants.length];
    onchange?.(next.key);
    const u = new URL(page.url);
    u.searchParams.set(param, next.key);
    goto(u, { replaceState: true, noScroll: true, keepFocus: true });
  }
  function onkeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest('input, textarea, [contenteditable], [role=slider]')) return;
    if (e.key === keys[0]) cycle(-1);
    if (e.key === keys[1]) cycle(1);
  }
</script>

<svelte:window {onkeydown} />

{#if dev}
  <div role="group" aria-label="Prototype {label || param} switcher" class="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black py-1.5 pr-4 pl-1.5 text-sm whitespace-nowrap text-white shadow-2xl {bottom}">
    <button onclick={() => cycle(-1)} aria-label="Previous {label || 'variant'}" class="grid size-9 place-items-center rounded-full bg-zinc-800 hover:bg-zinc-700"><ChevronLeft class="size-5" /></button>
    <span>{#if label}<span class="text-xs text-yellow-300">{label}</span>{/if} <b>{variants[idx].key}</b> <span class="text-zinc-300">({variants[idx].name})</span></span>
    <button onclick={() => cycle(1)} aria-label="Next {label || 'variant'}" class="grid size-9 place-items-center rounded-full bg-zinc-800 hover:bg-zinc-700"><ChevronRight class="size-5" /></button>
    {#if !label}<span class="text-xs text-yellow-300">time ×{SPEED}</span>{/if}
  </div>
{/if}
