# ddb-lib

A lightweight TypeScript wrapper for AWS DynamoDB that simplifies the API while maintaining flexibility. Built with type safety, best practices, and developer experience in mind.

## Features

- **Simplified API**: Clean, intuitive interface for DynamoDB operations
- **Type Safety**: Full TypeScript support with type inference
- **Schema Validation**: Optional runtime validation with strong typing
- **DynamoDB Patterns**: First-class support for single-table design, composite keys, and access patterns
- **Multi-Attribute Keys**: Native support for DynamoDB's multi-attribute composite keys in GSIs
- **Performance Monitoring**: Built-in statistics collection and recommendations
- **Best Practices**: Automatic detection of anti-patterns and optimization opportunities

## Installation

```bash
npm install ddb-lib
```

## Quick Start

```typescript
import { TableClient } from 'ddb-lib'

// Create a table client
const table = new TableClient({
  tableName: 'my-table',
  region: 'us-east-1'
})

// Basic operations
await table.put({ pk: 'USER#123', sk: 'PROFILE', name: 'Alice', email: 'alice@example.com' })
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })
await table.update({ pk: 'USER#123', sk: 'PROFILE' }, { email: 'newemail@example.com' })
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })
```

## Configuration Options

### TableClientConfig

```typescript
interface TableClientConfig<TSchema = any> {
  // Required
  tableName: string
  
  // Optional AWS configuration
  region?: string
  endpoint?: string  // For DynamoDB Local
  client?: DynamoDBClient  // Provide your own client
  
  // Optional features
  schema?: Schema<TSchema>  // Enable schema validation
  accessPatterns?: AccessPatternDefinitions<TSchema>  // Define access patterns
  statsConfig?: StatsConfig  // Enable statistics collection
  retryConfig?: RetryConfig  // Configure retry behavior
}
```

### Basic Configuration

```typescript
const table = new TableClient({
  tableName: 'users',
  region: 'us-east-1'
})
```

### With Schema Validation

```typescript
import { TableClient, schema } from 'ddb-lib'

const UserSchema = schema.object({
  pk: schema.string(),
  sk: schema.string(),
  name: schema.string(),
  email: schema.string(),
  age: schema.number().optional()
})

const table = new TableClient({
  tableName: 'users',
  schema: UserSchema
})

// TypeScript knows the shape of items
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })
// user is typed as { pk: string, sk: string, name: string, email: string, age?: number } | null
```

### With Statistics Collection

```typescript
const table = new TableClient({
  tableName: 'users',
  statsConfig: {
    enabled: true,
    sampleRate: 1.0,  // Collect 100% of operations
    thresholds: {
      slowQueryMs: 100,
      highRCU: 50,
      highWCU: 50
    }
  }
})

// Get statistics
const stats = table.getStats()
console.log(stats.operations.query.avgLatencyMs)

// Get recommendations
const recommendations = table.getRecommendations()
for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
}
```

### With Access Patterns

```typescript
const table = new TableClient({
  tableName: 'users',
  accessPatterns: {
    getUserById: {
      keyCondition: (params: { userId: string }) => ({
        pk: `USER#${params.userId}`,
        sk: 'PROFILE'
      })
    },
    getUserOrders: {
      keyCondition: (params: { userId: string }) => ({
        pk: `USER#${params.userId}`,
        sk: { beginsWith: 'ORDER#' }
      })
    },
    getOrdersByStatus: {
      index: 'GSI1',
      keyCondition: (params: { status: string }) => ({
        pk: `STATUS#${params.status}`
      })
    }
  }
})

// Execute patterns with type safety
const orders = await table.executePattern('getUserOrders', { userId: '123' })
```

## Core Operations

### Get

```typescript
// Basic get
const item = await table.get({ pk: 'USER#123', sk: 'PROFILE' })

// With options
const item = await table.get(
  { pk: 'USER#123', sk: 'PROFILE' },
  {
    consistentRead: true,
    projectionExpression: ['name', 'email']  // Only fetch specific attributes
  }
)
```

### Put

```typescript
// Basic put
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  name: 'Alice',
  email: 'alice@example.com'
})

// Conditional put
await table.put(
  { pk: 'USER#123', sk: 'PROFILE', name: 'Alice' },
  {
    condition: { pk: { attributeNotExists: true } }  // Only if doesn't exist
  }
)
```

### Update

```typescript
// Basic update
const updated = await table.update(
  { pk: 'USER#123', sk: 'PROFILE' },
  { email: 'newemail@example.com', age: 30 }
)

// Conditional update
await table.update(
  { pk: 'USER#123', sk: 'PROFILE' },
  { status: 'ACTIVE' },
  {
    condition: { status: { eq: 'PENDING' } }
  }
)
```

### Delete

```typescript
// Basic delete
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })

// Conditional delete
await table.delete(
  { pk: 'USER#123', sk: 'PROFILE' },
  {
    condition: { status: { eq: 'INACTIVE' } }
  }
)
```

### Query

```typescript
// Query with key condition
const result = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})

// Query with filter
const result = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  },
  filter: {
    status: { eq: 'COMPLETED' }
  }
})

// Query on GSI
const result = await table.query({
  indexName: 'GSI1',
  keyCondition: {
    pk: 'STATUS#ACTIVE'
  }
})

// Paginated query
for await (const item of table.queryPaginated({ keyCondition: { pk: 'USER#123' } })) {
  console.log(item)
}
```

### Scan

```typescript
// Basic scan (emits warning)
const result = await table.scan()

// Scan with filter
const result = await table.scan({
  filter: {
    age: { gte: 18 }
  }
})

// Paginated scan
for await (const item of table.scanPaginated()) {
  console.log(item)
}
```

### Batch Operations

```typescript
// Batch get (automatically chunks to 100-item batches)
const items = await table.batchGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' },
  { pk: 'USER#3', sk: 'PROFILE' }
])

// Batch write (automatically chunks to 25-item batches)
await table.batchWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { type: 'put', item: { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' } },
  { type: 'delete', key: { pk: 'USER#3', sk: 'PROFILE' } }
])
```

### Transactional Operations

```typescript
// Transactional write
await table.transactWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { type: 'update', key: { pk: 'USER#2', sk: 'PROFILE' }, updates: { balance: 100 } },
  { type: 'delete', key: { pk: 'USER#3', sk: 'PROFILE' } }
])

// Transactional get
const items = await table.transactGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' }
])
```

## Multi-Attribute Composite Keys

DynamoDB supports multi-attribute composite keys in GSIs (up to 4 attributes per key). This eliminates the need for manual string concatenation and preserves native data types.

```typescript
import { multiTenantKey, hierarchicalMultiKey } from 'ddb-lib'

// Define access pattern with multi-attribute keys
const table = new TableClient({
  tableName: 'multi-tenant-app',
  accessPatterns: {
    getUsersByLocation: {
      index: 'LocationIndex',
      gsiConfig: {
        indexName: 'LocationIndex',
        partitionKey: {
          attributes: [
            { name: 'tenantId', type: 'string' },
            { name: 'customerId', type: 'string' }
          ]
        },
        sortKey: {
          attributes: [
            { name: 'country', type: 'string' },
            { name: 'state', type: 'string' },
            { name: 'city', type: 'string' }
          ]
        }
      },
      keyCondition: (params: { tenantId: string, customerId: string, country?: string, state?: string }) => ({
        multiPk: multiTenantKey(params.tenantId, params.customerId),
        multiSk: params.country ? hierarchicalMultiKey(params.country, params.state) : undefined
      })
    }
  }
})

// Query with multi-attribute keys
const users = await table.executePattern('getUsersByLocation', {
  tenantId: 'TENANT-123',
  customerId: 'CUST-456',
  country: 'USA',
  state: 'CA'
})
```

## Pattern Helpers

Utilities for implementing common DynamoDB patterns:

```typescript
import { PatternHelpers } from 'ddb-lib'

// Composite keys
const key = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])  // 'USER#123#ORDER#456'
const parts = PatternHelpers.parseCompositeKey('USER#123#ORDER#456')  // ['USER', '123', 'ORDER', '456']

// Entity keys for single-table design
const userKey = PatternHelpers.entityKey('USER', '123')  // 'USER#123'
const { entityType, id } = PatternHelpers.parseEntityKey('USER#123')  // { entityType: 'USER', id: '123' }

// Time-series keys
const dayKey = PatternHelpers.timeSeriesKey(new Date(), 'day')  // '2025-12-03'
const ttl = PatternHelpers.ttlTimestamp(new Date('2026-01-01'))  // Unix timestamp

// Hierarchical keys
const path = PatternHelpers.hierarchicalKey(['org', 'dept', 'team'])  // 'org/dept/team'

// Hot partition prevention
const distributed = PatternHelpers.distributedKey('USER#123', 10)  // 'USER#123#SHARD#7'

// Adjacency list pattern
const { pk, sk } = PatternHelpers.adjacencyKeys('USER#123', 'ORDER#456')

// GSI key construction
const gsiKey = PatternHelpers.gsiKey('GSI1', 'USER', '123')  // 'GSI1#USER#123'

// Sparse index helper
const gsiValue = PatternHelpers.sparseIndexValue(emailVerified, 'VERIFIED#USER')  // Only set if true
```

## Error Handling

```typescript
import { DynamoDBWrapperError, ValidationError, ConditionalCheckError } from 'ddb-lib'

try {
  await table.put(item)
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed for field: ${error.field}`)
  } else if (error instanceof ConditionalCheckError) {
    console.log(`Condition failed: ${error.condition}`)
  } else if (error instanceof DynamoDBWrapperError) {
    console.log(`Operation ${error.operation} failed: ${error.message}`)
  }
}
```

## Retry Configuration

```typescript
const table = new TableClient({
  tableName: 'users',
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    retryableErrors: [
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'RequestLimitExceeded'
    ]
  }
})
```

## Examples

See the [examples](./examples) directory for complete working examples:

- [Basic CRUD Operations](./examples/basic-crud-example.ts)
- [Single-Table Design](./examples/single-table-design-example.ts)
- [Stats and Recommendations](./examples/stats-recommendations-example.ts)
- [Anti-Pattern Detection](./examples/anti-pattern-detection-example.ts)

## API Documentation

For detailed API documentation, see [API.md](./API.md).

## Best Practices

This library is designed around DynamoDB best practices:

1. **Query over Scan**: Scans emit warnings; use queries with proper indexes
2. **Batch Operations**: Automatic chunking for efficient bulk operations
3. **Conditional Writes**: First-class support for optimistic locking
4. **Projection Expressions**: Minimize data transfer by fetching only needed attributes
5. **Hot Partition Prevention**: Built-in detection and utilities for key distribution
6. **Capacity Optimization**: Track consumed capacity and get right-sizing recommendations
7. **Multi-Attribute Keys**: Use native multi-attribute composite keys instead of concatenation

## Requirements

- Node.js >= 18.0.0
- AWS SDK v3

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
