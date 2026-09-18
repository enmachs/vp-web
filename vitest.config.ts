import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Integration tests round-trip real objects through R2.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Both integration files share the local database and the R2 bucket;
    // running them in one worker keeps their fixtures from interleaving.
    fileParallelism: false,
  },
});
