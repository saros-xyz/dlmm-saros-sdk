import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@coral-xyz/anchor', '@solana/spl-token', '@solana/web3.js', 'bs58', 'js-big-decimal', 'lodash'],
});
