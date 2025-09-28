import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'test-data',
      // Exclude cleanup test from normal test run
      // add comment to line below and run pnpm test:cleanup to reclaim devnet sol after testing
      'src/tests/integration/batch-close-positions.test.ts',
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    setupFiles: ['src/tests/setup/test-setup.ts'],
    env: loadEnv(mode, process.cwd(), ['DEVNET_RPC_URL', 'RPC_URL']),
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
}));
