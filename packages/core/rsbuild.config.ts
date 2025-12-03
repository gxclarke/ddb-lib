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
  },
});
