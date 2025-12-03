import { defineConfig } from '@rstest/core'

export default defineConfig({
  // Test file patterns - only integration tests
  include: ['src/integration/**/*.test.ts', 'packages/*/src/integration/**/*.test.ts'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],

  // Test environment
  environment: 'node',

  // Coverage configuration
  coverage: {
    enabled: false,
    provider: 'v8',
    include: ['src/**/*.ts', 'packages/*/src/**/*.ts'],
    exclude: [
      '**/*.test.ts',
      '**/*.d.ts',
      '**/dist/**',
      '**/node_modules/**',
      '**/test-utils/**',
    ],
  },

  // Longer timeout for integration tests
  testTimeout: 30000,

  // Reporters
  reporters: ['default'],

  // Globals
  globals: true,

  // Sequential execution for integration tests to avoid conflicts
  maxConcurrency: 1,
})
