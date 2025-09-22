// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/services/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'test-data'],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Global setup runs once before all tests
    setupFiles: ['src/test/setup/test-setup.ts'],
    env: loadEnv(mode, process.cwd(), ['RPC_URL']),
    // Run tests sequentially to avoid RPC rate limits
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
}));