// Thin pdf.js loader, imported lazily so nothing PDF-related runs during SSR.
// The worker is a separate asset and the WebAssembly decoders are served from /pdfjs/wasm/
// (copied there by scripts/copy-pdfjs-wasm.mjs) so scanned scores (JBIG2 / JPEG2000) render.
import type { PDFDocumentProxy } from 'pdfjs-dist';

export const pdfjsWasmUrl = '/pdfjs/wasm/';

export const loadPdf = async (src: string): Promise<PDFDocumentProxy> => {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs.getDocument({ url: src, wasmUrl: pdfjsWasmUrl }).promise;
};
