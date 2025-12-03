import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  lib: {
    format: 'esm',
    entry: {
      index: './src/index.ts',
    },
  },
  output: {
    target: 'node',
    distPath: {
      root: 'dist',
    },
    externals: {
      '@aws-sdk/client-dynamodb': '@aws-sdk/client-dynamodb',
      '@aws-sdk/lib-dynamodb': '@aws-sdk/lib-dynamodb',
      '@ddb-lib/core': '@ddb-lib/core',
      '@ddb-lib/stats': '@ddb-lib/stats',
    },
  },
});
