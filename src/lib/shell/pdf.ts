// Thin pdf.js loader, imported lazily so nothing PDF-related runs during SSR.
// The worker is a separate asset and the WebAssembly decoders are served from /pdfjs/wasm/
// (copied there by scripts/copy-pdfjs-wasm.mjs) so scanned scores (JBIG2 / JPEG2000) render.
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { pdfjsWasmPath } from '../core/paths';
import { fitScale } from '../core/scores';

export const loadPdf = async (src: string): Promise<PDFDocumentProxy> => {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs.getDocument({ url: src, wasmUrl: pdfjsWasmPath }).promise;
};

// The panel's preview and the full-screen viewer show the same Score, so a document is loaded once and
// shared until the Singer leaves the Piece (`closePdfs`).
const opened = new Map<string, Promise<PDFDocumentProxy>>();

/** The document at `src`, loaded the first time it is asked for and shared after that. */
export const sharedPdf = (src: string): Promise<PDFDocumentProxy> => {
  const found = opened.get(src);
  if (found !== undefined) return found;
  const loading = loadPdf(src);
  opened.set(src, loading);
  // A failed load is forgotten, so the next ask tries again.
  loading.catch(() => {
    opened.delete(src);
  });
  return loading;
};

/** Lets go of every shared document, for when the Singer leaves the Piece. */
export const closePdfs = (): void => {
  const closing = [...opened.values()];
  opened.clear();
  closing.forEach((loading) => {
    loading.then((document) => document.loadingTask.destroy()).catch(() => undefined);
  });
};

export type PageDrawing = {
  /** Settles when the page is drawn, or has been cancelled. Rejects only when the page could not be drawn. */
  readonly done: Promise<void>;
  readonly cancel: () => void;
};

type Space = { readonly width: number; readonly height: number };

/** Draws one page, fitted whole inside `space` (in CSS pixels), sharp on high-density screens. */
export const drawPage = (
  document: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  space: Space,
): PageDrawing => {
  const state: { cancelled: boolean; task: RenderTask | null } = { cancelled: false, task: null };
  // Read through a function: it can change during any `await`, which narrowing would not see.
  const cancelled = (): boolean => state.cancelled;
  const done = (async (): Promise<void> => {
    const page = await document.getPage(pageNumber);
    if (cancelled()) return;
    const natural = page.getViewport({ scale: 1 });
    const scale = fitScale(natural, space);
    const density = Math.max(window.devicePixelRatio, 1);
    const viewport = page.getViewport({ scale: scale * density });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(natural.width * scale).toString()}px`;
    canvas.style.height = `${Math.floor(natural.height * scale).toString()}px`;
    const task = page.render({ canvas, viewport });
    state.task = task;
    try {
      await task.promise;
    } catch (cause) {
      // A drawing we cancelled ourselves (the page or the size changed) is not a failure.
      if (!cancelled()) throw cause;
    }
  })();
  return {
    done,
    cancel: () => {
      state.cancelled = true;
      state.task?.cancel();
    },
  };
};
