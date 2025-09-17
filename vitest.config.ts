import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000, // 30s for blockchain calls
    hookTimeout: 30000,
    env: loadEnv(mode, process.cwd(), ['RPC_URL']),
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
}));
