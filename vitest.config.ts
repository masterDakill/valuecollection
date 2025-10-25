// ⚙️ Vitest Configuration
// Test configuration for unit, contract, and E2E tests

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup/server.ts"],
    coverage: {
      enabled: process.env.VITEST_COVERAGE === "true",
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "*.config.ts",
        "ecosystem.config.cjs",
        "public/",
        "src/ai-experts.ts",
        "src/index.tsx",
        "src/renderer.tsx",
        "src/lib/**",
        "src/routes/**",
        "src/services/**",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/", "dist/", ".wrangler/"],
    testTimeout: 30000, // 30 seconds for API calls
    hookTimeout: 30000,
  },
});
