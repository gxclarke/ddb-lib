import { defineConfig } from '@rstest/core'

export default defineConfig({
  // Test file patterns
  include: ['src/**/*.test.ts'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],

  // Test environment
  environment: 'node',

  // Coverage configuration
  coverage: {
    enabled: false,
    provider: 'v8',
    include: ['src/**/*.ts'],
    exclude: ['**/*.test.ts', '**/*.d.ts', '**/dist/**'],
  },

  // Test timeout
  testTimeout: 5000,

  // Reporters
  reporters: ['default'],

  // Globals
  globals: true,
})
