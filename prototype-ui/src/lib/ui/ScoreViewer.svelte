<script lang="ts">
  // Fullscreen score during playback. Page position is remembered per Score for the playback session
  // (see `score.pages`), so closing and reopening returns to the same page. Page turns: edge buttons,
  // swipe, or arrow / Page keys. A real browser-fullscreen toggle is offered too (it needs a user gesture).
  import { Dialog } from 'bits-ui';
  import X from '@lucide/svelte/icons/x';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Minimize from '@lucide/svelte/icons/minimize';
  import { currentItem, pageOf, score, scoreOf } from '../player.svelte';
  import PdfPage from './PdfPage.svelte';
  import Scrubber from './Scrubber.svelte';
  import Transport from './Transport.svelte';
  let { queue }: { queue: boolean } = $props();

  const item = $derived(currentItem());
  const sc = $derived(item ? scoreOf(item.piece) : undefined);
  let numPages = $state(0);
  const page = $derived(sc ? pageOf(sc) : 1);
  const last = $derived(numPages || page);

  function turn(d: number) {
    if (!sc) return;
    score.pages[sc.id] = Math.min(last, Math.max(1, page + d));
  }
  function onkeydown(e: KeyboardEvent) {
    if (!score.open || (e.target as HTMLElement | null)?.closest('[role=slider]')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') turn(1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn(-1);
  }
  let startX = 0;
  const onpointerdown = (e: PointerEvent) => (startX = e.clientX);
  const onpointerup = (e: PointerEvent) => {
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 60) turn(dx < 0 ? 1 : -1);
  };

  let isFs = $state(false);
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  $effect(() => {
    const sync = () => (isFs = !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  });
  // leaving the score (song done, closed) also leaves browser fullscreen
  $effect(() => {
    if (!score.open && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  });
  const edge = 'absolute top-1/2 z-10 grid size-14 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-0';
</script>

<svelte:window {onkeydown} />

<Dialog.Root bind:open={score.open}>
  <Dialog.Portal>
    {#if item && sc}
      <Dialog.Content class="fixed inset-0 z-50 flex flex-col bg-zinc-200 outline-none dark:bg-zinc-950">
        <Dialog.Title class="sr-only">Score: {item.piece.title}</Dialog.Title>
        <Dialog.Description class="sr-only">{sc.label}, page {page} of {last}. Use the arrow keys or swipe to turn pages.</Dialog.Description>

        <div class="flex items-center gap-2 border-b border-zinc-300 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <Dialog.Close class="grid size-11 place-items-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800" aria-label="Close score"><X class="size-5" /></Dialog.Close>
          <div class="min-w-0 flex-1"><p class="truncate font-semibold">{item.piece.title}</p><p class="truncate text-xs text-zinc-500">{sc.label}</p></div>
          <p class="text-sm tabular-nums" aria-live="polite">Page <b>{page}</b> / {last}</p>
          <button onclick={toggleFs} class="grid size-11 place-items-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800" aria-label={isFs ? 'Exit full screen' : 'Full screen'}>
            {#if isFs}<Minimize class="size-5" />{:else}<Maximize class="size-5" />{/if}
          </button>
        </div>

        <div class="relative min-h-0 flex-1 touch-pan-y" {onpointerdown} {onpointerup} role="presentation">
          <PdfPage src={sc.file} {page} bind:numPages class="absolute inset-0 p-2 sm:p-4" />
          <button class="{edge} left-2" onclick={() => turn(-1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft class="size-7" /></button>
          <button class="{edge} right-2" onclick={() => turn(1)} disabled={page >= last} aria-label="Next page"><ChevronRight class="size-7" /></button>
        </div>

        <div class="flex flex-col gap-1 border-t border-zinc-300 bg-white/80 px-4 pt-2 pb-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          {#if item.track}<Scrubber track={item.track} />{/if}
          <Transport big={false} {queue} />
        </div>
      </Dialog.Content>
    {/if}
  </Dialog.Portal>
</Dialog.Root>
