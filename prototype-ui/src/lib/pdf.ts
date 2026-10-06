// PROTOTYPE: thin pdf.js loader. Imported lazily so nothing PDF-related runs during SSR.
import type { PDFDocumentProxy } from 'pdfjs-dist';

const cache = new Map<string, Promise<PDFDocumentProxy>>();

export function loadPdf(src: string): Promise<PDFDocumentProxy> {
  const hit = cache.get(src);
  if (hit) return hit;
  const doc = (async () => {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    return pdfjs.getDocument({ url: src, wasmUrl: '/pdfjs/wasm/' }).promise;
  })();
  cache.set(src, doc);
  doc.catch(() => cache.delete(src)); // allow a retry after a failed load (e.g. the PDF was not there yet)
  return doc;
}
