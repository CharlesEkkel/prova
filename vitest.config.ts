import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Contract tests read the Supabase variables from `.env` (written by `just env`); real environment
// variables win, which is how CI passes them.
const supabaseEnv = loadEnv('test', process.cwd(), ['PUBLIC_SUPABASE_', 'SUPABASE_']);

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'resolver',
          include: ['src/lib/core/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'contract',
          include: ['tests/contract/**/*.test.ts'],
          environment: 'node',
          testTimeout: 20_000,
          env: supabaseEnv,
        },
      },
    ],
  },
});
