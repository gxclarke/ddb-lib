# @ddb-lib/client

Full-featured DynamoDB client with simplified API, built-in monitoring, and best practices. For standalone Node.js applications.

## Installation

```bash
npm install @ddb-lib/client
```

**Peer Dependencies:**
```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Features

- **Simplified API**: Clean, intuitive interface for all DynamoDB operations
- **Type Safety**: Full TypeScript support with type inference
- **Built-in Monitoring**: Automatic statistics collection and recommendations
- **Pattern Helpers**: Integrated utilities from @ddb-lib/core
- **Automatic Batching**: Intelligent chunking for batch operations
- **Retry Logic**: Configurable exponential backoff
- **Access Patterns**: Named, reusable query patterns
- **Multi-Attribute Keys**: Native support for composite keys

## Quick Start

```typescript
import { TableClient } from '@ddb-lib/client'

// Create client
const table = new TableClient({
  tableName: 'users',
  region: 'us-east-1',
  statsConfig: { enabled: true }
})

// Basic operations
await table.put({ pk: 'USER#123', sk: 'PROFILE', name: 'Alice' })
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })
await table.update({ pk: 'USER#123', sk: 'PROFILE' }, { email: 'new@example.com' })
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })

// Get recommendations
const recommendations = table.getRecommendations()
```

## Configuration

### Basic Configuration

```typescript
const table = new TableClient({
  tableName: 'users',
  region: 'us-east-1'
})
```

### With Custom Client

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY'
  }
})

const table = new TableClient({
  tableName: 'users',
  client
})
```

### With DynamoDB Local

```typescript
const table = new TableClient({
  tableName: 'users',
  endpoint: 'http://localhost:8000',
  region: 'local'
})
```

### With Statistics

```typescript
const table = new TableClient({
  tableName: 'users',
  statsConfig: {
    enabled: true,
    sampleRate: 1.0, // 100% sampling
    thresholds: {
      slowQueryMs: 100,
      highRCU: 50,
      highWCU: 50
    }
  }
})
```

### With Retry Configuration

```typescript
const table = new TableClient({
  tableName: 'users',
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    retryableErrors: [
      'ProvisionedThroughputExceededException',
      'ThrottlingException'
    ]
  }
})
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

// Execute patterns
const orders = await table.executePattern('getUserOrders', { userId: '123' })
```

## Core Operations

### Get

Retrieve a single item by key.

```typescript
// Basic get
const item = await table.get({ pk: 'USER#123', sk: 'PROFILE' })

// With consistent read
const item = await table.get(
  { pk: 'USER#123', sk: 'PROFILE' },
  { consistentRead: true }
)

// With projection
const item = await table.get(
  { pk: 'USER#123', sk: 'PROFILE' },
  { projectionExpression: ['name', 'email'] }
)
```

### Put

Create or replace an item.

```typescript
// Basic put
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  name: 'Alice',
  email: 'alice@example.com'
})

// Conditional put (only if doesn't exist)
await table.put(
  { pk: 'USER#123', sk: 'PROFILE', name: 'Alice' },
  { condition: { pk: { attributeNotExists: true } } }
)

// With return values
const result = await table.put(
  { pk: 'USER#123', sk: 'PROFILE', name: 'Alice' },
  { returnValues: 'ALL_OLD' }
)
```

### Update

Update specific attributes.

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
  { condition: { status: { eq: 'PENDING' } } }
)

// Increment counter
await table.update(
  { pk: 'USER#123', sk: 'PROFILE' },
  { loginCount: { $add: 1 } }
)
```

### Delete

Delete an item.

```typescript
// Basic delete
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })

// Conditional delete
await table.delete(
  { pk: 'USER#123', sk: 'PROFILE' },
  { condition: { status: { eq: 'INACTIVE' } } }
)
```

### Query

Query items with key conditions.

```typescript
// Basic query
const result = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})

// Query with filter
const result = await table.query({
  keyCondition: { pk: 'USER#123' },
  filter: { status: { eq: 'COMPLETED' } }
})

// Query on GSI
const result = await table.query({
  indexName: 'GSI1',
  keyCondition: { pk: 'STATUS#ACTIVE' }
})

// Query with limit and sorting
const result = await table.query({
  keyCondition: { pk: 'USER#123' },
  limit: 10,
  scanIndexForward: false // Descending order
})

// Paginated query
for await (const item of table.queryPaginated({ keyCondition: { pk: 'USER#123' } })) {
  console.log(item)
}
```

### Scan

Scan the entire table (use sparingly).

```typescript
// Basic scan
const result = await table.scan()

// Scan with filter
const result = await table.scan({
  filter: { age: { gte: 18 } }
})

// Paginated scan
for await (const item of table.scanPaginated()) {
  console.log(item)
}
```

## Batch Operations

### Batch Get

Retrieve multiple items (automatically chunks to 100-item batches).

```typescript
const items = await table.batchGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' },
  { pk: 'USER#3', sk: 'PROFILE' }
])

// With projection
const items = await table.batchGet(
  [{ pk: 'USER#1', sk: 'PROFILE' }],
  { projectionExpression: ['name', 'email'] }
)
```

### Batch Write

Write multiple items (automatically chunks to 25-item batches).

```typescript
await table.batchWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { type: 'put', item: { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' } },
  { type: 'delete', key: { pk: 'USER#3', sk: 'PROFILE' } }
])
```

## Transactional Operations

### Transact Write

Perform multiple writes atomically.

```typescript
await table.transactWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { 
    type: 'update', 
    key: { pk: 'USER#2', sk: 'PROFILE' }, 
    updates: { balance: 100 } 
  },
  { type: 'delete', key: { pk: 'USER#3', sk: 'PROFILE' } }
])

// With conditions
await table.transactWrite([
  {
    type: 'put',
    item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' },
    condition: { pk: { attributeNotExists: true } }
  }
])
```

### Transact Get

Retrieve multiple items atomically.

```typescript
const items = await table.transactGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' }
])
```

## Pattern Helpers Integration

The client integrates pattern helpers from @ddb-lib/core:

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Entity keys
const userKey = PatternHelpers.entityKey('USER', '123')
await table.put({ pk: userKey, sk: 'PROFILE', name: 'Alice' })

// Composite keys
const orderKey = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])
await table.put({ pk: userKey, sk: orderKey, total: 99.99 })

// Time-series keys
const dayKey = PatternHelpers.timeSeriesKey(new Date(), 'day')
await table.put({ pk: 'METRICS', sk: dayKey, count: 100 })

// Distributed keys for hot partitions
const key = PatternHelpers.distributedKey('POPULAR_ITEM', 10)
await table.put({ pk: key, sk: 'DATA', views: 1000 })
```

## Multi-Attribute Keys

Native support for DynamoDB's multi-attribute composite keys:

```typescript
import { multiTenantKey, hierarchicalMultiKey } from '@ddb-lib/core'

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
      keyCondition: (params) => ({
        multiPk: multiTenantKey(params.tenantId, params.customerId),
        multiSk: hierarchicalMultiKey(params.country, params.state)
      })
    }
  }
})

// Query with multi-attribute keys
const users = await table.executePattern('getUsersByLocation', {
  tenantId: 'TENANT-1',
  customerId: 'CUST-123',
  country: 'USA',
  state: 'CA'
})
```

## Statistics and Monitoring

### Get Statistics

```typescript
const stats = table.getStats()

console.log('Query operations:', stats.operations.query.count)
console.log('Average latency:', stats.operations.query.avgLatencyMs)
console.log('Total RCU:', stats.operations.query.totalRCU)
console.log('Total WCU:', stats.operations.query.totalWCU)

// Access pattern statistics
for (const [name, patternStats] of Object.entries(stats.accessPatterns)) {
  console.log(`Pattern ${name}:`, patternStats.count, 'calls')
}
```

### Get Recommendations

```typescript
const recommendations = table.getRecommendations()

for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.category}: ${rec.message}`)
  console.log(`  Details: ${rec.details}`)
  
  if (rec.suggestedAction) {
    console.log(`  Action: ${rec.suggestedAction}`)
  }
  
  if (rec.estimatedImpact) {
    console.log(`  Impact:`, rec.estimatedImpact)
  }
}
```

## Error Handling

```typescript
import { 
  DynamoDBWrapperError, 
  ValidationError, 
  ConditionalCheckError,
  RetryExhaustedError
} from '@ddb-lib/client'

try {
  await table.put(item, {
    condition: { pk: { attributeNotExists: true } }
  })
} catch (error) {
  if (error instanceof ConditionalCheckError) {
    console.log('Item already exists')
  } else if (error instanceof ValidationError) {
    console.log(`Validation failed: ${error.field}`)
  } else if (error instanceof RetryExhaustedError) {
    console.log(`Retries exhausted after ${error.attempts} attempts`)
  } else if (error instanceof DynamoDBWrapperError) {
    console.log(`Operation ${error.operation} failed: ${error.message}`)
  }
}
```

## API Reference

### TableClient

#### Constructor

```typescript
new TableClient<TItem>(config: TableClientConfig<TItem>)
```

**TableClientConfig:**
```typescript
interface TableClientConfig<TSchema = any> {
  tableName: string
  client?: DynamoDBClient
  region?: string
  endpoint?: string
  accessPatterns?: AccessPatternDefinitions<TSchema>
  statsConfig?: StatsConfig
  retryConfig?: RetryConfig
}
```

#### Methods

- `get(key: Key, options?: GetOptions): Promise<TItem | null>`
- `put(item: TItem, options?: PutOptions): Promise<void>`
- `update(key: Key, updates: Partial<TItem>, options?: UpdateOptions): Promise<TItem>`
- `delete(key: Key, options?: DeleteOptions): Promise<void>`
- `query(params: QueryParams<TItem>): Promise<QueryResult<TItem>>`
- `scan(params?: ScanParams<TItem>): Promise<ScanResult<TItem>>`
- `queryPaginated(params: QueryParams<TItem>): AsyncIterableIterator<TItem>`
- `scanPaginated(params?: ScanParams<TItem>): AsyncIterableIterator<TItem>`
- `batchGet(keys: Key[], options?: BatchGetOptions): Promise<TItem[]>`
- `batchWrite(operations: BatchWriteOperation<TItem>[], options?: BatchWriteOptions): Promise<void>`
- `transactWrite(operations: TransactWriteOperation<TItem>[]): Promise<void>`
- `transactGet(keys: Key[]): Promise<TItem[]>`
- `executePattern<TResult = TItem>(patternName: string, params: Record<string, any>): Promise<TResult[]>`
- `getStats(): TableStats`
- `getRecommendations(): Recommendation[]`
- `getClient(): DynamoDBClient`

## Best Practices

### 1. Use Access Patterns

Define reusable access patterns instead of inline queries:

```typescript
// Good: Named pattern
const orders = await table.executePattern('getUserOrders', { userId: '123' })

// Avoid: Inline query
const orders = await table.query({
  keyCondition: { pk: `USER#${userId}`, sk: { beginsWith: 'ORDER#' } }
})
```

### 2. Enable Statistics in Development

```typescript
// Development
const table = new TableClient({
  tableName: 'users',
  statsConfig: { enabled: true, sampleRate: 1.0 }
})

// Production (with sampling)
const table = new TableClient({
  tableName: 'users',
  statsConfig: { enabled: true, sampleRate: 0.1 }
})
```

### 3. Use Projection Expressions

Fetch only the attributes you need:

```typescript
// Good: Fetch specific attributes
const user = await table.get(
  { pk: 'USER#123', sk: 'PROFILE' },
  { projectionExpression: ['name', 'email'] }
)

// Avoid: Fetch entire item
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })
```

### 4. Use Batch Operations

Batch multiple operations for efficiency:

```typescript
// Good: Batch get
const items = await table.batchGet([key1, key2, key3])

// Avoid: Multiple individual gets
const item1 = await table.get(key1)
const item2 = await table.get(key2)
const item3 = await table.get(key3)
```

### 5. Handle Errors Gracefully

```typescript
try {
  await table.put(item, {
    condition: { pk: { attributeNotExists: true } }
  })
} catch (error) {
  if (error instanceof ConditionalCheckError) {
    // Handle duplicate
  } else {
    // Handle other errors
  }
}
```

## Examples

See the [examples directory](../../examples) for complete working examples:

- [Basic CRUD Operations](../../examples/standalone/basic-crud.ts)
- [Single-Table Design](../../examples/standalone/single-table-design.ts)
- [Statistics Monitoring](../../examples/standalone/stats-monitoring.ts)

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- @aws-sdk/client-dynamodb >= 3.0.0
- @aws-sdk/lib-dynamodb >= 3.0.0

## License

MIT
