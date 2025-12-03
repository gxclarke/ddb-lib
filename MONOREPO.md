# Monorepo Structure

This project is organized as a monorepo using npm workspaces. The structure allows for modular packages that can be used independently or together.

## Package Structure

```
ddb-lib/
├── packages/
│   ├── core/                    # @ddb-lib/core
│   ├── stats/                   # @ddb-lib/stats
│   ├── client/                  # @ddb-lib/client
│   └── amplify/                 # @ddb-lib/amplify
├── examples/
│   ├── standalone/
│   └── amplify/
└── package.json                 # Root workspace configuration
```

## Packages

### @ddb-lib/core
Core utilities for DynamoDB - pattern helpers, multi-attribute keys, and expression builders.
- **Dependencies**: None
- **Location**: `packages/core/`

### @ddb-lib/stats
Statistics collection and recommendation engine for DynamoDB operations.
- **Dependencies**: `@ddb-lib/core`
- **Location**: `packages/stats/`

### @ddb-lib/client
Standalone DynamoDB client with built-in best practices and monitoring.
- **Dependencies**: `@ddb-lib/core`, `@ddb-lib/stats`
- **Peer Dependencies**: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`
- **Location**: `packages/client/`

### @ddb-lib/amplify
AWS Amplify Gen 2 integration with DynamoDB best practices and monitoring.
- **Dependencies**: `@ddb-lib/core`, `@ddb-lib/stats`
- **Peer Dependencies**: `aws-amplify`
- **Location**: `packages/amplify/`

## Development Commands

### Build all packages
```bash
npm run build
```

### Run tests for all packages
```bash
npm run test
```

### Type check all packages
```bash
npm run typecheck
```

### Lint all packages
```bash
npm run lint
```

### Work with a specific package
```bash
# Build a specific package
npm run build -w @ddb-lib/core

# Test a specific package
npm run test -w @ddb-lib/stats

# Type check a specific package
npm run typecheck -w @ddb-lib/client
```

## Package Dependencies

```
@ddb-lib/core (no dependencies)
  ↓
@ddb-lib/stats
  ↓
@ddb-lib/client (+ AWS SDK)
@ddb-lib/amplify (+ aws-amplify)
```

## Build Configuration

Each package has its own:
- `package.json` - Package metadata and dependencies
- `tsconfig.json` - TypeScript configuration (extends root config)
- `rsbuild.config.ts` - Build configuration
- `src/` - Source code directory
- `dist/` - Build output directory (generated)

## TypeScript Project References

The monorepo uses TypeScript project references for efficient builds and type checking:
- Each package references its dependencies
- Incremental builds are enabled
- Type checking respects package boundaries

## Installation

After cloning the repository:

```bash
npm install
```

This will install all dependencies for the root workspace and all packages.

## Publishing

Each package can be published independently to npm:

```bash
cd packages/core
npm publish --access public
```

Note: Packages use the `@ddb-lib` scope and should be published with public access.
