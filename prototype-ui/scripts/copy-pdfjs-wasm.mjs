// pdf.js decodes some scanned scores (JBIG2 / JPEG2000 images) with WebAssembly it loads from `wasmUrl`.
// Copy those files next to the app so they are served from /pdfjs/wasm/. Runs after `pnpm install`.
import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const from = join(dirname(require.resolve('pdfjs-dist/package.json')), 'wasm');
const to = join(import.meta.dirname, '..', 'static', 'pdfjs', 'wasm');
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log(`copied pdf.js wasm to ${to}`);
