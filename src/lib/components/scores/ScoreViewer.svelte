<script lang="ts">
  // The full-screen Score viewer: the PDF fitted to the screen with the playback controls beneath.
  // Pages turn by tapping the right half (forward) or the left half (back), the edge buttons,
  // swiping, or the arrow and Page Up / Down keys; the edge buttons do not also count as a tap. The
  // page is remembered per Score (see score-pages.svelte.ts). It closes on Esc or the close button,
  // and when the song ends. A separate button asks the browser for real full screen, which needs a tap.
  import { Dialog } from 'bits-ui';
  import { ChevronLeft, ChevronRight, Maximize, Minimize, Play, X } from '@lucide/svelte';
  import { scorePdfPath } from '../../core/paths';
  import type { PieceId } from '../../core/pieces';
  import {
    keyDirection,
    pageAfter,
    swipeDirection,
    tapDirection,
    type PageDirection,
    type Score,
  } from '../../core/scores';
  import type { AudioPlayer } from '../../shell/audio-player.svelte';
  import { pageOfScore, rememberScorePage } from '../../shell/score-pages.svelte';
  import Btn from '../ui/Btn.svelte';
  import PlayerControls from '../tracks/PlayerControls.svelte';
  import PdfPage from './PdfPage.svelte';

  const {
    open,
    onClose,
    pieceId,
    score,
    player,
    canStart,
    onStart,
  }: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly pieceId: PieceId;
    readonly score: Score | null;
    readonly player: AudioPlayer;
    /** Whether Start is offered: there is a track to play and the Singer has not started one. */
    readonly canStart: boolean;
    readonly onStart: () => void;
  } = $props();

  let count = $state(0);
  let stage = $state<HTMLElement>();
  let content = $state<HTMLElement | null>(null);
  let browserFullScreen = $state(false);

  const page = $derived(score === null ? 1 : pageOfScore(score.id));

  const turn = (direction: PageDirection): void => {
    if (score === null) return;
    rememberScorePage(score.id, pageAfter(page, count, direction));
  };

  // A swipe also ends in a click on some browsers; that click must not turn a second page.
  let swipeFrom: { readonly x: number; readonly y: number } | null = null;
  let swiped = false;

  const onPointerDown = (event: PointerEvent): void => {
    swiped = false;
    swipeFrom = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (swipeFrom === null) return;
    const direction = swipeDirection(event.clientX - swipeFrom.x, event.clientY - swipeFrom.y);
    swipeFrom = null;
    if (direction === null) return;
    swiped = true;
    turn(direction);
  };
  const onStageClick = (event: MouseEvent): void => {
    if (swiped) {
      swiped = false;
      return;
    }
    if (stage === undefined) return;
    const box = stage.getBoundingClientRect();
    turn(tapDirection(event.clientX - box.left, box.width));
  };

  // The arrow keys belong to a slider or a field when one has focus.
  const takesArrowKeys = (target: EventTarget | null): boolean =>
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;

  const onKeyDown = (event: KeyboardEvent): void => {
    const direction = keyDirection(event.key);
    if (direction === null || takesArrowKeys(event.target)) return;
    event.preventDefault();
    turn(direction);
  };

  const toggleBrowserFullScreen = async (): Promise<void> => {
    try {
      if (document.fullscreenElement === null) await content?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // The browser may refuse (no user gesture, or not allowed here); the viewer still works.
    }
  };

  // The song ending closes the viewer, once: reopening it afterwards stays open.
  let sawEnd = false;
  $effect(() => {
    const ended = player.ended;
    if (ended && !sawEnd && open) onClose();
    sawEnd = ended;
  });

  // Leaving the viewer leaves browser full screen too.
  $effect(() => {
    if (!open && document.fullscreenElement !== null) void document.exitFullscreen();
  });
</script>

<svelte:document
  onfullscreenchange={() => {
    browserFullScreen = document.fullscreenElement !== null;
  }}
/>

<Dialog.Root
  {open}
  onOpenChange={(next) => {
    if (!next) onClose();
  }}
>
  <Dialog.Portal>
    <Dialog.Content
      bind:ref={content}
      data-testid="score-viewer"
      onkeydown={onKeyDown}
      class="fixed inset-0 z-[60] flex flex-col bg-zinc-100 outline-none dark:bg-zinc-950"
    >
      <header class="flex items-center gap-2 border-b bg-white px-3 py-2 dark:bg-zinc-900">
        <Dialog.Title class="min-w-0 flex-1 truncate text-sm font-semibold">
          {score?.label ?? 'Score'}
        </Dialog.Title>
        <Dialog.Description class="sr-only">
          Turn pages by tapping the right or left half, swiping, or with the arrow keys.
        </Dialog.Description>
        <span class="text-sm text-zinc-500 tabular-nums" data-testid="page-indicator">
          Page {page}{count > 0 ? ` of ${count.toString()}` : ''}
        </span>
        {#if document.fullscreenEnabled}
          <Btn
            variant="ghost"
            size="icon"
            aria-label={browserFullScreen ? 'Exit browser full screen' : 'Browser full screen'}
            onclick={toggleBrowserFullScreen}
          >
            {#if browserFullScreen}<Minimize class="size-5" />{:else}<Maximize
                class="size-5"
              />{/if}
          </Btn>
        {/if}
        <Dialog.Close>
          {#snippet child({ props })}
            <Btn variant="ghost" size="icon" aria-label="Close" {...props}><X class="size-5" /></Btn
            >
          {/snippet}
        </Dialog.Close>
      </header>

      <!-- Tapping the page turns it by half; the edge buttons and keys do the same for those who prefer them. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div
        bind:this={stage}
        data-testid="score-stage"
        class="relative min-h-0 flex-1 touch-pan-y p-2 select-none"
        onpointerdown={onPointerDown}
        onpointerup={onPointerUp}
        onclick={onStageClick}
      >
        {#if score !== null}
          <PdfPage
            src={scorePdfPath(pieceId, score.id)}
            {page}
            onCount={(found) => {
              count = found;
            }}
          />
        {/if}
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onclick={(event) => {
            event.stopPropagation();
            turn('back');
          }}
          class="absolute inset-y-0 left-0 grid w-12 place-items-center text-zinc-500 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/5"
        >
          <ChevronLeft class="size-7" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={count > 0 && page >= count}
          onclick={(event) => {
            event.stopPropagation();
            turn('forward');
          }}
          class="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-500 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/5"
        >
          <ChevronRight class="size-7" aria-hidden="true" />
        </button>
      </div>

      {#if player.started || canStart}
        <footer class="flex flex-col gap-2 border-t bg-white px-4 py-3 dark:bg-zinc-900">
          {#if player.started}
            <PlayerControls {player} />
          {:else}
            <Btn onclick={onStart} class="self-center"
              ><Play class="size-5 fill-current" /> Start</Btn
            >
          {/if}
        </footer>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
