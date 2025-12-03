# Integration Tests

This directory contains end-to-end integration tests for the DynamoDB wrapper library using DynamoDB Local.

## Prerequisites

To run these integration tests, you need to have DynamoDB Local running. You can set it up in several ways:

### Option 1: Using Docker (Recommended)

```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

### Option 2: Using Docker Compose

Create a `docker-compose.yml` file:

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

### Option 3: Download and Run Locally

1. Download DynamoDB Local from AWS: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html
2. Extract and run:

```bash
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

## Running the Tests

Once DynamoDB Local is running on `http://localhost:8000`, you can run the integration tests:

```bash
# Run all integration tests
npm test -- src/integration

# Run specific integration test file
npm test -- src/integration/crud.integration.test.ts

# Run with watch mode
npm test -- src/integration --watch
```

## Test Structure

The integration tests are organized by feature:

- **`crud.integration.test.ts`**: End-to-end CRUD operations (get, put, update, delete)
  - Tests with and without schemas
  - Tests with conditional operations
  - Tests with complex data types
  - Error scenarios

- **`query.integration.test.ts`**: Query and scan operations
  - Basic queries with various key conditions
  - GSI and LSI queries
  - Filter expressions
  - Pagination
  - Projection expressions
  - Sort order

- **`batch.integration.test.ts`**: Batch operations
  - Batch get with chunking
  - Batch write (put and delete)
  - Mixed operations
  - Performance comparisons

- **`access-patterns.integration.test.ts`**: Named access patterns
  - Single-table design patterns
  - Composite key patterns
  - Hierarchical data patterns
  - Time-series patterns
  - Pattern with filters and transforms

- **`stats.integration.test.ts`**: Statistics collection and recommendations
  - Stats collection for all operation types
  - Access pattern tracking
  - Recommendation generation
  - Hot partition detection
  - Stats sampling and export

## Test Utilities

The `test-utils/dynamodb-local.ts` module provides helper functions for integration testing:

- `createLocalClient()`: Create a DynamoDB client configured for local testing
- `createTestTable()`: Create a test table with specified schema
- `deleteTestTable()`: Clean up test tables
- `seedTestData()`: Populate tables with test data
- `clearTestTable()`: Remove all data from a table
- `setupTestTable()`: Create table and return cleanup function
- `setupTestTableWithData()`: Create table with initial data

## Configuration

By default, the tests connect to DynamoDB Local at `http://localhost:8000`. You can customize this by setting environment variables:

```bash
export DYNAMODB_ENDPOINT=http://localhost:9000
export DYNAMODB_REGION=us-west-2
```

## Troubleshooting

### Connection Refused

If you see connection errors, make sure DynamoDB Local is running:

```bash
curl http://localhost:8000
```

You should see a response from DynamoDB Local.

### Table Already Exists

The tests automatically clean up tables after each test suite. If you see "Table already exists" errors, you can manually delete tables:

```bash
aws dynamodb delete-table --table-name <table-name> --endpoint-url http://localhost:8000
```

### Slow Tests

Integration tests are slower than unit tests because they interact with a real database. To speed up development:

1. Run only the specific test file you're working on
2. Use watch mode to run tests automatically on file changes
3. Consider using `it.only()` to focus on a single test

## Best Practices

1. **Isolation**: Each test suite creates its own table to avoid interference
2. **Cleanup**: Always use the cleanup functions to remove test data
3. **Deterministic Data**: Use predictable test data for reliable assertions
4. **Realistic Scenarios**: Test with data that resembles production use cases
5. **Performance**: Keep integration tests focused and avoid unnecessary operations

## CI/CD Integration

For CI/CD pipelines, you can use the official DynamoDB Local Docker image:

```yaml
# GitHub Actions example
services:
  dynamodb:
    image: amazon/dynamodb-local
    ports:
      - 8000:8000
```

```yaml
# GitLab CI example
services:
  - name: amazon/dynamodb-local
    alias: dynamodb
```

Then run the integration tests as part of your test suite:

```bash
npm test -- src/integration
```
