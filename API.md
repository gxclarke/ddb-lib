# API Documentation

Complete API reference for ddb-lib monorepo packages.

## Table of Contents

- [Package Overview](#package-overview)
- [@ddb-lib/core](#ddb-libcore)
- [@ddb-lib/stats](#ddb-libstats)
- [@ddb-lib/client](#ddb-libclient)
- [@ddb-lib/amplify](#ddb-libamplify)

---

## Package Overview

The ddb-lib monorepo consists of four packages that can be used independently or together:

| Package | Purpose | Dependencies |
|---------|---------|--------------|
| @ddb-lib/core | Pure utility functions | None |
| @ddb-lib/stats | Performance monitoring | @ddb-lib/core |
| @ddb-lib/client | Standalone DynamoDB client | @ddb-lib/core, @ddb-lib/stats, AWS SDK v3 |
| @ddb-lib/amplify | Amplify Gen 2 integration | @ddb-lib/core, @ddb-lib/stats, aws-amplify |

---

## @ddb-lib/core

Pure utility functions for DynamoDB patterns. Zero dependencies.

### Installation

```bash
npm install @ddb-lib/core
```

### Imports

```typescript
import {
  PatternHelpers,
  multiAttributeKey,
  multiTenantKey,
  hierarchicalMultiKey,
  timeSeriesMultiKey,
  locationMultiKey,
  KeyConditionBuilder,
  FilterExpressionBuilder,
  ConditionExpressionBuilder,
  isMultiAttributeKey,
  hasMultiAttributePartitionKey,
  hasMultiAttributeSortKey
} from '@ddb-lib/core'
```

### PatternHelpers

Static utility class for common DynamoDB patterns.


#### Entity Keys

```typescript
PatternHelpers.entityKey(entityType: string, id: string): string
```

Create an entity key with type prefix.

**Example:**
```typescript
const key = PatternHelpers.entityKey('USER', '123')
// Returns: 'USER#123'
```

```typescript
PatternHelpers.parseEntityKey(key: string): { entityType: string; id: string }
```

Parse an entity key.

**Example:**
```typescript
const { entityType, id } = PatternHelpers.parseEntityKey('USER#123')
// Returns: { entityType: 'USER', id: '123' }
```

#### Composite Keys

```typescript
PatternHelpers.compositeKey(parts: string[], separator?: string): string
```

Create a composite key from parts.

**Example:**
```typescript
const key = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])
// Returns: 'USER#123#ORDER#456'
```

```typescript
PatternHelpers.parseCompositeKey(key: string, separator?: string): string[]
```

Parse a composite key into parts.

**Example:**
```typescript
const parts = PatternHelpers.parseCompositeKey('USER#123#ORDER#456')
// Returns: ['USER', '123', 'ORDER', '456']
```

#### Time-Series Keys

```typescript
PatternHelpers.timeSeriesKey(timestamp: Date, granularity: 'hour' | 'day' | 'month'): string
```

Create a time-based key.

**Example:**
```typescript
const key = PatternHelpers.timeSeriesKey(new Date('2025-12-03'), 'day')
// Returns: '2025-12-03'
```

```typescript
PatternHelpers.ttlTimestamp(expiresAt: Date): number
```

Create a TTL timestamp (Unix seconds).

**Example:**
```typescript
const ttl = PatternHelpers.ttlTimestamp(new Date('2026-01-01'))
// Returns: 1735689600
```


#### Hierarchical Keys

```typescript
PatternHelpers.hierarchicalKey(path: string[]): string
```

Create a hierarchical key from path.

**Example:**
```typescript
const key = PatternHelpers.hierarchicalKey(['org', 'dept', 'team'])
// Returns: 'org/dept/team'
```

```typescript
PatternHelpers.parseHierarchicalKey(key: string): string[]
```

Parse a hierarchical key.

**Example:**
```typescript
const path = PatternHelpers.parseHierarchicalKey('org/dept/team')
// Returns: ['org', 'dept', 'team']
```

#### Adjacency Keys

```typescript
PatternHelpers.adjacencyKeys(sourceId: string, targetId: string): { pk: string; sk: string }
```

Create keys for adjacency list pattern.

**Example:**
```typescript
const { pk, sk } = PatternHelpers.adjacencyKeys('USER#123', 'ORDER#456')
// Returns: { pk: 'USER#123', sk: 'ORDER#456' }
```

#### Distributed Keys

```typescript
PatternHelpers.distributedKey(baseKey: string, shardCount: number): string
```

Create a distributed key for hot partition prevention.

**Example:**
```typescript
const key = PatternHelpers.distributedKey('POPULAR_ITEM', 10)
// Returns: 'POPULAR_ITEM#SHARD#7' (random shard 0-9)
```

```typescript
PatternHelpers.getShardNumber(key: string): number
```

Extract shard number from distributed key.

**Example:**
```typescript
const shard = PatternHelpers.getShardNumber('POPULAR_ITEM#SHARD#7')
// Returns: 7
```

#### GSI Keys

```typescript
PatternHelpers.gsiKey(indexName: string, entityType: string, value: string): string
```

Create a GSI key.

**Example:**
```typescript
const key = PatternHelpers.gsiKey('GSI1', 'STATUS', 'ACTIVE')
// Returns: 'GSI1#STATUS#ACTIVE'
```

```typescript
PatternHelpers.sparseIndexValue(condition: boolean, value: string): string | undefined
```

Create a value for sparse index (only when condition is true).

**Example:**
```typescript
const value = PatternHelpers.sparseIndexValue(emailVerified, 'VERIFIED#USER')
// Returns: 'VERIFIED#USER' if emailVerified is true, undefined otherwise
```


### Multi-Attribute Key Functions

Functions for working with DynamoDB's multi-attribute composite keys.

```typescript
multiAttributeKey(values: Array<string | number | Uint8Array>): Array<string | number | Uint8Array>
```

Create a generic multi-attribute key.

**Example:**
```typescript
const key = multiAttributeKey(['tenant1', 'customer123'])
// Returns: ['tenant1', 'customer123']
```

```typescript
multiTenantKey(tenantId: string, customerId: string, departmentId?: string): string[]
```

Create a multi-tenant partition key.

**Example:**
```typescript
const key = multiTenantKey('TENANT-1', 'CUST-123', 'DEPT-A')
// Returns: ['TENANT-1', 'CUST-123', 'DEPT-A']
```

```typescript
hierarchicalMultiKey(level1: string, level2?: string, level3?: string, level4?: string): string[]
```

Create a hierarchical multi-attribute key.

**Example:**
```typescript
const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco')
// Returns: ['USA', 'CA', 'San Francisco']
```

```typescript
timeSeriesMultiKey(category: string, timestamp: Date, subcategory?: string): Array<string | number>
```

Create a time-series multi-attribute key with category.

**Example:**
```typescript
const key = timeSeriesMultiKey('ORDERS', new Date('2025-12-03'), 'ELECTRONICS')
// Returns: ['ORDERS', 1733241600000, 'ELECTRONICS']
```

```typescript
locationMultiKey(country: string, state?: string, city?: string, district?: string): string[]
```

Create a location-based multi-attribute key.

**Example:**
```typescript
const key = locationMultiKey('USA', 'CA', 'San Francisco')
// Returns: ['USA', 'CA', 'San Francisco']
```

### Expression Builders

Type-safe builders for DynamoDB expressions.

#### KeyConditionBuilder

```typescript
class KeyConditionBuilder {
  constructor(attribute: string)
  eq(value: any): this
  lt(value: any): this
  lte(value: any): this
  gt(value: any): this
  gte(value: any): this
  between(start: any, end: any): this
  beginsWith(prefix: string): this
  build(): string
}
```

**Example:**
```typescript
const condition = new KeyConditionBuilder('sk')
  .beginsWith('ORDER#')
  .build()
// Returns: 'sk BEGINS_WITH :sk'
```


#### FilterExpressionBuilder

```typescript
class FilterExpressionBuilder {
  eq(attribute: string, value: any): this
  ne(attribute: string, value: any): this
  lt(attribute: string, value: any): this
  lte(attribute: string, value: any): this
  gt(attribute: string, value: any): this
  gte(attribute: string, value: any): this
  between(attribute: string, start: any, end: any): this
  in(attribute: string, values: any[]): this
  exists(attribute: string): this
  notExists(attribute: string): this
  contains(attribute: string, value: any): this
  beginsWith(attribute: string, prefix: string): this
  attributeType(attribute: string, type: string): this
  build(): { expression: string; values: Record<string, any> }
}
```

**Example:**
```typescript
const builder = new FilterExpressionBuilder()
  .eq('status', 'ACTIVE')
  .gte('age', 18)

const { expression, values } = builder.build()
// expression: 'status = :status AND age >= :age'
// values: { ':status': 'ACTIVE', ':age': 18 }
```

#### ConditionExpressionBuilder

```typescript
class ConditionExpressionBuilder {
  attributeExists(attribute: string): this
  attributeNotExists(attribute: string): this
  eq(attribute: string, value: any): this
  ne(attribute: string, value: any): this
  lt(attribute: string, value: any): this
  lte(attribute: string, value: any): this
  gt(attribute: string, value: any): this
  gte(attribute: string, value: any): this
  between(attribute: string, start: any, end: any): this
  build(): { expression: string; values: Record<string, any> }
}
```

**Example:**
```typescript
const builder = new ConditionExpressionBuilder()
  .attributeNotExists('pk')
  .eq('version', 1)

const { expression, values } = builder.build()
// expression: 'attribute_not_exists(pk) AND version = :version'
// values: { ':version': 1 }
```

### Type Guards

```typescript
isMultiAttributeKey(key: any): key is MultiAttributeKey
```

Check if value is a multi-attribute key.

```typescript
hasMultiAttributePartitionKey(config: any): boolean
```

Check if config has multi-attribute partition key.

```typescript
hasMultiAttributeSortKey(config: any): boolean
```

Check if config has multi-attribute sort key.

### Core Types

```typescript
interface Key {
  pk: string | number | Uint8Array
  sk?: string | number | Uint8Array
}

interface MultiAttributeKey {
  attributes: Array<{
    name: string
    type: 'string' | 'number' | 'binary'
  }>
}

interface KeyCondition {
  pk?: string | number | Uint8Array
  sk?: string | number | Uint8Array | KeyConditionOperators
  multiPk?: Array<string | number | Uint8Array>
  multiSk?: Array<string | number | Uint8Array> | MultiKeyConditionOperators
}
```

---


## @ddb-lib/stats

Performance monitoring and optimization recommendations. Framework-agnostic.

### Installation

```bash
npm install @ddb-lib/stats
```

### Imports

```typescript
import {
  StatsCollector,
  RecommendationEngine,
  AntiPatternDetector
} from '@ddb-lib/stats'
```

### StatsCollector

Main class for collecting operation statistics.

#### Constructor

```typescript
new StatsCollector(config: StatsConfig)
```

**StatsConfig:**
```typescript
interface StatsConfig {
  enabled: boolean
  sampleRate?: number // 0-1, default: 1.0
  thresholds?: {
    slowQueryMs?: number // default: 100
    highRCU?: number // default: 50
    highWCU?: number // default: 50
  }
}
```

**Example:**
```typescript
const stats = new StatsCollector({
  enabled: true,
  sampleRate: 1.0,
  thresholds: {
    slowQueryMs: 100,
    highRCU: 50,
    highWCU: 50
  }
})
```

#### Methods

##### record(operation: OperationRecord): void

Record a single operation.

**OperationRecord:**
```typescript
interface OperationRecord {
  operation: 'get' | 'put' | 'update' | 'delete' | 'query' | 'scan' | 
             'batchGet' | 'batchWrite' | 'transactWrite' | 'transactGet'
  timestamp: number
  latencyMs: number
  rcu?: number
  wcu?: number
  itemCount?: number
  scannedCount?: number
  indexName?: string
  keyCondition?: any
  filter?: any
  patternName?: string
  metadata?: Record<string, any>
}
```

**Example:**
```typescript
stats.record({
  operation: 'query',
  timestamp: Date.now(),
  latencyMs: 45,
  rcu: 5,
  itemCount: 10,
  patternName: 'getUserOrders'
})
```

##### getStats(): TableStats

Get aggregated statistics.

**TableStats:**
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
  slowOperations: number
}

interface AccessPatternStats {
  count: number
  avgLatencyMs: number
  avgItemsReturned: number
  avgScannedCount: number
}
```

**Example:**
```typescript
const tableStats = stats.getStats()
console.log('Average query latency:', tableStats.operations.query.avgLatencyMs)
```


##### export(): OperationRecord[]

Export raw operation records.

**Example:**
```typescript
const records = stats.export()
// Save to file, send to analytics, etc.
```

##### reset(): void

Reset all statistics.

**Example:**
```typescript
stats.reset()
```

##### shouldSample(): boolean

Check if current operation should be sampled.

**Example:**
```typescript
if (stats.shouldSample()) {
  stats.record(operation)
}
```

### RecommendationEngine

Generates optimization recommendations based on collected statistics.

#### Constructor

```typescript
new RecommendationEngine(statsCollector: StatsCollector)
```

**Example:**
```typescript
const engine = new RecommendationEngine(stats)
```

#### Methods

##### generateRecommendations(): Recommendation[]

Generate all recommendations.

**Recommendation:**
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

**Example:**
```typescript
const recommendations = engine.generateRecommendations()

for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
}
```

### AntiPatternDetector

Detects specific DynamoDB anti-patterns.

#### Constructor

```typescript
new AntiPatternDetector(statsCollector: StatsCollector)
```

**Example:**
```typescript
const detector = new AntiPatternDetector(stats)
```

#### Methods

All methods return `Recommendation[]`.

```typescript
detectStringConcatenation(): Recommendation[]
detectLargeItemScans(): Recommendation[]
detectUnusedIndexes(): Recommendation[]
detectMissingGSIs(): Recommendation[]
detectReadBeforeWrite(): Recommendation[]
```

**Example:**
```typescript
const scanIssues = detector.detectLargeItemScans()
for (const issue of scanIssues) {
  console.log(`Found issue: ${issue.message}`)
}
```

---


## @ddb-lib/client

Full-featured DynamoDB client for standalone applications.

### Installation

```bash
npm install @ddb-lib/client
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### Imports

```typescript
import {
  TableClient,
  DynamoDBWrapperError,
  ValidationError,
  ConditionalCheckError,
  RetryExhaustedError
} from '@ddb-lib/client'
```

### TableClient

Main class for interacting with DynamoDB tables.

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

**Example:**
```typescript
const table = new TableClient({
  tableName: 'users',
  region: 'us-east-1',
  statsConfig: { enabled: true }
})
```

#### Core Operations

##### get(key: Key, options?: GetOptions): Promise<TItem | null>

Retrieve a single item by key.

**GetOptions:**
```typescript
interface GetOptions {
  consistentRead?: boolean
  projectionExpression?: string[]
}
```

**Example:**
```typescript
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })

// With options
const user = await table.get(
  { pk: 'USER#123', sk: 'PROFILE' },
  { consistentRead: true, projectionExpression: ['name', 'email'] }
)
```

##### put(item: TItem, options?: PutOptions): Promise<void>

Create or replace an item.

**PutOptions:**
```typescript
interface PutOptions {
  condition?: ConditionExpression
  returnValues?: 'NONE' | 'ALL_OLD'
}
```

**Example:**
```typescript
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  name: 'Alice'
})

// Conditional put
await table.put(
  { pk: 'USER#123', sk: 'PROFILE', name: 'Alice' },
  { condition: { pk: { attributeNotExists: true } } }
)
```

##### update(key: Key, updates: Partial<TItem>, options?: UpdateOptions): Promise<TItem>

Update specific attributes of an item.

**UpdateOptions:**
```typescript
interface UpdateOptions {
  condition?: ConditionExpression
  returnValues?: 'NONE' | 'ALL_OLD' | 'ALL_NEW' | 'UPDATED_OLD' | 'UPDATED_NEW'
}
```

**Example:**
```typescript
const updated = await table.update(
  { pk: 'USER#123', sk: 'PROFILE' },
  { email: 'newemail@example.com' }
)
```

##### delete(key: Key, options?: DeleteOptions): Promise<void>

Delete an item.

**DeleteOptions:**
```typescript
interface DeleteOptions {
  condition?: ConditionExpression
  returnValues?: 'NONE' | 'ALL_OLD'
}
```

**Example:**
```typescript
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })
```


##### query(params: QueryParams<TItem>): Promise<QueryResult<TItem>>

Query items using key conditions.

**QueryParams:**
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

**QueryResult:**
```typescript
interface QueryResult<TItem> {
  items: TItem[]
  count: number
  scannedCount: number
  lastEvaluatedKey?: Key
}
```

**Example:**
```typescript
const result = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})

// Query on GSI
const result = await table.query({
  indexName: 'GSI1',
  keyCondition: { pk: 'STATUS#ACTIVE' }
})
```

##### scan(params?: ScanParams<TItem>): Promise<ScanResult<TItem>>

Scan the entire table or index.

**ScanParams:**
```typescript
interface ScanParams<TItem> {
  filter?: FilterExpression
  limit?: number
  exclusiveStartKey?: Key
  projectionExpression?: string[]
  consistentRead?: boolean
}
```

**Example:**
```typescript
const result = await table.scan({
  filter: { status: { eq: 'ACTIVE' } }
})
```

##### queryPaginated(params: QueryParams<TItem>): AsyncIterableIterator<TItem>

Query with automatic pagination.

**Example:**
```typescript
for await (const item of table.queryPaginated({ keyCondition: { pk: 'USER#123' } })) {
  console.log(item)
}
```

##### scanPaginated(params?: ScanParams<TItem>): AsyncIterableIterator<TItem>

Scan with automatic pagination.

**Example:**
```typescript
for await (const item of table.scanPaginated()) {
  console.log(item)
}
```

#### Batch Operations

##### batchGet(keys: Key[], options?: BatchGetOptions): Promise<TItem[]>

Retrieve multiple items (automatically chunks to 100-item batches).

**Example:**
```typescript
const items = await table.batchGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' }
])
```

##### batchWrite(operations: BatchWriteOperation<TItem>[], options?: BatchWriteOptions): Promise<void>

Write multiple items (automatically chunks to 25-item batches).

**BatchWriteOperation:**
```typescript
type BatchWriteOperation<TItem> =
  | { type: 'put'; item: TItem }
  | { type: 'delete'; key: Key }
```

**Example:**
```typescript
await table.batchWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { type: 'delete', key: { pk: 'USER#2', sk: 'PROFILE' } }
])
```

#### Transactional Operations

##### transactWrite(operations: TransactWriteOperation<TItem>[]): Promise<void>

Perform multiple write operations atomically.

**TransactWriteOperation:**
```typescript
type TransactWriteOperation<TItem> =
  | { type: 'put'; item: TItem; condition?: ConditionExpression }
  | { type: 'update'; key: Key; updates: Partial<TItem>; condition?: ConditionExpression }
  | { type: 'delete'; key: Key; condition?: ConditionExpression }
```

**Example:**
```typescript
await table.transactWrite([
  { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
  { type: 'update', key: { pk: 'USER#2', sk: 'PROFILE' }, updates: { balance: 100 } }
])
```

##### transactGet(keys: Key[]): Promise<TItem[]>

Retrieve multiple items atomically.

**Example:**
```typescript
const items = await table.transactGet([
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' }
])
```


#### Access Patterns

##### executePattern<TResult = TItem>(patternName: string, params: Record<string, any>): Promise<TResult[]>

Execute a named access pattern.

**AccessPatternDefinition:**
```typescript
interface AccessPatternDefinition<TItem, TParams, TResult = TItem> {
  index?: string
  gsiConfig?: GSIConfig
  keyCondition: (params: TParams) => KeyCondition
  filter?: (params: TParams) => FilterExpression
  transform?: (items: TItem[]) => TResult[]
}
```

**Example:**
```typescript
const table = new TableClient({
  tableName: 'users',
  accessPatterns: {
    getUserOrders: {
      keyCondition: (params: { userId: string }) => ({
        pk: `USER#${params.userId}`,
        sk: { beginsWith: 'ORDER#' }
      })
    }
  }
})

const orders = await table.executePattern('getUserOrders', { userId: '123' })
```

#### Statistics and Monitoring

##### getStats(): TableStats

Get aggregated statistics.

**Example:**
```typescript
const stats = table.getStats()
console.log('Query operations:', stats.operations.query.count)
```

##### getRecommendations(): Recommendation[]

Get optimization recommendations.

**Example:**
```typescript
const recommendations = table.getRecommendations()
for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
}
```

##### getClient(): DynamoDBClient

Get the underlying DynamoDB client.

**Example:**
```typescript
const client = table.getClient()
```

### Error Classes

```typescript
class DynamoDBWrapperError extends Error {
  code: string
  operation: string
  context?: Record<string, any>
}

class ValidationError extends DynamoDBWrapperError {
  field: string
  value: any
  constraint: string
}

class ConditionalCheckError extends DynamoDBWrapperError {
  condition: string
  item?: any
}

class RetryExhaustedError extends DynamoDBWrapperError {
  attempts: number
  lastError: Error
}
```

**Example:**
```typescript
try {
  await table.put(item, { condition: { pk: { attributeNotExists: true } } })
} catch (error) {
  if (error instanceof ConditionalCheckError) {
    console.log('Item already exists')
  }
}
```

---


## @ddb-lib/amplify

AWS Amplify Gen 2 integration with monitoring and best practices.

### Installation

```bash
npm install @ddb-lib/amplify
npm install aws-amplify
```

### Imports

```typescript
import {
  AmplifyMonitor,
  AmplifyHelpers
} from '@ddb-lib/amplify'
```

### AmplifyMonitor

Main class for monitoring Amplify operations.

#### Constructor

```typescript
new AmplifyMonitor<T extends Schema>(config: AmplifyMonitorConfig)
```

**AmplifyMonitorConfig:**
```typescript
interface AmplifyMonitorConfig {
  statsConfig?: StatsConfig
  enableAutoInstrumentation?: boolean // default: true
}
```

**Example:**
```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import type { Schema } from './amplify/data/resource'

const client = generateClient<Schema>()
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true }
})
```

#### Methods

##### wrap<TModel>(model: any): MonitoredModel<TModel>

Wrap an Amplify model to add monitoring.

**Example:**
```typescript
const monitoredTodos = monitor.wrap(client.models.Todo)
```

##### recordOperation(operation: OperationRecord): void

Manually record an operation.

**Example:**
```typescript
monitor.recordOperation({
  operation: 'query',
  timestamp: Date.now(),
  latencyMs: 45,
  itemCount: 10,
  patternName: 'listTodos'
})
```

##### getStats(): TableStats

Get aggregated statistics.

**Example:**
```typescript
const stats = monitor.getStats()
```

##### getRecommendations(): Recommendation[]

Get optimization recommendations.

**Example:**
```typescript
const recommendations = monitor.getRecommendations()
```

##### reset(): void

Reset all statistics.

**Example:**
```typescript
monitor.reset()
```

### MonitoredModel

Wrapper interface for Amplify models with monitoring.

```typescript
interface MonitoredModel<TModel> {
  get(id: string): Promise<TModel | null>
  list(options?: ListOptions): Promise<TModel[]>
  create(data: Partial<TModel>): Promise<TModel>
  update(id: string, data: Partial<TModel>): Promise<TModel>
  delete(id: string): Promise<void>
  unwrap(): any // Get original model
}
```

**Example:**
```typescript
const monitoredTodos = monitor.wrap(client.models.Todo)

// All operations are monitored
await monitoredTodos.create({ title: 'Buy groceries' })
const todos = await monitoredTodos.list()
await monitoredTodos.update('123', { completed: true })
await monitoredTodos.delete('123')

// Access original model for subscriptions
const subscription = monitoredTodos.unwrap().onCreate().subscribe({
  next: (data) => console.log('New todo:', data)
})
```


### AmplifyHelpers

Utilities specific to Amplify patterns.

#### amplifyCompositeKey(parts: string[]): string

Create composite keys compatible with Amplify's key structure.

**Example:**
```typescript
const key = AmplifyHelpers.amplifyCompositeKey(['USER', '123', 'ORDER', '456'])
// Returns: 'USER#123#ORDER#456'
```

#### parseAmplifyKey(key: string): { modelName: string; id: string }

Parse Amplify-generated keys.

**Example:**
```typescript
const { modelName, id } = AmplifyHelpers.parseAmplifyKey('Todo::abc-123')
// Returns: { modelName: 'Todo', id: 'abc-123' }
```

#### amplifyGSIKey(indexName: string, value: string): string

Create GSI keys for Amplify secondary indexes.

**Example:**
```typescript
const gsiKey = AmplifyHelpers.amplifyGSIKey('StatusIndex', 'ACTIVE')
// Returns: 'StatusIndex#ACTIVE'
```

#### schemaToAccessPatterns<T extends Schema>(schema: T): AccessPatternDefinitions

Convert Amplify schema to access pattern definitions.

**Example:**
```typescript
import type { Schema } from './amplify/data/resource'

const patterns = AmplifyHelpers.schemaToAccessPatterns<Schema>(schema)
```

#### getTableName<T extends Schema>(schema: T): string

Extract DynamoDB table name from Amplify config.

**Example:**
```typescript
const tableName = AmplifyHelpers.getTableName(schema)
```

---

## Common Types

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

### ConditionExpression

```typescript
interface ConditionExpression {
  [attribute: string]: {
    attributeExists?: boolean
    attributeNotExists?: boolean
    eq?: any
    ne?: any
    lt?: any
    lte?: any
    gt?: any
    gte?: any
    between?: [any, any]
  }
}
```

---

## Version

Current version: 0.1.0

## License

MIT
