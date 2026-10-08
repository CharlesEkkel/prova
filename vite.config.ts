import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Only `PUBLIC_*` variables reach the client, read via `import.meta.env`.
  envPrefix: 'PUBLIC_',
  plugins: [
    tailwindcss(),
    sveltekit({ adapter: adapter() }),
    {
      // `vite dev` fails to start without this: vite-plugin-svelte asks the SSR environment to
      // pre-bundle every `svelte/*` entry (including `svelte/compiler`), and the SSR optimiser then
      // cannot resolve `node:module` ("Could not resolve 'node:module' in \0rolldown/runtime.js").
      // The server runs those entries unbundled, so nothing is lost. Builds are unaffected.
      name: 'prova:no-ssr-prebundle',
      configEnvironment: {
        order: 'post',
        handler(name, config) {
          if (name === 'ssr' && config.optimizeDeps) config.optimizeDeps.include = [];
        },
      },
    },
  ],
});
