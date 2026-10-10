<script lang="ts">
  // One page of a Score on a canvas, fitted whole inside the space this component is given and drawn
  // again when the page or the space changes. pdf.js renders one page at a time. It loads from the
  // authenticated same-origin address (ADR 0003), so nothing here handles a signed link.
  import { drawPage, sharedPdf } from '../../shell/pdf';
  import AlertMessage from '../AlertMessage.svelte';

  const {
    src,
    page,
    onCount,
  }: {
    readonly src: string;
    /** The page to show, from 1. */
    readonly page: number;
    /** Told how many pages the document has, once it is loaded. */
    readonly onCount: (count: number) => void;
  } = $props();

  let canvas = $state<HTMLCanvasElement>();
  let width = $state(0);
  let height = $state(0);
  let failed = $state(false);
  // Which page has been drawn, as `<src>|<page>`; empty until the first one is.
  let drawn = $state('');

  $effect(() => {
    const source = src;
    const wanted = page;
    const target = canvas;
    const space = { width, height };
    if (target === undefined || space.width === 0 || space.height === 0) return;

    let current: ReturnType<typeof drawPage> | null = null;
    let stopped = false;
    failed = false;

    sharedPdf(source)
      .then((document) => {
        if (stopped) return undefined;
        onCount(document.numPages);
        current = drawPage(
          document,
          Math.min(Math.max(wanted, 1), document.numPages),
          target,
          space,
        );
        return current.done;
      })
      .then(() => {
        if (!stopped) drawn = `${source}|${wanted.toString()}`;
      })
      .catch(() => {
        if (!stopped) failed = true;
      });

    return () => {
      stopped = true;
      current?.cancel();
    };
  });
</script>

<div
  class="relative grid size-full place-items-center overflow-hidden"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <canvas
    bind:this={canvas}
    data-testid="score-page"
    data-drawn={drawn}
    class="max-h-full max-w-full bg-white shadow-md"
    class:invisible={drawn === ''}
    aria-label="Page {page} of the Score"
  ></canvas>
  {#if failed}
    <div class="absolute inset-x-3 top-3">
      <AlertMessage>This Score could not be shown. Try again in a moment.</AlertMessage>
    </div>
  {/if}
</div>
