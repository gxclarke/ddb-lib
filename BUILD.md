# Build Configuration

This document describes the monorepo build configuration for ddb-lib.

## Overview

The monorepo uses:
- **npm workspaces** for package management
- **rsbuild** for JavaScript bundling
- **TypeScript** with project references for type checking and declaration generation
- **Sequential build order** to ensure dependencies are built first

## Package Structure

```
packages/
├── core/       # @ddb-lib/core - Core utilities (no dependencies)
├── stats/      # @ddb-lib/stats - Statistics and monitoring (depends on core)
├── client/     # @ddb-lib/client - TableClient (depends on core, stats)
└── amplify/    # @ddb-lib/amplify - Amplify integration (depends on core, stats)
```

## Build Order

Packages are built in dependency order:

1. **@ddb-lib/core** - Built first (no dependencies)
2. **@ddb-lib/stats** - Built second (depends on core)
3. **@ddb-lib/client** - Built third (depends on core, stats)
4. **@ddb-lib/amplify** - Built fourth (depends on core, stats)

## Build Scripts

### Root Level

```bash
# Build all packages in order
npm run build

# Build individual packages
npm run build:core
npm run build:stats
npm run build:client
npm run build:amplify

# Clean all build artifacts
npm run clean

# Type check all packages
npm run typecheck

# Run tests in all packages
npm run test
```

### Package Level

Each package has the following scripts:

```bash
# Build the package (rsbuild + TypeScript declarations)
npm run build

# Clean build artifacts
npm run clean

# Type check without emitting
npm run typecheck

# Run tests
npm run test
```

## TypeScript Configuration

### Project References

TypeScript project references are configured to enable incremental builds and proper type checking across packages:

- **packages/core/tsconfig.json** - No references (base package)
- **packages/stats/tsconfig.json** - References `../core`
- **packages/client/tsconfig.json** - References `../core` and `../stats`
- **packages/amplify/tsconfig.json** - References `../core` and `../stats`

All package tsconfigs extend the root `tsconfig.json` and set:
- `composite: true` - Enable project references
- `emitDeclarationOnly: true` - Only emit .d.ts files (rsbuild handles .js)

### Build Process

Each package build consists of two steps:

1. **rsbuild build** - Bundles JavaScript to `dist/index.js`
2. **tsc --build** - Generates TypeScript declarations to `dist/*.d.ts`

The `--build` flag enables TypeScript's incremental build mode with project references.

## rsbuild Configuration

Each package has a standardized `rsbuild.config.ts`:

```typescript
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
      // Package dependencies marked as external
    },
  },
});
```

### Externals

Each package marks its dependencies as external to avoid bundling them:

- **core**: No externals (no dependencies)
- **stats**: `@ddb-lib/core`
- **client**: `@ddb-lib/core`, `@ddb-lib/stats`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`
- **amplify**: `@ddb-lib/core`, `@ddb-lib/stats`, `aws-amplify`

## Package Dependencies

Packages use the `workspace:*` protocol for internal dependencies:

```json
{
  "dependencies": {
    "@ddb-lib/core": "workspace:*",
    "@ddb-lib/stats": "workspace:*"
  }
}
```

This ensures:
- Development uses local packages
- Publishing resolves to actual version numbers

## Output Structure

After building, each package has:

```
dist/
├── index.js           # Bundled JavaScript (ESM)
├── index.d.ts         # Main type declarations
├── index.d.ts.map     # Source map for declarations
├── *.d.ts             # Individual module declarations
└── *.d.ts.map         # Source maps for each module
```

## Tree-Shaking Support

All packages are configured for optimal tree-shaking:

- `"type": "module"` in package.json
- `"sideEffects": false` in package.json
- ESM output format
- Named exports only

## Troubleshooting

### Build Fails with "Cannot find module"

If you see errors about missing modules from other packages:

1. Ensure packages are built in order (use `npm run build` from root)
2. Clean and rebuild: `npm run clean && npm run build`
3. Check that declaration files exist in `packages/*/dist/*.d.ts`

### Incremental Build Issues

If TypeScript incremental builds are causing issues:

1. Clean build info: `npm run clean` (removes tsconfig.tsbuildinfo)
2. Rebuild from scratch: `npm run build`

### Type Errors in Tests

Test files are excluded from the build but included in type checking. If you see type errors in tests:

1. Ensure the package is built: `npm run build`
2. Check that dependencies are built
3. Run `npm run typecheck` to see all type errors

## Performance

Build times (approximate):

- **Clean build**: ~0.3s total
  - core: ~0.1s
  - stats: ~0.05s
  - client: ~0.05s
  - amplify: ~0.05s

- **Incremental build**: ~0.1s (only changed packages)

TypeScript project references enable fast incremental builds by only recompiling changed packages and their dependents.
