# Design Document: DynamoDB TypeScript Wrapper

## Overview

The DynamoDB TypeScript wrapper is a lightweight library that provides a developer-friendly interface for AWS DynamoDB operations. It combines simplified API methods, optional schema validation with strong typing, first-class support for DynamoDB patterns, explicit access pattern definitions, and built-in performance monitoring with recommendations.

The design follows these principles:
- **Progressive enhancement**: Start simple, add complexity only when needed
- **Type safety**: Leverage TypeScript's type system for compile-time guarantees
- **Zero-cost abstractions**: Minimal runtime overhead when features aren't used
- **Explicit over implicit**: Make access patterns and data models clear
- **Developer experience**: Helpful errors, good defaults, easy debugging
- **Best practices by default**: Guide users toward efficient DynamoDB usage patterns

### DynamoDB Best Practices Addressed

This wrapper is designed around AWS DynamoDB best practices:

1. **Single-Table Design**: First-class support for storing multiple entity types in one table with proper key design
2. **Efficient Key Design**: Utilities for composite keys, hierarchical data, and proper partition key distribution
3. **Multi-Attribute Composite Keys**: Native support for DynamoDB's multi-attribute GSI keys (up to 4 attributes per key) with type preservation
4. **Query over Scan**: Access patterns enforce query-based access; scans emit warnings
5. **Sparse Indexes**: Support for GSI/LSI with sparse index patterns
6. **Hot Partition Prevention**: Built-in detection and warnings for uneven partition access
7. **Capacity Management**: Track consumed capacity and provide right-sizing recommendations
8. **Batch Operations**: Automatic batching and chunking for efficient bulk operations
9. **Conditional Writes**: First-class support for optimistic locking and conditional expressions
10. **Projection Expressions**: Minimize data transfer by fetching only needed attributes
11. **Pagination**: Proper pagination support to avoid memory issues with large result sets

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Application Code                      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  DynamoDB Wrapper                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Table      │  │   Schema     │  │   Access     │  │
│  │   Client     │  │   Validator  │  │   Patterns   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pattern    │  │   Stats      │  │   Error      │  │
│  │   Helpers    │  │   Collector  │  │   Handler    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              AWS SDK DynamoDB Client                     │
└─────────────────────────────────────────────────────────┘
```

### Core Components

1. **Table Client**: Main interface for DynamoDB operations
2. **Schema Validator**: Optional runtime validation and type inference
3. **Access Pattern Manager**: Named, typed access patterns
4. **Pattern Helpers**: Utilities for common DynamoDB patterns
5. **Stats Collector**: Performance metrics and recommendations
6. **Error Handler**: Enhanced error messages and retry logic

## Components and Interfaces

### 1. Table Client

The `TableClient` is the primary interface for interacting with a DynamoDB table.

```typescript
interface TableClientConfig<TSchema = any> {
  tableName: string;
  client?: DynamoDBClient;
  schema?: Schema<TSchema>;
  accessPatterns?: AccessPatternDefinitions<TSchema>;
  statsConfig?: StatsConfig;
  region?: string;
  endpoint?: string;
}

class TableClient<TItem = any> {
  // Basic CRUD operations
  get(key: Key, options?: GetOptions): Promise<TItem | null>
  put(item: TItem, options?: PutOptions): Promise<void>
  update(key: Key, updates: Partial<TItem>, options?: UpdateOptions): Promise<TItem>
  delete(key: Key, options?: DeleteOptions): Promise<void>
  
  // Query and scan
  query(params: QueryParams<TItem>): Promise<QueryResult<TItem>>
  scan(params?: ScanParams<TItem>): Promise<ScanResult<TItem>>
  
  // Batch operations (auto-chunks to DynamoDB limits)
  batchGet(keys: Key[], options?: BatchGetOptions): Promise<TItem[]>
  batchWrite(operations: BatchWriteOperation<TItem>[], options?: BatchWriteOptions): Promise<void>
  
  // Transactional operations
  transactWrite(operations: TransactWriteOperation<TItem>[]): Promise<void>
  transactGet(keys: Key[]): Promise<TItem[]>
  
  // Access pattern methods
  executePattern<TResult = TItem>(
    patternName: string, 
    params: Record<string, any>
  ): Promise<TResult[]>
  
  // Pagination helpers
  queryPaginated(params: QueryParams<TItem>): AsyncIterableIterator<TItem>
  scanPaginated(params?: ScanParams<TItem>): AsyncIterableIterator<TItem>
  
  // Utilities
  getStats(): TableStats
  getRecommendations(): Recommendation[]
  getClient(): DynamoDBClient
}

// Options interfaces
interface GetOptions {
  consistentRead?: boolean
  projectionExpression?: string[]  // Only fetch specific attributes
}

interface PutOptions {
  condition?: ConditionExpression  // Conditional writes
  returnValues?: 'NONE' | 'ALL_OLD'
}

interface UpdateOptions {
  condition?: ConditionExpression
  returnValues?: 'NONE' | 'ALL_OLD' | 'ALL_NEW' | 'UPDATED_OLD' | 'UPDATED_NEW'
}

interface DeleteOptions {
  condition?: ConditionExpression
  returnValues?: 'NONE' | 'ALL_OLD'
}

interface BatchGetOptions {
  consistentRead?: boolean
  projectionExpression?: string[]
  chunkSize?: number  // Default 100 (DynamoDB limit)
}

interface BatchWriteOptions {
  chunkSize?: number  // Default 25 (DynamoDB limit)
}
```

**Design Decisions:**
- Generic type parameter allows typed or untyped usage
- All methods return Promises for consistency
- Options objects allow extensibility without breaking changes
- Direct client access for advanced use cases

### 2. Schema System

The schema system provides optional type safety and validation.

```typescript
interface Schema<T> {
  parse(data: unknown): T
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: ValidationError }
  partial(): Schema<Partial<T>>
  pick<K extends keyof T>(keys: K[]): Schema<Pick<T, K>>
  omit<K extends keyof T>(keys: K[]): Schema<Omit<T, K>>
}

// Schema builder API
const schema = {
  object<T>(shape: SchemaShape<T>): Schema<T>
  string(): StringSchema
  number(): NumberSchema
  boolean(): BooleanSchema
  array<T>(itemSchema: Schema<T>): ArraySchema<T>
  set<T>(itemSchema: Schema<T>): SetSchema<T>
  binary(): BinarySchema
  optional<T>(schema: Schema<T>): Schema<T | undefined>
  nullable<T>(schema: Schema<T>): Schema<T | null>
}

// Example usage
const UserSchema = schema.object({
  userId: schema.string(),
  email: schema.string(),
  age: schema.number().optional(),
  tags: schema.set(schema.string()).optional(),
  metadata: schema.object({
    createdAt: schema.string(),
    updatedAt: schema.string()
  })
})

type User = typeof UserSchema._type
```

**Design Decisions:**
- Inspired by Zod's API for familiarity
- Type inference using TypeScript's type system
- Composable schemas for complex types
- Separate parse (throws) and safeParse (returns result) methods
- Lightweight implementation without external dependencies

### 3. Access Pattern System

Access patterns are defined declaratively and provide type-safe query methods.

```typescript
interface AccessPatternDefinition<TItem, TParams, TResult = TItem> {
  index?: string  // undefined = primary index
  keyCondition: (params: TParams) => KeyCondition
  filter?: (params: TParams) => FilterExpression
  transform?: (items: TItem[]) => TResult[]
}

interface AccessPatternDefinitions<TItem> {
  [patternName: string]: AccessPatternDefinition<TItem, any, any>
}

// Example usage
const userAccessPatterns = {
  getUserById: {
    keyCondition: (params: { userId: string }) => ({
      pk: `USER#${params.userId}`,
      sk: `PROFILE`
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
    keyCondition: (params: { status: string, dateFrom?: string }) => ({
      pk: `STATUS#${params.status}`,
      sk: params.dateFrom ? { gte: params.dateFrom } : undefined
    })
  }
}

// Type-safe execution
const orders = await table.executePattern('getUserOrders', { userId: '123' })
```

**Design Decisions:**
- Named patterns make queries self-documenting
- Type parameters ensure compile-time safety
- Key condition builders abstract DynamoDB expression syntax
- Optional transform function for post-processing
- Pattern definitions are separate from table client for reusability

### 3.1. Multi-Attribute Composite Keys for GSIs

DynamoDB now supports multi-attribute composite keys in Global Secondary Indexes (GSIs), allowing up to 4 attributes for both partition keys and sort keys. This feature eliminates the need for manual concatenation and preserves native data types.

**Key Benefits:**
- **Native Data Types**: Each attribute retains its type (string, number, binary)
- **Improved Distribution**: Multi-attribute partition keys reduce hot partition risk
- **Flexible Querying**: Query on increasingly specific attribute combinations
- **Simplified Modeling**: No need for synthetic concatenated attributes
- **Type Safety**: Strongly typed multi-attribute key definitions

**Interface Design:**

```typescript
/**
 * Multi-attribute key definition for GSI partition or sort keys
 */
interface MultiAttributeKey {
  attributes: Array<{
    name: string
    type: 'string' | 'number' | 'binary'
  }>
}

/**
 * Extended key condition supporting multi-attribute keys
 */
interface KeyCondition {
  // Traditional single-attribute keys
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
  
  // Multi-attribute keys (for GSIs)
  multiPk?: Array<string | number | Uint8Array>
  multiSk?: Array<string | number | Uint8Array> | {
    eq?: Array<string | number | Uint8Array>
    lt?: Array<string | number | Uint8Array>
    lte?: Array<string | number | Uint8Array>
    gt?: Array<string | number | Uint8Array>
    gte?: Array<string | number | Uint8Array>
    between?: [Array<string | number | Uint8Array>, Array<string | number | Uint8Array>]
    // Note: beginsWith not supported for multi-attribute keys
  }
}

/**
 * GSI configuration with multi-attribute key support
 */
interface GSIConfig {
  indexName: string
  partitionKey: string | MultiAttributeKey
  sortKey?: string | MultiAttributeKey
}

/**
 * Access pattern with multi-attribute GSI support
 */
interface AccessPatternDefinition<TItem, TParams, TResult = TItem> {
  index?: string
  gsiConfig?: GSIConfig  // Optional GSI configuration for validation
  keyCondition: (params: TParams) => KeyCondition
  filter?: (params: TParams) => FilterExpression
  transform?: (items: TItem[]) => TResult[]
}
```

**Example Usage:**

```typescript
// Define a GSI with multi-attribute keys
const gsiConfig: GSIConfig = {
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
}

// Access pattern using multi-attribute keys
const locationPatterns = {
  getUsersByLocation: {
    index: 'LocationIndex',
    gsiConfig,
    keyCondition: (params: { 
      tenantId: string
      customerId: string
      country?: string
      state?: string
      city?: string
    }) => ({
      multiPk: [params.tenantId, params.customerId],
      multiSk: params.country ? {
        beginsWith: [params.country, params.state, params.city].filter(Boolean)
      } : undefined
    })
  },
  
  getOrdersByTenantAndStatus: {
    index: 'OrderStatusIndex',
    keyCondition: (params: {
      tenantId: string
      departmentId: string
      status: string
      priority?: number
    }) => ({
      multiPk: [params.tenantId, params.departmentId],
      multiSk: params.priority ? {
        eq: [params.status, params.priority]
      } : {
        beginsWith: [params.status]
      }
    })
  }
}

// Query with multi-attribute keys
const users = await table.executePattern('getUsersByLocation', {
  tenantId: 'TENANT-123',
  customerId: 'CUST-456',
  country: 'USA',
  state: 'CA'
})
```

**Pattern Helpers for Multi-Attribute Keys:**

```typescript
class PatternHelpers {
  /**
   * Create a multi-attribute key value array
   */
  static multiAttributeKey(
    values: Array<string | number | Uint8Array>
  ): Array<string | number | Uint8Array> {
    return values
  }
  
  /**
   * Validate multi-attribute key against GSI configuration
   */
  static validateMultiAttributeKey(
    key: Array<string | number | Uint8Array>,
    config: MultiAttributeKey
  ): void {
    if (key.length > config.attributes.length) {
      throw new Error(`Too many attributes: expected max ${config.attributes.length}, got ${key.length}`)
    }
    
    for (let i = 0; i < key.length; i++) {
      const value = key[i]
      const expectedType = config.attributes[i].type
      
      if (expectedType === 'string' && typeof value !== 'string') {
        throw new Error(`Attribute ${i} (${config.attributes[i].name}) must be string`)
      }
      if (expectedType === 'number' && typeof value !== 'number') {
        throw new Error(`Attribute ${i} (${config.attributes[i].name}) must be number`)
      }
      if (expectedType === 'binary' && !(value instanceof Uint8Array)) {
        throw new Error(`Attribute ${i} (${config.attributes[i].name}) must be Uint8Array`)
      }
    }
  }
  
  /**
   * Build multi-attribute partition key for common patterns
   */
  static multiTenantKey(tenantId: string, customerId: string, departmentId?: string): Array<string> {
    return departmentId 
      ? [tenantId, customerId, departmentId]
      : [tenantId, customerId]
  }
  
  /**
   * Build multi-attribute sort key for hierarchical data
   */
  static hierarchicalMultiKey(
    level1: string,
    level2?: string,
    level3?: string,
    level4?: string
  ): Array<string> {
    return [level1, level2, level3, level4].filter((v): v is string => v !== undefined)
  }
  
  /**
   * Build multi-attribute sort key for time-series with category
   */
  static timeSeriesMultiKey(
    category: string,
    timestamp: Date,
    subcategory?: string
  ): Array<string | number> {
    const key: Array<string | number> = [category, timestamp.getTime()]
    if (subcategory) {
      key.push(subcategory)
    }
    return key
  }
}
```

**Query Building:**

The wrapper will automatically detect multi-attribute keys and build the appropriate DynamoDB query expressions:

```typescript
// Internal query builder logic
function buildKeyConditionExpression(keyCondition: KeyCondition): {
  expression: string
  attributeNames: Record<string, string>
  attributeValues: Record<string, any>
} {
  if (keyCondition.multiPk) {
    // Build multi-attribute partition key expression
    // Example: #pk0 = :pk0 AND #pk1 = :pk1 AND #pk2 = :pk2
    const pkExpressions = keyCondition.multiPk.map((_, i) => `#pk${i} = :pk${i}`)
    let expression = pkExpressions.join(' AND ')
    
    if (keyCondition.multiSk) {
      // Build multi-attribute sort key expression
      if (Array.isArray(keyCondition.multiSk)) {
        const skExpressions = keyCondition.multiSk.map((_, i) => `#sk${i} = :sk${i}`)
        expression += ' AND ' + skExpressions.join(' AND ')
      } else {
        // Handle comparison operators
        // ...
      }
    }
    
    return { expression, attributeNames, attributeValues }
  }
  
  // Fall back to traditional single-attribute key handling
  // ...
}
```

**Design Decisions:**
- Separate `multiPk` and `multiSk` fields to distinguish from traditional keys
- Support partial multi-attribute sort keys for flexible querying
- Automatic validation against GSI configuration when provided
- Helper methods for common multi-attribute key patterns
- Type-safe array construction with proper type checking
- Backward compatible with existing single-attribute key patterns

**Use Cases:**

1. **Multi-Tenant Applications:**
   ```typescript
   multiPk: [tenantId, customerId, departmentId]
   // Ensures even distribution across tenants
   ```

2. **Hierarchical Queries:**
   ```typescript
   multiSk: [country, state, city]
   // Query all users, then by country, then by state, then by city
   ```

3. **Time-Series with Categories:**
   ```typescript
   multiSk: [category, timestamp, priority]
   // Query by category, then time range, then priority
   ```

4. **Complex Access Patterns:**
   ```typescript
   multiPk: [productType, brandId]
   multiSk: [priceRange, rating, availabilityStatus]
   // Rich querying without concatenation
   ```

**Migration Path:**

For existing applications using concatenated keys:
1. Create new GSI with multi-attribute keys
2. Backfill data with separate attributes
3. Update access patterns to use multi-attribute keys
4. Remove old concatenated attributes and GSI

The wrapper will support both patterns simultaneously during migration.

### 4. Pattern Helpers

Utilities for implementing common DynamoDB patterns.

```typescript
class PatternHelpers {
  // Composite key utilities
  static compositeKey(parts: string[], separator = '#'): string
  static parseCompositeKey(key: string, separator = '#'): string[]
  
  // Single-table design
  static entityKey(entityType: string, id: string): string
  static parseEntityKey(key: string): { entityType: string; id: string }
  
  // Time-based keys
  static timeSeriesKey(timestamp: Date, granularity: 'hour' | 'day' | 'month'): string
  static ttlTimestamp(expiresAt: Date): number
  
  // Adjacency list pattern
  static adjacencyKeys(sourceId: string, targetId: string): { pk: string; sk: string }
  
  // Hierarchical data
  static hierarchicalKey(path: string[]): string
  static parseHierarchicalKey(key: string): string[]
  
  // GSI overloading
  static gsiKey(indexName: string, entityType: string, value: string): string
  
  // Partition key distribution (prevent hot partitions)
  static distributedKey(baseKey: string, shardCount: number): string
  static getShardNumber(key: string): number
  
  // Optimistic locking
  static versionAttribute(): string  // Returns attribute name for version tracking
  static incrementVersion(currentVersion: number): number
  
  // Sparse index helpers
  static sparseIndexValue(condition: boolean, value: string): string | undefined
  
  // Write sharding for high-velocity items
  static shardedWrite(itemId: string, shardCount: number): { pk: string; shard: number }
}
```

**Design Decisions:**
- Static methods for stateless utilities
- Consistent naming conventions (e.g., `ENTITY#ID`)
- Configurable separators for flexibility
- Helper methods reduce boilerplate and errors

### 5. Statistics Collection

The stats collector tracks operation metrics and generates recommendations.

```typescript
interface StatsConfig {
  enabled: boolean
  sampleRate?: number  // 0-1, default 1 (100%)
  thresholds?: {
    slowQueryMs?: number
    highRCU?: number
    highWCU?: number
  }
}

interface OperationStats {
  operation: string
  tableName: string
  indexName?: string
  accessPattern?: string
  timestamp: number
  latencyMs: number
  consumedRCU?: number
  consumedWCU?: number
  itemCount: number
  scannedCount?: number
}

interface TableStats {
  operations: {
    [operationType: string]: {
      count: number
      totalLatencyMs: number
      avgLatencyMs: number
      totalRCU: number
      totalWCU: number
    }
  }
  accessPatterns: {
    [patternName: string]: {
      count: number
      avgLatencyMs: number
      avgItemsReturned: number
    }
  }
}

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

class StatsCollector {
  recordOperation(stats: OperationStats): void
  getStats(): TableStats
  getRecommendations(): Recommendation[]
  reset(): void
  export(): OperationStats[]
  
  // Best practice detection
  detectHotPartitions(): HotPartitionReport[]
  detectIneffientScans(): ScanReport[]
  detectUnusedIndexes(): IndexReport[]
  suggestCapacityMode(): CapacityRecommendation
}

interface HotPartitionReport {
  partitionKey: string
  accessCount: number
  percentageOfTotal: number
  recommendation: string
}

interface ScanReport {
  operation: string
  scannedCount: number
  returnedCount: number
  efficiency: number  // returnedCount / scannedCount
  recommendation: string
}

interface IndexReport {
  indexName: string
  usageCount: number
  lastUsed?: number
  recommendation: string
}

interface CapacityRecommendation {
  currentMode: 'provisioned' | 'on-demand' | 'unknown'
  recommendedMode: 'provisioned' | 'on-demand'
  reasoning: string
  estimatedMonthlyCost: {
    current: number
    recommended: number
    savings: number
  }
}
```

**Design Decisions:**
- Sampling support to reduce overhead in high-traffic scenarios
- Configurable thresholds for different environments
- Separate stats storage from recommendation generation
- Export capability for external analysis
- Recommendations categorized by severity and type

### 6. Error Handling

Enhanced error handling with context and retry logic.

```typescript
class DynamoDBWrapperError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'DynamoDBWrapperError'
  }
}

class ValidationError extends DynamoDBWrapperError {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public constraint: string
  ) {
    super(message, 'VALIDATION_ERROR', 'validate', { field, value, constraint })
  }
}

class ConditionalCheckError extends DynamoDBWrapperError {
  constructor(
    message: string,
    public condition: string,
    public item?: any
  ) {
    super(message, 'CONDITIONAL_CHECK_FAILED', 'conditionalCheck', { condition, item })
  }
}

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryableErrors: string[]
}

class RetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T>
}
```

**Design Decisions:**
- Custom error classes for different failure types
- Context object preserves operation details
- Retry logic with exponential backoff
- Configurable retry behavior per operation
- Error codes for programmatic handling

## Best Practices Implementation

### 1. Query Over Scan Enforcement

**Problem**: Scans are expensive and slow, reading every item in a table.

**Implementation**:
- Emit console warnings when `scan()` is called
- Track scan operations separately in stats
- Recommend converting frequent scans to queries with proper indexes
- Provide scan efficiency metrics (items returned / items scanned)

```typescript
// Wrapper automatically warns
await table.scan()  // ⚠️ Warning: Scan operation detected. Consider using query with an index.

// Stats show scan efficiency
const stats = table.getStats()
// { scanEfficiency: 0.05 } // Only 5% of scanned items returned
```

### 2. Hot Partition Detection

**Problem**: Uneven access patterns can create hot partitions, throttling requests.

**Implementation**:
- Track partition key access frequency
- Detect when a single partition receives >10% of traffic
- Recommend write sharding or better key distribution
- Provide utilities for distributed keys

```typescript
// Automatic detection
const recommendations = table.getRecommendations()
// "Partition key 'USER#123' receives 45% of all requests. Consider write sharding."

// Helper for distribution
const key = PatternHelpers.distributedKey('USER#123', 10)  // Adds shard suffix
```

### 3. Batch Operation Optimization

**Problem**: Individual operations are inefficient for bulk data access.

**Implementation**:
- Automatically chunk batch operations to DynamoDB limits (25 for writes, 100 for reads)
- Retry failed items from batch operations
- Track batch efficiency in stats
- Recommend batching when multiple individual operations are detected

```typescript
// Automatically chunks to 25-item batches
await table.batchWrite(largeArrayOf100Items)  // Sent as 4 batches

// Stats track batching opportunities
// "Detected 50 individual put operations in 1 second. Consider using batchWrite."
```

### 4. Capacity Optimization

**Problem**: Over-provisioning wastes money, under-provisioning causes throttling.

**Implementation**:
- Track consumed RCU/WCU over time
- Compare actual usage to provisioned capacity
- Recommend switching between provisioned and on-demand modes
- Identify peak usage patterns

```typescript
const recommendation = statsCollector.suggestCapacityMode()
// {
//   currentMode: 'provisioned',
//   recommendedMode: 'on-demand',
//   reasoning: 'Spiky traffic pattern with 80% idle capacity',
//   estimatedMonthlyCost: { current: 100, recommended: 65, savings: 35 }
// }
```

### 5. Projection Expression Optimization

**Problem**: Fetching entire items wastes bandwidth and RCUs when only some attributes are needed.

**Implementation**:
- Support projection expressions in all read operations
- Track average item size vs. projected size
- Recommend projections when large items are frequently fetched

```typescript
// Only fetch needed attributes
await table.get(key, { projectionExpression: ['userId', 'email'] })

// Stats identify optimization opportunities
// "Average item size: 50KB. Projection could reduce to 2KB (96% savings)."
```

### 6. Conditional Write Support

**Problem**: Race conditions and data inconsistency without proper concurrency control.

**Implementation**:
- First-class support for condition expressions
- Optimistic locking helpers with version attributes
- Clear error messages for conditional check failures

```typescript
// Optimistic locking
await table.put(item, {
  condition: { version: { eq: currentVersion } }
})

// Conditional writes
await table.update(key, updates, {
  condition: { status: { eq: 'PENDING' } }
})
```

### 7. Sparse Index Patterns

**Problem**: GSIs consume capacity even for items without the indexed attribute.

**Implementation**:
- Helpers for conditionally setting GSI attributes
- Documentation and examples of sparse index patterns
- Track GSI usage and recommend sparse patterns when appropriate

```typescript
// Only set GSI attribute when condition is met
const item = {
  pk: 'USER#123',
  sk: 'PROFILE',
  email: 'user@example.com',
  // Only add to GSI if email is verified
  ...PatternHelpers.sparseIndexValue(emailVerified, { gsi1pk: 'VERIFIED#USER' })
}
```

### 8. Pagination Best Practices

**Problem**: Loading large result sets into memory causes performance issues.

**Implementation**:
- Async iterators for memory-efficient pagination
- Automatic pagination with configurable page sizes
- Track pagination usage in stats

```typescript
// Memory-efficient iteration
for await (const item of table.queryPaginated(params)) {
  // Process one item at a time
  await processItem(item)
}

// Traditional pagination with explicit control
let lastKey = undefined
do {
  const result = await table.query({ ...params, exclusiveStartKey: lastKey })
  await processItems(result.items)
  lastKey = result.lastEvaluatedKey
} while (lastKey)
```

### 9. Single-Table Design Support

**Problem**: Managing multiple entity types in one table requires careful key design.

**Implementation**:
- Entity key helpers with type prefixes
- Access pattern definitions per entity type
- Type-safe operations for different entities
- Documentation and examples

```typescript
// Define entities in single table
const userKey = PatternHelpers.entityKey('USER', userId)
const orderKey = PatternHelpers.entityKey('ORDER', orderId)

// Access patterns per entity
const patterns = {
  getUserOrders: {
    keyCondition: (params: { userId: string }) => ({
      pk: PatternHelpers.entityKey('USER', params.userId),
      sk: { beginsWith: 'ORDER#' }
    })
  }
}
```

### 10. Time-Series Data Optimization

**Problem**: Time-series data can create hot partitions and inefficient queries.

**Implementation**:
- Time-based partition key helpers
- TTL attribute helpers for automatic expiration
- Aggregation patterns for time-series queries

```typescript
// Distribute time-series data
const pk = PatternHelpers.timeSeriesKey(new Date(), 'day')  // '2025-12-02'
const ttl = PatternHelpers.ttlTimestamp(expiresAt)  // Unix timestamp

await table.put({
  pk,
  sk: `EVENT#${eventId}`,
  ttl,  // Automatically deleted by DynamoDB
  ...eventData
})
```

## Data Models

### Internal Data Structures

```typescript
// Key representation
interface Key {
  pk: string
  sk?: string
}

// Query conditions
interface KeyCondition {
  pk: string
  sk?: string | {
    eq?: string
    lt?: string
    lte?: string
    gt?: string
    gte?: string
    between?: [string, string]
    beginsWith?: string
  }
}

// Filter expressions
interface FilterExpression {
  [field: string]: any | {
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
  }
}

// Operation results
interface QueryResult<T> {
  items: T[]
  lastEvaluatedKey?: Key
  count: number
  scannedCount: number
  consumedCapacity?: ConsumedCapacity
}

interface ScanResult<T> {
  items: T[]
  lastEvaluatedKey?: Key
  count: number
  scannedCount: number
  consumedCapacity?: ConsumedCapacity
}
```

**Design Decisions:**
- Simplified key and condition representations
- Consistent result structures across operations
- Optional consumed capacity for cost tracking
- Pagination support via lastEvaluatedKey

## Error Handling

### Error Categories

1. **Validation Errors**: Schema validation failures
2. **Conditional Check Errors**: Condition expressions not met
3. **Throttling Errors**: Rate limit exceeded
4. **Resource Errors**: Table/index not found
5. **Network Errors**: Connection failures
6. **Unknown Errors**: Unexpected AWS SDK errors

### Retry Strategy

- Exponential backoff for throttling errors
- Configurable max retries (default: 3)
- Base delay: 100ms, max delay: 5000ms
- Jitter to prevent thundering herd
- No retry for validation or conditional check errors

### Error Context

All errors include:
- Operation type (get, put, query, etc.)
- Table name and index (if applicable)
- Access pattern name (if applicable)
- Timestamp
- Original AWS SDK error (if applicable)

## Testing Strategy

### Unit Tests

1. **Schema Validation**
   - Test all schema types (string, number, boolean, array, object, set, binary)
   - Test optional and nullable fields
   - Test nested objects
   - Test validation error messages

2. **Key Builders**
   - Test composite key construction and parsing
   - Test entity key patterns
   - Test time-series key generation
   - Test hierarchical key patterns

3. **Access Pattern Definitions**
   - Test key condition builders
   - Test filter expression builders
   - Test pattern parameter validation

4. **Stats Collector**
   - Test metric recording
   - Test aggregation calculations
   - Test recommendation generation
   - Test sampling logic

5. **Error Handling**
   - Test custom error creation
   - Test retry logic with mocked failures
   - Test exponential backoff timing

### Integration Tests

1. **Basic CRUD Operations**
   - Test get, put, update, delete with real DynamoDB Local
   - Test with and without schemas
   - Test error cases (item not found, etc.)

2. **Query and Scan**
   - Test various key conditions
   - Test filter expressions
   - Test pagination
   - Test GSI/LSI queries

3. **Batch Operations**
   - Test batch get with multiple items
   - Test batch write with mixed operations
   - Test batch size limits

4. **Access Patterns**
   - Test pattern execution
   - Test pattern with transforms
   - Test pattern with filters

5. **End-to-End Scenarios**
   - Test single-table design with multiple entity types
   - Test adjacency list pattern
   - Test time-series data pattern
   - Test hierarchical data queries

### Performance Tests

1. **Overhead Measurement**
   - Measure wrapper overhead vs raw SDK (<5% target)
   - Test with stats enabled/disabled
   - Test schema validation overhead
   - Test recommendation engine performance

2. **Throughput Tests**
   - Test batch operation performance with various sizes
   - Test concurrent operations (100+ simultaneous)
   - Test pagination performance with large datasets
   - Test hot partition handling

3. **Memory Tests**
   - Test memory usage with large result sets
   - Test stats collector memory footprint
   - Test async iterator memory efficiency
   - Test recommendation cache memory usage

4. **Best Practices Validation**
   - Test hot partition detection accuracy
   - Test scan efficiency calculations
   - Test capacity recommendation accuracy
   - Test anti-pattern detection rates

### Test Utilities

```typescript
// Mock DynamoDB client for unit tests
class MockDynamoDBClient {
  // Configurable responses and errors
}

// DynamoDB Local setup for integration tests
class TestDynamoDBSetup {
  static async createTable(config: TableConfig): Promise<void>
  static async deleteTable(tableName: string): Promise<void>
  static async seedData(tableName: string, items: any[]): Promise<void>
}

// Assertion helpers
function assertValidSchema<T>(schema: Schema<T>, validData: T, invalidData: any): void
function assertQueryResult<T>(result: QueryResult<T>, expected: Partial<QueryResult<T>>): void
```

## Implementation Phases

The implementation will be broken into incremental phases:

### Phase 1: Core Foundation
- Basic table client with CRUD operations
- AWS SDK integration and marshalling
- Simple error handling
- Basic TypeScript types

### Phase 2: Schema System
- Schema builder API
- Type inference
- Runtime validation
- Validation error messages

### Phase 3: Query and Access Patterns
- Query and scan operations
- Key condition builders
- Access pattern definitions
- Filter expressions

### Phase 4: Pattern Helpers
- Composite key utilities
- Single-table design helpers
- Time-series utilities
- Adjacency list helpers

### Phase 5: Statistics and Monitoring
- Stats collector implementation
- Metric aggregation
- Recommendation engine
- Export functionality

### Phase 6: Advanced Features
- Batch operations
- Retry logic
- Debug mode
- Performance optimizations

## Dependencies

### Required
- `@aws-sdk/client-dynamodb`: AWS SDK v3 DynamoDB client
- `@aws-sdk/lib-dynamodb`: Document client utilities for marshalling

### Development
- `@aws-sdk/types`: TypeScript types for AWS SDK
- `vitest`: Testing framework
- `@types/node`: Node.js types

### Optional
- `@aws-sdk/util-dynamodb`: Additional marshalling utilities if needed

## Configuration

### Environment Variables
- `AWS_REGION`: Default AWS region
- `AWS_ENDPOINT`: Custom endpoint (for DynamoDB Local)
- `DYNAMODB_WRAPPER_STATS_ENABLED`: Enable/disable stats collection
- `DYNAMODB_WRAPPER_DEBUG`: Enable debug logging

### Runtime Configuration
All configuration can be provided at runtime via the `TableClientConfig` object, allowing per-table customization.

## Recommendation Engine

The stats collector analyzes operation patterns and generates actionable recommendations.

### Recommendation Types

1. **Hot Partition Detection**
   - Trigger: Single partition key >10% of total requests
   - Action: Suggest write sharding or key redesign
   - Impact: Prevent throttling, improve throughput

2. **Scan Inefficiency**
   - Trigger: Scan efficiency <20% (returned/scanned ratio)
   - Action: Recommend query with GSI or filter optimization
   - Impact: Reduce RCU consumption by 80-95%

3. **Batch Opportunity**
   - Trigger: >10 individual operations within 1 second
   - Action: Suggest using batchGet or batchWrite
   - Impact: Reduce latency by 50-70%, lower costs

4. **Capacity Mode Optimization**
   - Trigger: Provisioned capacity utilization <30% or >80%
   - Action: Recommend on-demand or capacity adjustment
   - Impact: Cost savings of 20-60%

5. **Projection Optimization**
   - Trigger: Average item size >10KB with consistent access patterns
   - Action: Suggest projection expressions
   - Impact: Reduce RCU consumption by 50-90%

6. **Unused Index**
   - Trigger: GSI/LSI not queried in 7 days
   - Action: Recommend removing index
   - Impact: Reduce WCU costs by 50% per unused index

7. **Conditional Write Missing**
   - Trigger: Multiple updates to same item without conditions
   - Action: Suggest optimistic locking
   - Impact: Prevent data corruption from race conditions

8. **Large Item Warning**
   - Trigger: Item size >100KB (approaching 400KB limit)
   - Action: Recommend splitting item or using S3
   - Impact: Prevent write failures, reduce costs

9. **Multi-Attribute Key Opportunity**
   - Trigger: Concatenated string keys detected in GSI patterns
   - Action: Recommend migrating to multi-attribute composite keys
   - Impact: Improved type safety, simplified queries, better distribution
   - Example: Detect patterns like `"TENANT#123#CUSTOMER#456"` and suggest multi-attribute key `[tenantId, customerId]`

10. **Hot Partition with Multi-Attribute Solution**
   - Trigger: Hot partition detected on single-attribute GSI partition key
   - Action: Recommend adding attributes to create multi-attribute partition key
   - Impact: Better distribution, reduced throttling
   - Example: Single `tenantId` causing hot partition → suggest `[tenantId, customerId]` or `[tenantId, departmentId]`

### Recommendation Priority

Recommendations are prioritized by:
1. **Severity**: Error > Warning > Info
2. **Impact**: Cost savings and performance improvements
3. **Frequency**: How often the issue occurs
4. **Ease of fix**: Simple configuration vs. schema redesign

### Example Recommendation Output

```typescript
const recommendations = table.getRecommendations()

[
  {
    severity: 'error',
    category: 'hot-partition',
    message: 'Hot partition detected',
    details: 'Partition key "USER#123" receives 45% of all requests',
    suggestedAction: 'Implement write sharding using PatternHelpers.distributedKey()',
    affectedOperations: ['put', 'update', 'query'],
    estimatedImpact: {
      performanceImprovement: 'Reduce throttling by 90%'
    }
  },
  {
    severity: 'warning',
    category: 'cost',
    message: 'Inefficient scan operations',
    details: 'Scan "getUsersByStatus" returns 2% of scanned items',
    suggestedAction: 'Create GSI on status attribute and use query instead',
    estimatedImpact: {
      costReduction: '$150/month (98% RCU reduction)'
    }
  },
  {
    severity: 'info',
    category: 'capacity',
    message: 'Consider switching to on-demand mode',
    details: 'Provisioned capacity utilization: 15% average, 85% peak',
    suggestedAction: 'Switch to on-demand billing for spiky workloads',
    estimatedImpact: {
      costReduction: '$45/month (35% savings)'
    }
  }
]
```

## Performance Considerations

1. **Marshalling Overhead**: Use AWS SDK's document client utilities for efficient marshalling
2. **Stats Collection**: Use sampling in high-throughput scenarios (configurable sample rate)
3. **Schema Validation**: Cache compiled schemas, validate only on writes
4. **Connection Pooling**: Reuse DynamoDB client instances across operations
5. **Batch Operations**: Automatically chunk and batch multiple operations
6. **Memory**: Stream large result sets using async iterators instead of loading all into memory
7. **Recommendation Engine**: Run analysis asynchronously, cache results for 60 seconds
8. **Hot Partition Tracking**: Use probabilistic data structures (HyperLogLog) for memory efficiency

## Security Considerations

1. **Credentials**: Never log or expose AWS credentials
2. **Data Sanitization**: Sanitize error messages to avoid leaking sensitive data
3. **Input Validation**: Validate all user inputs before constructing DynamoDB expressions
4. **Injection Prevention**: Use parameterized expressions, never string concatenation
5. **Least Privilege**: Document required IAM permissions for each operation

## Anti-Pattern Detection

The wrapper actively detects and warns against common DynamoDB anti-patterns:

### 1. Fetching to Filter
**Anti-pattern**: Query all items then filter in application code
**Detection**: Track filter expressions vs. key conditions
**Recommendation**: Move filters to DynamoDB filter expressions or redesign keys

### 2. Sequential Writes
**Anti-pattern**: Writing items one-by-one in a loop
**Detection**: Multiple put operations within short time window
**Recommendation**: Use batchWrite for bulk operations

### 3. Reading Before Writing
**Anti-pattern**: Get item, modify, then put (instead of update)
**Detection**: Get followed by put on same key within 100ms
**Recommendation**: Use update operation with conditional expressions

### 4. Large Attribute Values
**Anti-pattern**: Storing large blobs (>100KB) in DynamoDB
**Detection**: Track item sizes on write operations
**Recommendation**: Store large data in S3, reference in DynamoDB

### 5. Uniform Partition Keys
**Anti-pattern**: Using sequential IDs or timestamps as partition keys
**Detection**: Analyze partition key patterns for sequential values
**Recommendation**: Add random suffix or use composite keys

### 6. Over-Fetching
**Anti-pattern**: Fetching entire items when only few attributes needed
**Detection**: Track which attributes are actually used after fetch
**Recommendation**: Use projection expressions

### 7. Missing Pagination
**Anti-pattern**: Not handling pagination in queries
**Detection**: Queries that hit 1MB limit without using lastEvaluatedKey
**Recommendation**: Implement proper pagination

### 8. Ignoring Consumed Capacity
**Anti-pattern**: Not monitoring RCU/WCU consumption
**Detection**: Operations without ReturnConsumedCapacity
**Recommendation**: Enable capacity tracking in wrapper config

### 9. Inconsistent Key Naming
**Anti-pattern**: Using different key formats across entity types
**Detection**: Analyze key patterns for inconsistencies
**Recommendation**: Use PatternHelpers for consistent key generation

### 10. Missing Error Handling
**Anti-pattern**: Not handling conditional check failures
**Detection**: Conditional operations without try-catch
**Recommendation**: Implement proper error handling for ConditionalCheckFailedException

## Future Enhancements

- Streams integration for change data capture
- Caching layer integration (with cache invalidation)
- Migration utilities for schema changes
- CLI tool for table introspection and testing
- OpenTelemetry integration for distributed tracing
- GraphQL resolver helpers
- PartiQL query support
- Global table support for multi-region
- Point-in-time recovery helpers
- Backup and restore utilities
- Cost estimation tools
- Load testing utilities with realistic patterns
