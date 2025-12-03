# Design Document

## Overview

This design refactors the DynamoDB wrapper library into a monorepo with multiple packages, enabling both standalone usage and integration with AWS Amplify Gen 2. The architecture separates concerns into independent packages that can be composed based on the developer's needs.

The key architectural principle is **separation of concerns**: core utilities, statistics/monitoring, and data access are independent layers that can be mixed and matched. This allows the same pattern helpers and monitoring to work with either our TableClient or Amplify's data client.

## Architecture

### Package Structure

```
ddb-lib/
├── packages/
│   ├── core/                    # @ddb-lib/core
│   │   ├── src/
│   │   │   ├── pattern-helpers.ts
│   │   │   ├── multi-attribute-key-helpers.ts
│   │   │   ├── multi-attribute-key-validator.ts
│   │   │   ├── type-guards.ts
│   │   │   ├── condition-expression-builder.ts
│   │   │   ├── expression-builders.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── stats/                   # @ddb-lib/stats
│   │   ├── src/
│   │   │   ├── stats-collector.ts
│   │   │   ├── recommendation-engine.ts
│   │   │   ├── anti-pattern-detector.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── client/                  # @ddb-lib/client
│   │   ├── src/
│   │   │   ├── table-client.ts
│   │   │   ├── retry-handler.ts
│   │   │   ├── errors.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── amplify/                 # @ddb-lib/amplify
│       ├── src/
│       │   ├── amplify-monitor.ts
│       │   ├── amplify-helpers.ts
│       │   ├── types.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── examples/
│   ├── standalone/
│   │   ├── basic-crud.ts
│   │   ├── single-table-design.ts
│   │   └── stats-monitoring.ts
│   └── amplify/
│       ├── basic-usage.ts
│       ├── with-monitoring.ts
│       └── pattern-helpers.ts
│
├── package.json                 # Root package.json for monorepo
├── tsconfig.json               # Base TypeScript config
└── README.md
```

### Package Dependencies

```
@ddb-lib/core
  └── (no dependencies)

@ddb-lib/stats
  └── @ddb-lib/core

@ddb-lib/client
  ├── @ddb-lib/core
  ├── @ddb-lib/stats
  └── @aws-sdk/client-dynamodb (peer)
  └── @aws-sdk/lib-dynamodb (peer)

@ddb-lib/amplify
  ├── @ddb-lib/core
  ├── @ddb-lib/stats
  └── aws-amplify (peer)
```

## Components and Interfaces

### 1. Core Package (@ddb-lib/core)

Pure utility functions with no external dependencies. This package provides the foundation for DynamoDB best practices.

#### Pattern Helpers

```typescript
// pattern-helpers.ts
export class PatternHelpers {
  static entityKey(entityType: string, id: string): string
  static compositeKey(parts: string[], separator?: string): string
  static parseCompositeKey(key: string, separator?: string): string[]
  static timeSeriesKey(timestamp: Date, granularity: 'hour' | 'day' | 'month'): string
  static hierarchicalKey(path: string[]): string
  static adjacencyKeys(sourceId: string, targetId: string): { pk: string; sk: string }
  static distributedKey(baseKey: string, shardCount: number): string
  static gsiKey(indexName: string, entityType: string, value: string): string
  static sparseIndexValue(condition: boolean, value: string): string | undefined
  // ... other helpers
}
```

#### Multi-Attribute Key Helpers

```typescript
// multi-attribute-key-helpers.ts
export function multiAttributeKey(values: Array<string | number | Uint8Array>): Array<string | number | Uint8Array>
export function multiTenantKey(tenantId: string, customerId: string, departmentId?: string): string[]
export function hierarchicalMultiKey(level1: string, level2?: string, level3?: string, level4?: string): string[]
export function timeSeriesMultiKey(category: string, timestamp: Date, subcategory?: string): Array<string | number>
// ... other helpers
```

#### Expression Builders

```typescript
// expression-builders.ts
export class KeyConditionBuilder {
  eq(value: any): this
  lt(value: any): this
  lte(value: any): this
  gt(value: any): this
  gte(value: any): this
  between(start: any, end: any): this
  beginsWith(prefix: string): this
  build(): string
}

export class FilterExpressionBuilder {
  eq(attribute: string, value: any): this
  ne(attribute: string, value: any): this
  exists(attribute: string): this
  // ... other methods
  build(): { expression: string; values: Record<string, any> }
}

export class ConditionExpressionBuilder {
  attributeExists(attribute: string): this
  attributeNotExists(attribute: string): this
  eq(attribute: string, value: any): this
  // ... other methods
  build(): { expression: string; values: Record<string, any> }
}
```

#### Type Guards

```typescript
// type-guards.ts
export function isMultiAttributeKey(key: any): key is MultiAttributeKey
export function hasMultiAttributePartitionKey(config: any): boolean
export function hasMultiAttributeSortKey(config: any): boolean
// ... other type guards
```

#### Core Types

```typescript
// types.ts
export interface Key {
  pk: string | number | Uint8Array
  sk?: string | number | Uint8Array
}

export interface MultiAttributeKey {
  attributes: Array<{
    name: string
    type: 'string' | 'number' | 'binary'
  }>
}

export interface KeyCondition {
  pk?: string | number | Uint8Array
  sk?: string | number | Uint8Array | KeyConditionOperators
  multiPk?: Array<string | number | Uint8Array>
  multiSk?: Array<string | number | Uint8Array> | MultiKeyConditionOperators
}

// ... other core types
```

### 2. Stats Package (@ddb-lib/stats)

Statistics collection and recommendation engine that works independently of the data access layer.

#### Stats Collector

```typescript
// stats-collector.ts
export interface OperationRecord {
  operation: 'get' | 'put' | 'update' | 'delete' | 'query' | 'scan' | 'batchGet' | 'batchWrite' | 'transactWrite' | 'transactGet'
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

export interface StatsConfig {
  enabled: boolean
  sampleRate?: number
  thresholds?: {
    slowQueryMs?: number
    highRCU?: number
    highWCU?: number
  }
}

export class StatsCollector {
  constructor(config: StatsConfig)
  
  // Record an operation
  record(operation: OperationRecord): void
  
  // Get aggregated statistics
  getStats(): TableStats
  
  // Export raw data
  export(): OperationRecord[]
  
  // Reset statistics
  reset(): void
  
  // Check if operation should be sampled
  shouldSample(): boolean
}
```

#### Recommendation Engine

```typescript
// recommendation-engine.ts
export interface Recommendation {
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

export class RecommendationEngine {
  constructor(statsCollector: StatsCollector)
  
  // Generate recommendations based on collected stats
  generateRecommendations(): Recommendation[]
  
  // Check for specific anti-patterns
  private detectScans(): Recommendation[]
  private detectHotPartitions(): Recommendation[]
  private detectInefficientBatching(): Recommendation[]
  private detectMissingProjections(): Recommendation[]
  private detectHighCapacityUsage(): Recommendation[]
}
```

#### Anti-Pattern Detector

```typescript
// anti-pattern-detector.ts
export class AntiPatternDetector {
  constructor(statsCollector: StatsCollector)
  
  // Detect various anti-patterns
  detectStringConcatenation(): Recommendation[]
  detectLargeItemScans(): Recommendation[]
  detectUnusedIndexes(): Recommendation[]
  detectMissingGSIs(): Recommendation[]
  detectReadBeforeWrite(): Recommendation[]
}
```

### 3. Client Package (@ddb-lib/client)

The standalone TableClient that integrates core utilities and statistics.

#### Table Client

```typescript
// table-client.ts
import { PatternHelpers } from '@ddb-lib/core'
import { StatsCollector, RecommendationEngine } from '@ddb-lib/stats'

export interface TableClientConfig<TSchema = any> {
  tableName: string
  client?: DynamoDBClient
  region?: string
  endpoint?: string
  accessPatterns?: AccessPatternDefinitions<TSchema>
  statsConfig?: StatsConfig
  retryConfig?: RetryConfig
}

export class TableClient<TItem = any> {
  private client: DynamoDBClient
  private docClient: DynamoDBDocumentClient
  private statsCollector?: StatsCollector
  private recommendationEngine?: RecommendationEngine
  
  constructor(config: TableClientConfig<TItem>)
  
  // Core operations (instrumented with stats)
  async get(key: Key, options?: GetOptions): Promise<TItem | null>
  async put(item: TItem, options?: PutOptions): Promise<void>
  async update(key: Key, updates: Partial<TItem>, options?: UpdateOptions): Promise<TItem>
  async delete(key: Key, options?: DeleteOptions): Promise<void>
  async query(params: QueryParams<TItem>): Promise<QueryResult<TItem>>
  async scan(params?: ScanParams<TItem>): Promise<ScanResult<TItem>>
  
  // Batch operations
  async batchGet(keys: Key[], options?: BatchGetOptions): Promise<TItem[]>
  async batchWrite(operations: BatchWriteOperation<TItem>[], options?: BatchWriteOptions): Promise<void>
  
  // Transactional operations
  async transactWrite(operations: TransactWriteOperation<TItem>[]): Promise<void>
  async transactGet(keys: Key[]): Promise<TItem[]>
  
  // Paginated operations
  queryPaginated(params: QueryParams<TItem>): AsyncIterableIterator<TItem>
  scanPaginated(params?: ScanParams<TItem>): AsyncIterableIterator<TItem>
  
  // Access patterns
  async executePattern<TResult = TItem>(patternName: string, params: Record<string, any>): Promise<TResult[]>
  
  // Statistics and recommendations
  getStats(): TableStats
  getRecommendations(): Recommendation[]
  
  // Private helper to record operations
  private recordOperation(operation: OperationRecord): void
}
```

### 4. Amplify Package (@ddb-lib/amplify)

Integration layer for AWS Amplify Gen 2 data client.

#### Amplify Monitor

The core concept is to create a monitoring wrapper that intercepts Amplify data client operations and records statistics without modifying the operations themselves.

```typescript
// amplify-monitor.ts
import { StatsCollector, RecommendationEngine } from '@ddb-lib/stats'
import { PatternHelpers } from '@ddb-lib/core'
import type { Schema } from '@aws-amplify/data'

export interface AmplifyMonitorConfig {
  statsConfig?: StatsConfig
  enableAutoInstrumentation?: boolean
}

export class AmplifyMonitor<T extends Schema> {
  private statsCollector: StatsCollector
  private recommendationEngine: RecommendationEngine
  
  constructor(config: AmplifyMonitorConfig)
  
  // Wrap Amplify data client to add monitoring
  wrap<TModel>(model: any): MonitoredModel<TModel>
  
  // Manual operation recording for custom operations
  recordOperation(operation: OperationRecord): void
  
  // Get statistics and recommendations
  getStats(): TableStats
  getRecommendations(): Recommendation[]
  
  // Reset statistics
  reset(): void
}

// Monitored wrapper for Amplify models
interface MonitoredModel<TModel> {
  // All standard Amplify operations, but instrumented
  get(id: string): Promise<TModel | null>
  list(options?: ListOptions): Promise<TModel[]>
  create(data: Partial<TModel>): Promise<TModel>
  update(id: string, data: Partial<TModel>): Promise<TModel>
  delete(id: string): Promise<void>
  
  // Access to underlying model
  unwrap(): any
}
```

#### Amplify Helpers

Utilities specific to Amplify patterns.

```typescript
// amplify-helpers.ts
import { PatternHelpers } from '@ddb-lib/core'

export class AmplifyHelpers {
  // Convert Amplify schema to access pattern definitions
  static schemaToAccessPatterns<T extends Schema>(schema: T): AccessPatternDefinitions
  
  // Generate composite keys compatible with Amplify's key structure
  static amplifyCompositeKey(parts: string[]): string
  
  // Parse Amplify-generated keys
  static parseAmplifyKey(key: string): { modelName: string; id: string }
  
  // Create GSI keys for Amplify secondary indexes
  static amplifyGSIKey(indexName: string, value: string): string
  
  // Helper to extract DynamoDB table name from Amplify config
  static getTableName(schema: T): string
}
```

#### Usage Example

```typescript
// Example: Using AmplifyMonitor with Amplify Gen 2
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import { PatternHelpers } from '@ddb-lib/core'
import type { Schema } from '../amplify/data/resource'

const client = generateClient<Schema>()

// Create monitor
const monitor = new AmplifyMonitor({
  statsConfig: {
    enabled: true,
    sampleRate: 1.0,
    thresholds: {
      slowQueryMs: 100,
      highRCU: 50,
      highWCU: 50
    }
  }
})

// Wrap the model
const monitoredTodos = monitor.wrap(client.models.Todo)

// Use as normal - operations are automatically monitored
const todo = await monitoredTodos.create({
  title: 'Buy groceries',
  completed: false
})

// Get statistics and recommendations
const stats = monitor.getStats()
const recommendations = monitor.getRecommendations()

// Use pattern helpers with Amplify
const userKey = PatternHelpers.entityKey('USER', userId)
```

## Data Models

### Statistics Data Model

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

### Access Pattern Definition

```typescript
interface AccessPatternDefinition<TItem, TParams, TResult = TItem> {
  index?: string
  gsiConfig?: GSIConfig
  keyCondition: (params: TParams) => KeyCondition
  filter?: (params: TParams) => FilterExpression
  transform?: (items: TItem[]) => TResult[]
}

interface AccessPatternDefinitions<TItem> {
  [patternName: string]: AccessPatternDefinition<TItem, any, any>
}
```

## Error Handling

### Error Classes

All packages will use consistent error handling:

```typescript
// @ddb-lib/core - errors.ts
export class DDBLibError extends Error {
  code: string
  context?: Record<string, any>
  
  constructor(message: string, code: string, context?: Record<string, any>)
}

export class ValidationError extends DDBLibError {
  field: string
  value: any
  constraint: string
}

// @ddb-lib/client - errors.ts
export class ConditionalCheckError extends DDBLibError {
  condition: string
  item?: any
}

export class RetryExhaustedError extends DDBLibError {
  attempts: number
  lastError: Error
}
```

## Testing Strategy

### Unit Tests

Each package will have comprehensive unit tests:

- **@ddb-lib/core**: Test all utility functions in isolation
- **@ddb-lib/stats**: Test statistics collection and recommendation generation with mock data
- **@ddb-lib/client**: Test TableClient operations with mocked AWS SDK
- **@ddb-lib/amplify**: Test monitoring wrapper with mocked Amplify client

### Integration Tests

- **@ddb-lib/client**: Test against DynamoDB Local
- **@ddb-lib/amplify**: Test with Amplify Gen 2 in a test project

### Cross-Package Tests

Test that packages work together correctly:
- Stats collector works with both TableClient and AmplifyMonitor
- Pattern helpers work in all contexts
- Type definitions are consistent across packages

## Monorepo Setup

### Tool Choice: npm Workspaces

Using npm workspaces for simplicity and zero additional dependencies.

### Root package.json

```json
{
  "name": "ddb-lib-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.3.7",
    "@types/node": "^22.10.2",
    "typescript": "^5.9.3"
  }
}
```

### Package-Specific package.json

Each package will have its own package.json with:
- Proper name (@ddb-lib/core, @ddb-lib/stats, etc.)
- Version (managed together or independently)
- Dependencies (including workspace references)
- Peer dependencies (AWS SDK, Amplify)
- Build scripts
- Exports configuration for ESM/CJS

Example for @ddb-lib/core:

```json
{
  "name": "@ddb-lib/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "rsbuild build && tsc --emitDeclarationOnly",
    "test": "rstest",
    "typecheck": "tsc --noEmit"
  },
  "sideEffects": false
}
```

## Build and Publishing

### Build Process

1. Each package builds independently
2. TypeScript compiles to dist/ directory
3. Type declarations generated alongside
4. Both ESM and CJS outputs (if needed)

### Publishing Strategy

- Packages can be published independently
- Version management: consider using changesets or manual versioning
- Publish to npm registry with @ddb-lib scope

### Tree-Shaking Support

- Set `"sideEffects": false` in package.json
- Use named exports only
- Avoid module-level side effects
- Proper ESM module structure

## Migration Path

Since backward compatibility is not required, the migration is straightforward:

### For Standalone Users

**Before:**
```typescript
import { TableClient } from 'ddb-lib'
```

**After:**
```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'
```

### For New Amplify Users

```typescript
import { AmplifyMonitor } from '@ddb-lib/amplify'
import { PatternHelpers } from '@ddb-lib/core'
```

## Performance Considerations

### Bundle Size

- Core package: ~10-15KB (utilities only)
- Stats package: ~20-30KB (statistics and recommendations)
- Client package: ~40-50KB (full TableClient)
- Amplify package: ~15-20KB (monitoring wrapper)

### Runtime Performance

- Statistics collection uses sampling to minimize overhead
- Pattern helpers are pure functions with minimal computation
- No performance impact when stats are disabled

### Memory Usage

- Statistics stored in memory with configurable limits
- Automatic cleanup of old statistics
- Export functionality to move data to external storage

## Security Considerations

- No credentials stored in any package
- Rely on AWS SDK and Amplify for authentication
- Statistics data sanitized to avoid leaking sensitive information
- Recommendation messages don't include actual data values

## Amplify Gen 2 Integration Details

### How Amplify Gen 2 Works

Amplify Gen 2 uses:
- TypeScript-first schema definition
- Generated client with type-safe operations
- Underlying DynamoDB table with specific key structure
- GraphQL API layer (optional)
- Built-in authorization rules

### Integration Approach

The AmplifyMonitor works by:

1. **Wrapping the data client**: Creates a proxy around Amplify's generated client
2. **Intercepting operations**: Captures operation metadata before/after execution
3. **Recording statistics**: Sends operation data to StatsCollector
4. **Preserving behavior**: All Amplify features work unchanged

### Key Challenges and Solutions

**Challenge**: Amplify abstracts away DynamoDB details
**Solution**: Extract metadata from Amplify's operation results and client configuration

**Challenge**: Amplify uses its own type system
**Solution**: Generic typing that works with any Amplify schema

**Challenge**: Can't modify Amplify's internal operations
**Solution**: Wrapper pattern that monitors without modification

## Future Enhancements

Potential future additions:
- Schema validation package (Zod/Yup integration)
- Migration tools package
- Testing utilities package
- CLI tools for analysis and recommendations
- Dashboard for visualizing statistics
- Integration with other ORMs (Electrodb, Dynamoose)
