# @ddb-lib/core

Pure utility functions for DynamoDB best practices. Zero dependencies, framework-agnostic, and tree-shakeable.

## Installation

```bash
npm install @ddb-lib/core
```

## Features

- **Pattern Helpers**: Utilities for common DynamoDB key patterns
- **Multi-Attribute Keys**: Native support for DynamoDB's multi-attribute composite keys
- **Expression Builders**: Type-safe builders for conditions, filters, and key conditions
- **Type Guards**: Runtime type checking for DynamoDB structures
- **Zero Dependencies**: Pure TypeScript with no external dependencies
- **Tree-Shakeable**: Import only what you need

## Usage

### Pattern Helpers

Utilities for implementing common DynamoDB patterns.

#### Entity Keys

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Create entity key with type prefix
const userKey = PatternHelpers.entityKey('USER', '123')
// Returns: 'USER#123'

// Parse entity key
const { entityType, id } = PatternHelpers.parseEntityKey('USER#123')
// Returns: { entityType: 'USER', id: '123' }
```

#### Composite Keys

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Create composite key
const key = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])
// Returns: 'USER#123#ORDER#456'

// Custom separator
const key = PatternHelpers.compositeKey(['USER', '123'], '::')
// Returns: 'USER::123'

// Parse composite key
const parts = PatternHelpers.parseCompositeKey('USER#123#ORDER#456')
// Returns: ['USER', '123', 'ORDER', '456']
```

#### Time-Series Keys

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Create time-based keys
const dayKey = PatternHelpers.timeSeriesKey(new Date('2025-12-03'), 'day')
// Returns: '2025-12-03'

const monthKey = PatternHelpers.timeSeriesKey(new Date('2025-12-03'), 'month')
// Returns: '2025-12'

const hourKey = PatternHelpers.timeSeriesKey(new Date('2025-12-03T14:30:00'), 'hour')
// Returns: '2025-12-03T14'

// Create TTL timestamp
const ttl = PatternHelpers.ttlTimestamp(new Date('2026-01-01'))
// Returns: Unix timestamp (seconds since epoch)
```

#### Hierarchical Keys

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Create hierarchical path
const path = PatternHelpers.hierarchicalKey(['org', 'dept', 'team'])
// Returns: 'org/dept/team'

// Parse hierarchical key
const parts = PatternHelpers.parseHierarchicalKey('org/dept/team')
// Returns: ['org', 'dept', 'team']
```

#### Adjacency List Pattern

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Create adjacency keys for graph relationships
const { pk, sk } = PatternHelpers.adjacencyKeys('USER#123', 'ORDER#456')
// Returns: { pk: 'USER#123', sk: 'ORDER#456' }

// Query all relationships for a node
// pk = 'USER#123' returns all outgoing edges
```

#### Hot Partition Prevention

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Distribute keys across shards
const key = PatternHelpers.distributedKey('POPULAR_ITEM', 10)
// Returns: 'POPULAR_ITEM#SHARD#7' (random shard 0-9)

// Extract shard number
const shard = PatternHelpers.getShardNumber('POPULAR_ITEM#SHARD#7')
// Returns: 7

// Query all shards
for (let i = 0; i < 10; i++) {
  const shardKey = `POPULAR_ITEM#SHARD#${i}`
  // Query each shard
}
```

#### GSI Keys

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Create GSI key
const gsiKey = PatternHelpers.gsiKey('GSI1', 'STATUS', 'ACTIVE')
// Returns: 'GSI1#STATUS#ACTIVE'

// Sparse index value (only set when condition is true)
const value = PatternHelpers.sparseIndexValue(emailVerified, 'VERIFIED#USER')
// Returns: 'VERIFIED#USER' if emailVerified is true, undefined otherwise
```

### Multi-Attribute Key Helpers

DynamoDB supports multi-attribute composite keys in GSIs (up to 4 attributes per key). This eliminates the need for manual string concatenation and preserves native data types.

#### Multi-Tenant Keys

```typescript
import { multiTenantKey } from '@ddb-lib/core'

// Create multi-tenant partition key
const key = multiTenantKey('TENANT-1', 'CUST-123')
// Returns: ['TENANT-1', 'CUST-123']

// With department
const key = multiTenantKey('TENANT-1', 'CUST-123', 'DEPT-A')
// Returns: ['TENANT-1', 'CUST-123', 'DEPT-A']
```

#### Hierarchical Multi-Keys

```typescript
import { hierarchicalMultiKey } from '@ddb-lib/core'

// Create hierarchical key
const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco')
// Returns: ['USA', 'CA', 'San Francisco']

// Partial hierarchy
const key = hierarchicalMultiKey('USA', 'CA')
// Returns: ['USA', 'CA']
```

#### Time-Series Multi-Keys

```typescript
import { timeSeriesMultiKey } from '@ddb-lib/core'

// Create time-series key with category
const key = timeSeriesMultiKey('ORDERS', new Date('2025-12-03'))
// Returns: ['ORDERS', 1733241600000]

// With subcategory
const key = timeSeriesMultiKey('ORDERS', new Date('2025-12-03'), 'ELECTRONICS')
// Returns: ['ORDERS', 1733241600000, 'ELECTRONICS']
```

#### Location Multi-Keys

```typescript
import { locationMultiKey } from '@ddb-lib/core'

// Create location-based key
const key = locationMultiKey('USA', 'CA', 'San Francisco')
// Returns: ['USA', 'CA', 'San Francisco']

// Country only
const key = locationMultiKey('USA')
// Returns: ['USA']
```

#### Generic Multi-Attribute Keys

```typescript
import { multiAttributeKey } from '@ddb-lib/core'

// Create custom multi-attribute key
const key = multiAttributeKey(['tenant1', 'customer123', 'order456'])
// Returns: ['tenant1', 'customer123', 'order456']

// With numbers
const key = multiAttributeKey(['category', 1733241600000, 'subcategory'])
// Returns: ['category', 1733241600000, 'subcategory']
```

### Expression Builders

Type-safe builders for DynamoDB expressions.

#### Key Condition Builder

```typescript
import { KeyConditionBuilder } from '@ddb-lib/core'

// Equality
const condition = new KeyConditionBuilder('sk').eq('PROFILE').build()

// Begins with
const condition = new KeyConditionBuilder('sk').beginsWith('ORDER#').build()

// Between
const condition = new KeyConditionBuilder('sk')
  .between('2025-01-01', '2025-12-31')
  .build()

// Comparison operators
const condition = new KeyConditionBuilder('sk').gte('ORDER#1000').build()
```

#### Filter Expression Builder

```typescript
import { FilterExpressionBuilder } from '@ddb-lib/core'

// Build filter expression
const builder = new FilterExpressionBuilder()
  .eq('status', 'ACTIVE')
  .gte('age', 18)
  .exists('email')

const { expression, values } = builder.build()
// expression: 'status = :status AND age >= :age AND attribute_exists(email)'
// values: { ':status': 'ACTIVE', ':age': 18 }
```

#### Condition Expression Builder

```typescript
import { ConditionExpressionBuilder } from '@ddb-lib/core'

// Build condition expression
const builder = new ConditionExpressionBuilder()
  .attributeNotExists('pk')
  .eq('version', 1)

const { expression, values } = builder.build()
// expression: 'attribute_not_exists(pk) AND version = :version'
// values: { ':version': 1 }
```

### Type Guards

Runtime type checking utilities.

```typescript
import {
  isMultiAttributeKey,
  hasMultiAttributePartitionKey,
  hasMultiAttributeSortKey
} from '@ddb-lib/core'

// Check if value is a multi-attribute key
if (isMultiAttributeKey(key)) {
  console.log('Multi-attribute key with', key.attributes.length, 'attributes')
}

// Check if config has multi-attribute partition key
if (hasMultiAttributePartitionKey(gsiConfig)) {
  // Handle multi-attribute partition key
}

// Check if config has multi-attribute sort key
if (hasMultiAttributeSortKey(gsiConfig)) {
  // Handle multi-attribute sort key
}
```

## API Reference

### PatternHelpers

Static utility class for common DynamoDB patterns.

#### Methods

- `entityKey(entityType: string, id: string): string`
- `parseEntityKey(key: string): { entityType: string; id: string }`
- `compositeKey(parts: string[], separator?: string): string`
- `parseCompositeKey(key: string, separator?: string): string[]`
- `timeSeriesKey(timestamp: Date, granularity: 'hour' | 'day' | 'month'): string`
- `ttlTimestamp(expiresAt: Date): number`
- `hierarchicalKey(path: string[]): string`
- `parseHierarchicalKey(key: string): string[]`
- `adjacencyKeys(sourceId: string, targetId: string): { pk: string; sk: string }`
- `distributedKey(baseKey: string, shardCount: number): string`
- `getShardNumber(key: string): number`
- `gsiKey(indexName: string, entityType: string, value: string): string`
- `sparseIndexValue(condition: boolean, value: string): string | undefined`

### Multi-Attribute Key Functions

- `multiAttributeKey(values: Array<string | number | Uint8Array>): Array<string | number | Uint8Array>`
- `multiTenantKey(tenantId: string, customerId: string, departmentId?: string): string[]`
- `hierarchicalMultiKey(level1: string, level2?: string, level3?: string, level4?: string): string[]`
- `timeSeriesMultiKey(category: string, timestamp: Date, subcategory?: string): Array<string | number>`
- `locationMultiKey(country: string, state?: string, city?: string, district?: string): string[]`

### Expression Builders

#### KeyConditionBuilder

- `eq(value: any): this`
- `lt(value: any): this`
- `lte(value: any): this`
- `gt(value: any): this`
- `gte(value: any): this`
- `between(start: any, end: any): this`
- `beginsWith(prefix: string): this`
- `build(): string`

#### FilterExpressionBuilder

- `eq(attribute: string, value: any): this`
- `ne(attribute: string, value: any): this`
- `lt(attribute: string, value: any): this`
- `lte(attribute: string, value: any): this`
- `gt(attribute: string, value: any): this`
- `gte(attribute: string, value: any): this`
- `between(attribute: string, start: any, end: any): this`
- `in(attribute: string, values: any[]): this`
- `exists(attribute: string): this`
- `notExists(attribute: string): this`
- `contains(attribute: string, value: any): this`
- `beginsWith(attribute: string, prefix: string): this`
- `attributeType(attribute: string, type: string): this`
- `build(): { expression: string; values: Record<string, any> }`

#### ConditionExpressionBuilder

- `attributeExists(attribute: string): this`
- `attributeNotExists(attribute: string): this`
- `eq(attribute: string, value: any): this`
- `ne(attribute: string, value: any): this`
- `lt(attribute: string, value: any): this`
- `lte(attribute: string, value: any): this`
- `gt(attribute: string, value: any): this`
- `gte(attribute: string, value: any): this`
- `between(attribute: string, start: any, end: any): this`
- `build(): { expression: string; values: Record<string, any> }`

### Type Guards

- `isMultiAttributeKey(key: any): key is MultiAttributeKey`
- `hasMultiAttributePartitionKey(config: any): boolean`
- `hasMultiAttributeSortKey(config: any): boolean`

## Types

```typescript
interface MultiAttributeKey {
  attributes: Array<{
    name: string
    type: 'string' | 'number' | 'binary'
  }>
}

interface Key {
  pk: string | number | Uint8Array
  sk?: string | number | Uint8Array
}

interface KeyCondition {
  pk?: string | number | Uint8Array
  sk?: string | number | Uint8Array | KeyConditionOperators
  multiPk?: Array<string | number | Uint8Array>
  multiSk?: Array<string | number | Uint8Array> | MultiKeyConditionOperators
}
```

## Best Practices

### 1. Use Entity Keys for Single-Table Design

```typescript
// Good: Clear entity type prefix
const userKey = PatternHelpers.entityKey('USER', userId)
const orderKey = PatternHelpers.entityKey('ORDER', orderId)

// Avoid: Manual concatenation
const userKey = `USER#${userId}` // Less maintainable
```

### 2. Prefer Multi-Attribute Keys Over Concatenation

```typescript
// Good: Native multi-attribute key
const key = multiTenantKey(tenantId, customerId)

// Avoid: String concatenation
const key = `${tenantId}#${customerId}` // Loses type information
```

### 3. Use Time-Series Keys for Temporal Data

```typescript
// Good: Standardized time format
const key = PatternHelpers.timeSeriesKey(date, 'day')

// Avoid: Custom date formatting
const key = date.toISOString().split('T')[0] // Less consistent
```

### 4. Distribute Hot Partitions

```typescript
// Good: Distribute popular items
const key = PatternHelpers.distributedKey('TRENDING_ITEM', 10)

// Then query all shards
for (let i = 0; i < 10; i++) {
  await query({ pk: `TRENDING_ITEM#SHARD#${i}` })
}
```

### 5. Use Expression Builders for Type Safety

```typescript
// Good: Type-safe builder
const builder = new FilterExpressionBuilder()
  .eq('status', 'ACTIVE')
  .gte('age', 18)

// Avoid: Manual string construction
const expression = 'status = :status AND age >= :age' // Error-prone
```

## Examples

See the [examples directory](../../examples) for complete working examples:

- [Basic CRUD with Pattern Helpers](../../examples/standalone/basic-crud.ts)
- [Single-Table Design](../../examples/standalone/single-table-design.ts)
- [Amplify with Pattern Helpers](../../examples/amplify/pattern-helpers.ts)

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0

## License

MIT
