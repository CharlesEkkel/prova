import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Only `PUBLIC_*` variables reach the client, read via `import.meta.env`.
  envPrefix: 'PUBLIC_',
  plugins: [tailwindcss(), sveltekit({ adapter: adapter() })],
});
