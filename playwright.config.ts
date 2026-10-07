import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';

// Tests sign people in through the local Supabase stack. Values come from `.env` (written by
// `just env`); real environment variables win, which is how CI passes them.
Object.assign(process.env, { ...loadEnv('test', process.cwd(), 'SUPABASE_'), ...process.env });

// Two viewports because the layouts differ at the `lg` (1024 px) breakpoint.
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
