// ⚙️ Vitest Configuration
// Test configuration for unit, contract, and E2E tests

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.ts',
        'public/'
      ]
    },
    include: [
      'tests/**/*.test.ts'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.wrangler/'
    ],
    testTimeout: 30000, // 30 seconds for API calls
    hookTimeout: 30000
  }
});
