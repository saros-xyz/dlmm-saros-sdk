import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist"],
    testTimeout: 30000, // 30s for blockchain calls
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
