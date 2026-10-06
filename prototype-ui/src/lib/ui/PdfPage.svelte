<script lang="ts">
  // Renders one page of a PDF, scaled to fit (contain) inside its box. Bindable numPages for paging UIs.
  import { loadPdf } from '../pdf';
  let { src, page = 1, numPages = $bindable(0), class: cls = '' }: { src: string; page?: number; numPages?: number; class?: string } = $props();
  let box = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let size = $state({ w: 0, h: 0 });
  let status = $state<'loading' | 'ready' | 'error'>('loading');

  $effect(() => {
    if (!box) return;
    const ro = new ResizeObserver(([e]) => (size = { w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box);
    return () => ro.disconnect();
  });

  $effect(() => {
    const el = canvas;
    const { w, h } = size;
    const wanted = page;
    if (!el || w < 20 || h < 20) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | undefined;
    (async () => {
      try {
        const doc = await loadPdf(src);
        if (cancelled) return;
        numPages = doc.numPages;
        const pdfPage = await doc.getPage(Math.min(Math.max(1, wanted), doc.numPages));
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const fit = Math.min(w / base.width, h / base.height);
        const dpr = window.devicePixelRatio || 1;
        const viewport = pdfPage.getViewport({ scale: fit * dpr });
        el.width = Math.floor(viewport.width);
        el.height = Math.floor(viewport.height);
        el.style.width = `${viewport.width / dpr}px`;
        el.style.height = `${viewport.height / dpr}px`;
        task = pdfPage.render({ canvas: el, viewport });
        await task.promise;
        if (!cancelled) status = 'ready';
      } catch (e) {
        if (!cancelled && (e as { name?: string }).name !== 'RenderingCancelledException') {
          console.error('PdfPage: could not render', src, e);
          status = 'error';
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  });
</script>

<!-- callers position this box (absolute inset-0 inside a sized parent) so its size never depends on the canvas -->
<div bind:this={box} class="grid place-items-center overflow-hidden {cls}">
  <canvas bind:this={canvas} class="bg-white shadow-sm {status === 'error' ? 'hidden' : status === 'loading' ? 'invisible' : ''}" aria-label="Score page {page}"></canvas>
  {#if status === 'loading'}<span class="absolute text-sm text-zinc-500">Loading score…</span>{/if}
  {#if status === 'error'}<span class="absolute max-w-xs text-center text-sm text-zinc-500">Couldn't load the score PDF. Copy a PDF to <code>static/scores/sample.pdf</code>.</span>{/if}
</div>
