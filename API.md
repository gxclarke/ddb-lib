# API Documentation

Complete API reference for ddb-lib.

## Table of Contents

- [TableClient](#tableclient)
- [Configuration](#configuration)
- [Operations](#operations)
- [Pattern Helpers](#pattern-helpers)
- [Multi-Attribute Key Helpers](#multi-attribute-key-helpers)
- [Statistics and Recommendations](#statistics-and-recommendations)
- [Error Types](#error-types)
- [Type Definitions](#type-definitions)

---

## TableClient

The main interface for interacting with DynamoDB tables.

### Constructor

```typescript
new TableClient<TItem>(config: TableClientConfig<TItem>)
```

Creates a new TableClient instance.

**Parameters:**
- `config`: Configuration object (see [TableClientConfig](#tableclientconfig))

**Example:**
```typescript
const table = new TableClient({
  tableName: 'users',
  region: 'us-east-1'
})
```

---

## Configuration

### TableClientConfig

```typescript
interface TableClientConfig<TSchema = any> {
  tableName: string
  client?: DynamoDBClient
  schema?: Schema<TSchema>
  accessPatterns?: AccessPatternDefinitions<TSchema>
  statsConfig?: StatsConfig
  retryConfig?: RetryConfig
  region?: string
  endpoint?: string
}
```

**Properties:**

- **tableName** (required): Name of the DynamoDB table
- **client**: Custom DynamoDB client instance. If not provided, a new client will be created
- **schema**: Optional schema for runtime validation and type inference
- **accessPatterns**: Named access pattern definitions
- **statsConfig**: Configuration for statistics collection
- **retryConfig**: Configuration for retry behavior
- **region**: AWS region (e.g., 'us-east-1')
- **endpoint**: Custom endpoint URL (useful for DynamoDB Local)

### StatsConfig

```typescript
interface StatsConfig {
  enabled: boolean
  sampleRate?: number
  thresholds?: {
    slowQueryMs?: number
    highRCU?: number
    highWCU?: number
  }
}
```

**Properties:**

- **enabled**: Enable or disable statistics collection
- **sampleRate**: Percentage of operations to sample (0-1). Default: 1.0 (100%)
- **thresholds**: Thresholds for generating recommendations
  - **slowQueryMs**: Latency threshold for slow queries (ms)
  - **highRCU**: Read capacity unit threshold
  - **highWCU**: Write capacity unit threshold

### RetryConfig

```typescript
interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryableErrors: string[]
}
```

**Properties:**

- **maxRetries**: Maximum number of retry attempts
- **baseDelayMs**: Base delay between retries (exponential backoff)
- **maxDelayMs**: Maximum delay between retries
- **retryableErrors**: Array of error codes that should trigger retries

**Default:**
```typescript
{
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  retryableErrors: [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'RequestLimitExceeded'
  ]
}
```

---

## Operations

### get

Retrieve a single item by key.

```typescript
get(key: Key, options?: GetOptions): Promise<TItem | null>
```

**Parameters:**
- `key`: Partition key and optional sort key
- `options`: Optional get options

**Returns:** The item if found, null otherwise

**Example:**
```typescript
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })

// With options
const user = await table.get(
  { pk: 'USER#123', sk: 'PROFILE' },
  {
    consistentRead: true,
    projectionExpression: ['name', 'email']
  }
)
```

### put

Create or replace an item.

```typescript
put(item: TItem, options?: PutOptions): Promise<void>
```

**Parameters:**
- `item`: The item to put
- `options`: Optional put options

**Example:**
```typescript
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  name: 'Alice',
  email: 'alice@example.com'
})

// Conditional put
await table.put(
  { pk: 'USER#123', sk: 'PROFILE', name: 'Alice' },
  { condition: { pk: { attributeNotExists: true } } }
)
```

### update

Update specific attributes of an item.

```typescript
update(key: Key, updates: Partial<TItem>, options?: UpdateOptions): Promise<TItem>
```

**Parameters:**
- `key`: Partition key and optional sort key
- `updates`: Partial item with attributes to update
- `options`: Optional update options

**Returns:** The updated item

**Example:**
```typescript
const updated = await table.update(
  { pk: 'USER#123', sk: 'PROFILE' },
  { email: 'newemail@example.com' }
)

// Conditional update
await table.update(
  { pk: 'USER#123', sk: 'PROFILE' },
  { status: 'ACTIVE' },
  { condition: { status: { eq: 'PENDING' } } }
)
```

### delete

Delete an item.

```typescript
delete(key: Key, options?: DeleteOptions): Promise<void>
```

**Parameters:**
- `key`: Partition key and optional sort key
- `options`: Optional delete options

**Example:**
```typescript
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })

// Conditional delete
await table.delete(
  { pk: 'USER#123', sk: 'PROFILE' },
  { condition: { status: { eq: 'INACTIVE' } } }
)
```

### query

Query items using key conditions.

```typescript
query(params: QueryParams<TItem>): Promise<QueryResult<TItem>>
```

**Parameters:**
- `params`: Query parameters including key condition, filter, index, etc.

**Returns:** Query result with items and pagination info

**Example:**
```typescript
const result = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})

// Query on GSI with filter
const result = await table.query({
  indexName: 'GSI1',
  keyCondition: { pk: 'STATUS#ACTIVE' },
  filter: { age: { gte: 18 } }
})
```

### scan

Scan the entire table or index.

```typescript
scan(params?: ScanParams<TItem>): Promise<ScanResult<TItem>>
```

**Parameters:**
- `params`: Optional scan parameters

**Returns:** Scan result with items and pagination info

**Note:** Emits a warning as scans are inefficient

**Example:**
```typescript
const result = await table.scan()

// Scan with filter
const result = await table.scan({
  filter: { status: { eq: 'ACTIVE' } }
})
```

### queryPaginated

Query with automatic pagination using async iteration.

```typescript
queryPaginated(params: QueryParams<TItem>): AsyncIterableIterator<TItem>
```

**Parameters:**
- `params`: Query parameters

**Returns:** Async iterator of items

**Example:**
```typescript
for await (const item of table.queryPaginated({ keyCondition: { pk: 'USER#123' } })) {
  console.log(item)
}
```

### scanPaginated

Scan with automatic pagination using async iteration.

```typescript
scanPaginated(params?: ScanParams<TItem>): AsyncIterableIterator<TItem>
```

**Parameters:**
- `params`: Optional scan parameters

**Returns:** Async iterator of items

**Example:**
```typescript
for await (const item of table.scanPaginated()) {
  console.log(item)
}
```

### batchGet

Retrieve multiple items in a single request (automatically chunks to 100-item batches).

```typescript
batchGet(keys: Key[], options?: BatchGetOptions): Promise<TItem[]>
```

**Parameters:**
- `keys`: Array of keys to retrieve
- `options`: Optional batch get options

**Returns:** Array of items

**Example:**
```typescript
const items = await table.batchGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' },
  { pk: 'USER#3', sk: 'PROFILE' }
])
```

### batchWrite

Write multiple items in a single request (automatically chunks to 25-item batches).

```typescript
batchWrite(operations: BatchWriteOperation<TItem>[], options?: BatchWriteOptions): Promise<void>
```

**Parameters:**
- `operations`: Array of put or delete operations
- `options`: Optional batch write options

**Example:**
```typescript
await table.batchWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { type: 'put', item: { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' } },
  { type: 'delete', key: { pk: 'USER#3', sk: 'PROFILE' } }
])
```

### transactWrite

Perform multiple write operations atomically.

```typescript
transactWrite(operations: TransactWriteOperation<TItem>[]): Promise<void>
```

**Parameters:**
- `operations`: Array of transactional write operations

**Example:**
```typescript
await table.transactWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { type: 'update', key: { pk: 'USER#2', sk: 'PROFILE' }, updates: { balance: 100 } },
  { type: 'delete', key: { pk: 'USER#3', sk: 'PROFILE' } }
])
```

### transactGet

Retrieve multiple items atomically.

```typescript
transactGet(keys: Key[]): Promise<TItem[]>
```

**Parameters:**
- `keys`: Array of keys to retrieve (max 100)

**Returns:** Array of items

**Example:**
```typescript
const items = await table.transactGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' }
])
```

### executePattern

Execute a named access pattern.

```typescript
executePattern<TResult = TItem>(
  patternName: string,
  params: Record<string, any>
): Promise<TResult[]>
```

**Parameters:**
- `patternName`: Name of the access pattern
- `params`: Parameters for the pattern

**Returns:** Array of items

**Example:**
```typescript
const orders = await table.executePattern('getUserOrders', { userId: '123' })
```

### getStats

Get aggregated statistics.

```typescript
getStats(): TableStats
```

**Returns:** Aggregated statistics

**Example:**
```typescript
const stats = table.getStats()
console.log(stats.operations.query.avgLatencyMs)
```

### getRecommendations

Get optimization recommendations.

```typescript
getRecommendations(): Recommendation[]
```

**Returns:** Array of recommendations

**Example:**
```typescript
const recommendations = table.getRecommendations()
for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
}
```

### getClient

Get the underlying DynamoDB client.

```typescript
getClient(): DynamoDBClient
```

**Returns:** The DynamoDB client instance

**Example:**
```typescript
const client = table.getClient()
```

---

## Pattern Helpers

Static utility methods for common DynamoDB patterns.

### compositeKey

Create a composite key from parts.

```typescript
PatternHelpers.compositeKey(parts: string[], separator?: string): string
```

**Example:**
```typescript
const key = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])
// Returns: 'USER#123#ORDER#456'
```

### parseCompositeKey

Parse a composite key into parts.

```typescript
PatternHelpers.parseCompositeKey(key: string, separator?: string): string[]
```

**Example:**
```typescript
const parts = PatternHelpers.parseCompositeKey('USER#123#ORDER#456')
// Returns: ['USER', '123', 'ORDER', '456']
```

### entityKey

Create an entity key with type prefix.

```typescript
PatternHelpers.entityKey(entityType: string, id: string): string
```

**Example:**
```typescript
const key = PatternHelpers.entityKey('USER', '123')
// Returns: 'USER#123'
```

### parseEntityKey

Parse an entity key.

```typescript
PatternHelpers.parseEntityKey(key: string): { entityType: string; id: string }
```

**Example:**
```typescript
const { entityType, id } = PatternHelpers.parseEntityKey('USER#123')
// Returns: { entityType: 'USER', id: '123' }
```

### timeSeriesKey

Create a time-based key.

```typescript
PatternHelpers.timeSeriesKey(
  timestamp: Date,
  granularity: 'hour' | 'day' | 'month'
): string
```

**Example:**
```typescript
const key = PatternHelpers.timeSeriesKey(new Date(), 'day')
// Returns: '2025-12-03'
```

### ttlTimestamp

Create a TTL timestamp.

```typescript
PatternHelpers.ttlTimestamp(expiresAt: Date): number
```

**Example:**
```typescript
const ttl = PatternHelpers.ttlTimestamp(new Date('2026-01-01'))
// Returns: Unix timestamp
```

### hierarchicalKey

Create a hierarchical key from path.

```typescript
PatternHelpers.hierarchicalKey(path: string[]): string
```

**Example:**
```typescript
const key = PatternHelpers.hierarchicalKey(['org', 'dept', 'team'])
// Returns: 'org/dept/team'
```

### parseHierarchicalKey

Parse a hierarchical key.

```typescript
PatternHelpers.parseHierarchicalKey(key: string): string[]
```

**Example:**
```typescript
const path = PatternHelpers.parseHierarchicalKey('org/dept/team')
// Returns: ['org', 'dept', 'team']
```

### adjacencyKeys

Create keys for adjacency list pattern.

```typescript
PatternHelpers.adjacencyKeys(sourceId: string, targetId: string): { pk: string; sk: string }
```

**Example:**
```typescript
const { pk, sk } = PatternHelpers.adjacencyKeys('USER#123', 'ORDER#456')
// Returns: { pk: 'USER#123', sk: 'ORDER#456' }
```

### distributedKey

Create a distributed key for hot partition prevention.

```typescript
PatternHelpers.distributedKey(baseKey: string, shardCount: number): string
```

**Example:**
```typescript
const key = PatternHelpers.distributedKey('POPULAR_ITEM', 10)
// Returns: 'POPULAR_ITEM#SHARD#7' (random shard 0-9)
```

### getShardNumber

Extract shard number from distributed key.

```typescript
PatternHelpers.getShardNumber(key: string): number
```

**Example:**
```typescript
const shard = PatternHelpers.getShardNumber('POPULAR_ITEM#SHARD#7')
// Returns: 7
```

### gsiKey

Create a GSI key.

```typescript
PatternHelpers.gsiKey(indexName: string, entityType: string, value: string): string
```

**Example:**
```typescript
const key = PatternHelpers.gsiKey('GSI1', 'STATUS', 'ACTIVE')
// Returns: 'GSI1#STATUS#ACTIVE'
```

### sparseIndexValue

Create a value for sparse index (only when condition is true).

```typescript
PatternHelpers.sparseIndexValue(condition: boolean, value: string): string | undefined
```

**Example:**
```typescript
const value = PatternHelpers.sparseIndexValue(emailVerified, 'VERIFIED#USER')
// Returns: 'VERIFIED#USER' if emailVerified is true, undefined otherwise
```

---

## Multi-Attribute Key Helpers

Helpers for working with DynamoDB's multi-attribute composite keys.

### multiAttributeKey

Create a multi-attribute key value array.

```typescript
multiAttributeKey(values: Array<string | number | Uint8Array>): Array<string | number | Uint8Array>
```

**Example:**
```typescript
const key = multiAttributeKey(['tenant1', 'customer123'])
```

### multiTenantKey

Create a multi-tenant partition key.

```typescript
multiTenantKey(tenantId: string, customerId: string, departmentId?: string): string[]
```

**Example:**
```typescript
const key = multiTenantKey('TENANT-1', 'CUST-123', 'DEPT-A')
// Returns: ['TENANT-1', 'CUST-123', 'DEPT-A']
```

### hierarchicalMultiKey

Create a hierarchical multi-attribute key.

```typescript
hierarchicalMultiKey(
  level1: string,
  level2?: string,
  level3?: string,
  level4?: string
): string[]
```

**Example:**
```typescript
const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco')
// Returns: ['USA', 'CA', 'San Francisco']
```

### timeSeriesMultiKey

Create a time-series multi-attribute key with category.

```typescript
timeSeriesMultiKey(
  category: string,
  timestamp: Date,
  subcategory?: string
): Array<string | number>
```

**Example:**
```typescript
const key = timeSeriesMultiKey('ORDERS', new Date(), 'ELECTRONICS')
// Returns: ['ORDERS', 1733241600000, 'ELECTRONICS']
```

### locationMultiKey

Create a location-based multi-attribute key.

```typescript
locationMultiKey(
  country: string,
  state?: string,
  city?: string,
  district?: string
): string[]
```

**Example:**
```typescript
const key = locationMultiKey('USA', 'CA', 'San Francisco')
// Returns: ['USA', 'CA', 'San Francisco']
```

---

## Statistics and Recommendations

### TableStats

```typescript
interface TableStats {
  operations: {
    [operationType: string]: OperationTypeStats
  }
  accessPatterns: {
    [patternName: string]: AccessPatternStats
  }
}

interface OperationTypeStats {
  count: number
  totalLatencyMs: number
  avgLatencyMs: number
  totalRCU: number
  totalWCU: number
}

interface AccessPatternStats {
  count: number
  avgLatencyMs: number
  avgItemsReturned: number
}
```

### Recommendation

```typescript
interface Recommendation {
  severity: 'info' | 'warning' | 'error'
  category: 'performance' | 'cost' | 'best-practice' | 'hot-partition' | 'capacity'
  message: string
  details: string
  suggestedAction?: string
  affectedOperations?: string[]
  estimatedImpact?: {
    costReduction?: string
    performanceImprovement?: string
  }
}
```

---

## Error Types

### DynamoDBWrapperError

Base error class for all wrapper errors.

```typescript
class DynamoDBWrapperError extends Error {
  code: string
  operation: string
  context?: Record<string, any>
}
```

### ValidationError

Thrown when schema validation fails.

```typescript
class ValidationError extends DynamoDBWrapperError {
  field: string
  value: any
  constraint: string
}
```

**Example:**
```typescript
try {
  await table.put(invalidItem)
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed for ${error.field}: ${error.constraint}`)
  }
}
```

### ConditionalCheckError

Thrown when a conditional check fails.

```typescript
class ConditionalCheckError extends DynamoDBWrapperError {
  condition: string
  item?: any
}
```

**Example:**
```typescript
try {
  await table.put(item, { condition: { pk: { attributeNotExists: true } } })
} catch (error) {
  if (error instanceof ConditionalCheckError) {
    console.log(`Condition failed: ${error.condition}`)
  }
}
```

---

## Type Definitions

### Key

```typescript
interface Key {
  pk: string | number | Uint8Array
  sk?: string | number | Uint8Array
}
```

### KeyCondition

```typescript
interface KeyCondition {
  pk?: string | number | Uint8Array
  sk?: string | number | Uint8Array | {
    eq?: string | number | Uint8Array
    lt?: string | number | Uint8Array
    lte?: string | number | Uint8Array
    gt?: string | number | Uint8Array
    gte?: string | number | Uint8Array
    between?: [string | number | Uint8Array, string | number | Uint8Array]
    beginsWith?: string
  }
  multiPk?: Array<string | number | Uint8Array>
  multiSk?: Array<string | number | Uint8Array> | {
    eq?: Array<string | number | Uint8Array>
    lt?: Array<string | number | Uint8Array>
    lte?: Array<string | number | Uint8Array>
    gt?: Array<string | number | Uint8Array>
    gte?: Array<string | number | Uint8Array>
    between?: [Array<string | number | Uint8Array>, Array<string | number | Uint8Array>]
  }
}
```

### FilterExpression

```typescript
interface FilterExpression {
  [attribute: string]: {
    eq?: any
    ne?: any
    lt?: any
    lte?: any
    gt?: any
    gte?: any
    between?: [any, any]
    in?: any[]
    exists?: boolean
    contains?: any
    beginsWith?: string
    attributeType?: 'S' | 'N' | 'B' | 'SS' | 'NS' | 'BS' | 'M' | 'L' | 'NULL' | 'BOOL'
  }
}
```

### QueryParams

```typescript
interface QueryParams<TItem> {
  keyCondition: KeyCondition
  indexName?: string
  filter?: FilterExpression
  limit?: number
  scanIndexForward?: boolean
  exclusiveStartKey?: Key
  projectionExpression?: string[]
  consistentRead?: boolean
}
```

### QueryResult

```typescript
interface QueryResult<TItem> {
  items: TItem[]
  count: number
  scannedCount: number
  lastEvaluatedKey?: Key
}
```

### AccessPatternDefinition

```typescript
interface AccessPatternDefinition<TItem, TParams, TResult = TItem> {
  index?: string
  gsiConfig?: GSIConfig
  keyCondition: (params: TParams) => KeyCondition
  filter?: (params: TParams) => FilterExpression
  transform?: (items: TItem[]) => TResult[]
}
```

### MultiAttributeKey

```typescript
interface MultiAttributeKey {
  attributes: Array<{
    name: string
    type: 'string' | 'number' | 'binary'
  }>
}
```

### GSIConfig

```typescript
interface GSIConfig {
  indexName: string
  partitionKey: string | MultiAttributeKey
  sortKey?: string | MultiAttributeKey
}
```

---

## Constants

### MAX_MULTI_ATTRIBUTE_KEY_LENGTH

Maximum number of attributes in a multi-attribute key.

```typescript
const MAX_MULTI_ATTRIBUTE_KEY_LENGTH = 4
```

### DEFAULT_RETRY_CONFIG

Default retry configuration.

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  retryableErrors: [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'RequestLimitExceeded'
  ]
}
```

---

## Version

```typescript
export const version = '0.1.0'
```
