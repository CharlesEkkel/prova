// Reports the size of the built client bundle (raw and gzip) so Effect's cost stays visible.
// Run after `pnpm build`. Prints a Markdown table, and appends it to the job summary on CI.
import { appendFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dir = join(import.meta.dirname, '..', '.svelte-kit', 'output', 'client', '_app', 'immutable');

const walk = (d) =>
  readdirSync(d).flatMap((name) => {
    const p = join(d, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const js = walk(dir).filter((p) => p.endsWith('.js'));
const raw = js.reduce((sum, p) => sum + statSync(p).size, 0);
const gzip = js.reduce((sum, p) => sum + gzipSync(readFileSync(p)).length, 0);
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

const report = `### Client bundle size\n\n| Files | Raw | Gzip |\n| --- | --- | --- |\n| ${js.length} | ${kb(raw)} | ${kb(gzip)} |\n`;
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
