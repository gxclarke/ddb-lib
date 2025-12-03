import { defineConfig } from '@rstest/core'

export default defineConfig({
  // Test file patterns
  include: ['packages/*/src/**/*.test.ts'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.d.ts',
    '**/integration/**',
  ],

  // Test environment
  environment: 'node',

  // Coverage configuration
  coverage: {
    enabled: false,
    provider: 'v8',
    include: ['packages/*/src/**/*.ts'],
    exclude: [
      '**/*.test.ts',
      '**/*.d.ts',
      '**/dist/**',
      '**/node_modules/**',
      '**/integration/**',
      '**/test-utils/**',
    ],
  },

  // Test timeout
  testTimeout: 10000,

  // Reporters
  reporters: ['default'],

  // Globals
  globals: true,
})
