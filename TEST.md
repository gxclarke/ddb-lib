# Test Configuration

This document describes the test configuration for the ddb-lib monorepo.

## Overview

The monorepo uses **rstest** as the test runner for all packages. Tests are organized into:
- **Unit tests**: Fast, isolated tests for individual functions and classes
- **Integration tests**: End-to-end tests against DynamoDB Local

## Test Structure

```
packages/
├── core/
│   ├── src/**/*.test.ts          # Unit tests
│   └── rstest.config.ts          # Package-specific config
├── stats/
│   ├── src/**/*.test.ts          # Unit tests
│   └── rstest.config.ts          # Package-specific config
├── client/
│   ├── src/**/*.test.ts          # Unit tests
│   └── rstest.config.ts          # Package-specific config
└── amplify/
    ├── src/**/*.test.ts          # Unit tests
    └── rstest.config.ts          # Package-specific config

src/
└── integration/
    └── **/*.integration.test.ts  # Integration tests

rstest.config.ts                  # Root config for all unit tests
rstest.integration.config.ts      # Config for integration tests
```

## Running Tests

### All Tests

Run all unit tests across all packages:

```bash
npm test
```

Or use the explicit command:

```bash
npm run test:all
```

### Unit Tests Only

Run only unit tests (excludes integration tests):

```bash
npm run test:unit
```

### Integration Tests Only

Run only integration tests (requires DynamoDB Local):

```bash
npm run test:integration
```

**Note**: Integration tests require DynamoDB Local to be running on `http://localhost:8000`. See the [Integration Tests](#integration-tests) section below.

### Package-Specific Tests

Run tests for a specific package:

```bash
# Core package
npm run test:core

# Stats package
npm run test:stats

# Client package
npm run test:client

# Amplify package
npm run test:amplify
```

### Watch Mode

Run tests in watch mode (re-runs on file changes):

```bash
# All packages
npm run test:watch

# Specific package
npm run test:watch -w @ddb-lib/core
```

### Coverage

Run tests with coverage reporting:

```bash
npm run test:coverage
```

## Test Configuration Files

### Root Configuration (`rstest.config.ts`)

The root configuration runs all unit tests across all packages:

- **Include**: `packages/*/src/**/*.test.ts`
- **Exclude**: Integration tests, node_modules, dist
- **Timeout**: 10 seconds
- **Environment**: Node.js

### Integration Configuration (`rstest.integration.config.ts`)

The integration configuration runs only integration tests:

- **Include**: `src/integration/**/*.test.ts`
- **Exclude**: node_modules, dist
- **Timeout**: 30 seconds (longer for database operations)
- **Environment**: Node.js
- **Concurrency**: Sequential (1 test at a time to avoid conflicts)

### Package Configurations

Each package has its own `rstest.config.ts` for running tests within that package:

- **Include**: `src/**/*.test.ts`
- **Exclude**: node_modules, dist
- **Timeout**: 5 seconds
- **Environment**: Node.js

## Integration Tests

Integration tests verify end-to-end functionality against a real DynamoDB instance (DynamoDB Local).

### Prerequisites

You must have DynamoDB Local running before running integration tests.

#### Option 1: Docker (Recommended)

```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

#### Option 2: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb"
```

Then run:

```bash
docker-compose up -d
```

#### Option 3: Local Installation

Download and run DynamoDB Local:

```bash
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

### Running Integration Tests

Once DynamoDB Local is running:

```bash
npm run test:integration
```

### Integration Test Files

- `src/integration/crud.integration.test.ts` - CRUD operations
- `src/integration/query.integration.test.ts` - Query and scan operations
- `src/integration/batch.integration.test.ts` - Batch operations
- `src/integration/access-patterns.integration.test.ts` - Access patterns
- `src/integration/stats.integration.test.ts` - Statistics collection

See `src/integration/README.md` for detailed documentation.

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from '@rstest/core'
import { PatternHelpers } from './pattern-helpers'

describe('PatternHelpers', () => {
  describe('entityKey', () => {
    it('should create entity key with type and id', () => {
      const key = PatternHelpers.entityKey('USER', '123')
      expect(key).toBe('USER#123')
    })
  })
})
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@rstest/core'
import { TableClient } from '../table-client'
import { createLocalClient, setupTestTable } from '../test-utils/dynamodb-local'

describe('TableClient Integration', () => {
  let client: TableClient
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const setup = await setupTestTable('test-table')
    client = new TableClient({
      tableName: 'test-table',
      client: createLocalClient(),
    })
    cleanup = setup.cleanup
  })

  afterAll(async () => {
    await cleanup()
  })

  it('should put and get an item', async () => {
    await client.put({ pk: 'test', sk: '1', data: 'value' })
    const item = await client.get({ pk: 'test', sk: '1' })
    expect(item).toEqual({ pk: 'test', sk: '1', data: 'value' })
  })
})
```

## Test Best Practices

### Unit Tests

1. **Fast**: Unit tests should run in milliseconds
2. **Isolated**: No external dependencies (database, network, filesystem)
3. **Focused**: Test one thing at a time
4. **Deterministic**: Same input always produces same output
5. **Clear**: Test names should describe what is being tested

### Integration Tests

1. **Realistic**: Use real DynamoDB operations
2. **Isolated**: Each test suite uses its own table
3. **Cleanup**: Always clean up test data
4. **Deterministic**: Use predictable test data
5. **Documented**: Complex scenarios should have comments

### General Guidelines

- Use descriptive test names: `it('should return null when item does not exist')`
- Group related tests with `describe` blocks
- Use `beforeAll`/`afterAll` for setup/cleanup
- Use `beforeEach`/`afterEach` for per-test setup
- Avoid test interdependencies
- Test both success and error cases
- Test edge cases (empty arrays, null values, etc.)

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      dynamodb:
        image: amazon/dynamodb-local
        ports:
          - 8000:8000
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:integration
```

### GitLab CI Example

```yaml
test:
  image: node:18
  services:
    - name: amazon/dynamodb-local
      alias: dynamodb
  variables:
    DYNAMODB_ENDPOINT: http://dynamodb:8000
  script:
    - npm ci
    - npm run build
    - npm run test:unit
    - npm run test:integration
```

## Troubleshooting

### Tests Not Found

If rstest can't find your tests:

1. Check that test files match the pattern `*.test.ts`
2. Verify the file is in the correct directory (`src/` or `packages/*/src/`)
3. Check the `include` pattern in the rstest config

### Integration Tests Fail

If integration tests fail with connection errors:

1. Verify DynamoDB Local is running: `curl http://localhost:8000`
2. Check the endpoint configuration
3. Ensure tables are being created/cleaned up properly

### Slow Tests

If tests are running slowly:

1. Check for unnecessary async operations
2. Verify you're not running integration tests when you meant to run unit tests
3. Use `test:watch` to run only changed tests during development

### Type Errors

If you see TypeScript errors in tests:

1. Run `npm run typecheck` to see all type errors
2. Ensure packages are built: `npm run build`
3. Check that dependencies are properly installed

## Performance

Typical test execution times:

- **Unit tests (all packages)**: ~2-5 seconds
- **Integration tests**: ~10-30 seconds (depends on DynamoDB Local)
- **Full test suite**: ~15-35 seconds

## Coverage

Coverage reporting is available but disabled by default for faster test runs.

Enable coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

Coverage configuration can be adjusted in the rstest config files:

```typescript
coverage: {
  enabled: true,
  provider: 'v8',
  include: ['src/**/*.ts'],
  exclude: ['**/*.test.ts', '**/*.d.ts', '**/dist/**'],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

