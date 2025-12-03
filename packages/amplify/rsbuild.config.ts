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
      'aws-amplify': 'aws-amplify',
      '@ddb-lib/core': '@ddb-lib/core',
      '@ddb-lib/stats': '@ddb-lib/stats',
    },
  },
});
