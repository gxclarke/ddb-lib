---
title: @ddb-lib/core API
description: Core utilities and pattern helpers for DynamoDB
---

# @ddb-lib/core API reference

Core utilities for implementing DynamoDB patterns and best practices. This package provides pure utility functions with no external dependencies.

## Installation

```bash
npm install @ddb-lib/core
```

## Overview

The `@ddb-lib/core` package provides:

- **PatternHelpers** - Functions for common DynamoDB patterns
- **Multi-Attribute Key Helpers** - Functions for creating complex composite keys
- **Expression Builders** - Type-safe builders for DynamoDB expressions
- **Type Guards** - Runtime type validation utilities
- **Validators** - Key and configuration validation

## Quick start

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Create entity keys
const userKey = PatternHelpers.entityKey('USER', '123')
// Returns: 'USER#123'

// Create composite keys
const orderKey = PatternHelpers.compositeKey(['ORDER', userId, orderId])
// Returns: 'ORDER#123#456'

// Create time-series keys
const tsKey = PatternHelpers.timeSeriesKey(new Date(), 'day')
// Returns: '2024-12-03'

// Create distributed keys for hot partition prevention
const shardedKey = PatternHelpers.distributedKey('ACTIVE_USERS', 10)
// Returns: 'ACTIVE_USERS#SHARD_7' (random shard 0-9)
```

## PatternHelpers class

Static utility class for implementing DynamoDB patterns.

### Compositekey()

Create a composite key from multiple parts.

```typescript
static compositeKey(parts: string[], separator = '#'): string
```

**Parameters:**
- `parts` - Array of key parts to combine
- `separator` - Separator character (default: '#')

**Returns:** Composite key string

**Example:**
```typescript
const key = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])
// Returns: 'USER#123#ORDER#456'

// Custom separator
const key = PatternHelpers.compositeKey(['A', 'B', 'C'], '|')
// Returns: 'A|B|C'
```

**Throws:** Error if parts array is empty or if any part contains the separator

---

### Parsecompositekey()

Parse a composite key into its component parts.

```typescript
static parseCompositeKey(key: string, separator = '#'): string[]
```

**Parameters:**
- `key` - Composite key string
- `separator` - Separator character (default: '#')

**Returns:** Array of key parts

**Example:**
```typescript
const parts = PatternHelpers.parseCompositeKey('USER#123#ORDER#456')
// Returns: ['USER', '123', 'ORDER', '456']
```

---

### Entitykey()

Create an entity key with type prefix for single-table design.

```typescript
static entityKey(entityType: string, id: string): string
```

**Parameters:**
- `entityType` - Type of entity (e.g., 'USER', 'ORDER', 'PRODUCT')
- `id` - Entity identifier

**Returns:** Entity key string

**Example:**
```typescript
const userKey = PatternHelpers.entityKey('USER', '123')
// Returns: 'USER#123'

const orderKey = PatternHelpers.entityKey('ORDER', 'abc-def')
// Returns: 'ORDER#abc-def'
```

**Use Cases:**
- Single-table design with multiple entity types
- Type-safe entity identification
- Human-readable keys for debugging

---

### Parseentitykey()

Parse an entity key to extract type and ID.

```typescript
static parseEntityKey(key: string): { entityType: string; id: string }
```

**Parameters:**
- `key` - Entity key string

**Returns:** Object with `entityType` and `id` properties

**Example:**
```typescript
const parsed = PatternHelpers.parseEntityKey('USER#123')
// Returns: { entityType: 'USER', id: '123' }

const parsed = PatternHelpers.parseEntityKey('ORDER#abc-def')
// Returns: { entityType: 'ORDER', id: 'abc-def' }
```

---

### Timeserieskey()

Create a time-series key from a date with specified granularity.

```typescript
static timeSeriesKey(
  timestamp: Date,
  granularity: 'hour' | 'day' | 'month'
): string
```

**Parameters:**
- `timestamp` - Date object
- `granularity` - Time granularity ('hour', 'day', or 'month')

**Returns:** Time-series key string

**Example:**
```typescript
const date = new Date('2024-12-02T15:30:00')

PatternHelpers.timeSeriesKey(date, 'hour')
// Returns: '2024-12-02-15'

PatternHelpers.timeSeriesKey(date, 'day')
// Returns: '2024-12-02'

PatternHelpers.timeSeriesKey(date, 'month')
// Returns: '2024-12'
```

**Use Cases:**
- Time-series data storage
- Log aggregation by time period
- Metrics collection

---

### Ttltimestamp()

Convert a Date to a TTL timestamp (Unix epoch in seconds).

```typescript
static ttlTimestamp(expiresAt: Date): number
```

**Parameters:**
- `expiresAt` - Date when the item should expire

**Returns:** Unix timestamp in seconds

**Example:**
```typescript
const expiryDate = new Date('2024-12-31T23:59:59')
const ttl = PatternHelpers.ttlTimestamp(expiryDate)
// Returns: 1735689599

// Use in DynamoDB item
await table.put({
  pk: 'SESSION#123',
  sk: 'DATA',
  ttl: PatternHelpers.ttlTimestamp(new Date(Date.now() + 3600000)) // 1 hour
})
```

---

### Adjacencykeys()

Create adjacency list keys for relationship patterns.

```typescript
static adjacencyKeys(
  sourceId: string,
  targetId: string
): { pk: string; sk: string }
```

**Parameters:**
- `sourceId` - Source entity ID
- `targetId` - Target entity ID

**Returns:** Object with `pk` and `sk` for the relationship

**Example:**
```typescript
const keys = PatternHelpers.adjacencyKeys('USER#123', 'ORDER#456')
// Returns: { pk: 'USER#123', sk: 'ORDER#456' }

// Store relationship
await table.put({
  ...keys,
  relationshipType: 'OWNS',
  createdAt: Date.now()
})
```

**Use Cases:**
- Graph-like relationships
- Many-to-many relationships
- Social networks (followers, friends)

---

### Hierarchicalkey()

Create a hierarchical key from a path array.

```typescript
static hierarchicalKey(path: string[]): string
```

**Parameters:**
- `path` - Array of path segments

**Returns:** Hierarchical key string

**Example:**
```typescript
const key = PatternHelpers.hierarchicalKey(['root', 'folder1', 'subfolder', 'item'])
// Returns: 'root/folder1/subfolder/item'

// Query all items in a folder
const results = await table.query({
  keyCondition: {
    pk: 'FILES',
    sk: { beginsWith: 'root/folder1/' }
  }
})
```

---

### Parsehierarchicalkey()

Parse a hierarchical key into its path components.

```typescript
static parseHierarchicalKey(key: string): string[]
```

**Parameters:**
- `key` - Hierarchical key string

**Returns:** Array of path segments

**Example:**
```typescript
const path = PatternHelpers.parseHierarchicalKey('root/folder1/subfolder/item')
// Returns: ['root', 'folder1', 'subfolder', 'item']
```

---

### Distributedkey()

Create a distributed key with shard suffix for write sharding.

```typescript
static distributedKey(baseKey: string, shardCount: number): string
```

**Parameters:**
- `baseKey` - Base partition key
- `shardCount` - Number of shards to distribute across

**Returns:** Distributed key with random shard suffix

**Example:**
```typescript
const key = PatternHelpers.distributedKey('POPULAR_ITEM', 10)
// Returns: 'POPULAR_ITEM#SHARD_7' (random shard 0-9)

// Write to random shard
await table.put({
  pk: PatternHelpers.distributedKey('ACTIVE_USERS', 10),
  sk: `USER#${userId}`,
  ...userData
})

// Query all shards
const allUsers = []
for (let i = 0; i < 10; i++) {
  const result = await table.query({
    keyCondition: { pk: `ACTIVE_USERS#SHARD_${i}` }
  })
  allUsers.push(...result.items)
}
```

**Use Cases:**
- Preventing hot partitions
- High-traffic write scenarios
- Popular items or trending content

---

### Getshardnumber()

Extract the shard number from a distributed key.

```typescript
static getShardNumber(key: string): number | null
```

**Parameters:**
- `key` - Distributed key string

**Returns:** Shard number, or null if not a distributed key

**Example:**
```typescript
PatternHelpers.getShardNumber('POPULAR_ITEM#SHARD_7')
// Returns: 7

PatternHelpers.getShardNumber('REGULAR_KEY')
// Returns: null
```

---

### Versionattribute()

Get the standard attribute name for version tracking.

```typescript
static versionAttribute(): string
```

**Returns:** Standard version attribute name ('version')

**Example:**
```typescript
const versionAttr = PatternHelpers.versionAttribute()
// Returns: 'version'
```

---

### Incrementversion()

Increment a version number for optimistic locking.

```typescript
static incrementVersion(currentVersion: number): number
```

**Parameters:**
- `currentVersion` - Current version number

**Returns:** Incremented version number

**Example:**
```typescript
const newVersion = PatternHelpers.incrementVersion(1)
// Returns: 2

// Use with optimistic locking
await table.update({
  pk: 'USER#123',
  sk: 'PROFILE',
  updates: {
    name: 'New Name',
    version: PatternHelpers.incrementVersion(currentVersion)
  },
  condition: {
    version: { eq: currentVersion }
  }
})
```

---

### Sparseindexvalue()

Create a sparse index value conditionally.

```typescript
static sparseIndexValue(condition: boolean, value: string): string | undefined
```

**Parameters:**
- `condition` - Boolean condition to check
- `value` - Value to return if condition is true

**Returns:** Value if condition is true, undefined otherwise

**Example:**
```typescript
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  email: 'user@example.com',
  emailVerified: true,
  // Only appears in GSI if email is verified
  gsi1pk: PatternHelpers.sparseIndexValue(emailVerified, 'VERIFIED#USER')
})

// Query only verified users
const verified = await table.query({
  indexName: 'GSI1',
  keyCondition: { gsi1pk: 'VERIFIED#USER' }
})
```

**Use Cases:**
- Sparse GSIs for filtered queries
- Conditional index inclusion
- Status-based filtering

---

### Gsikey()

Create a GSI key for GSI overloading pattern.

```typescript
static gsiKey(indexName: string, entityType: string, value: string): string
```

**Parameters:**
- `indexName` - Name of the GSI (for documentation)
- `entityType` - Type of entity
- `value` - Value for the key

**Returns:** GSI key string

**Example:**
```typescript
// Multiple entity types in same GSI
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  gsi1pk: PatternHelpers.gsiKey('GSI1', 'USER', 'active'),
  gsi1sk: 'USER#123'
})

await table.put({
  pk: 'ORDER#456',
  sk: 'METADATA',
  gsi1pk: PatternHelpers.gsiKey('GSI1', 'ORDER', 'pending'),
  gsi1sk: 'ORDER#456'
})
```

## Multi-attribute key helpers

Functions for creating complex composite keys with multiple attributes.

### Multiattributekey()

Create a multi-attribute key value array.

```typescript
function multiAttributeKey(
  ...values: Array<string | number | Uint8Array>
): Array<string | number | Uint8Array>
```

**Parameters:**
- `values` - Variable number of values for the key

**Returns:** Array of key values

**Example:**
```typescript
import { multiAttributeKey } from '@ddb-lib/core'

const key = multiAttributeKey('TENANT-123', 'CUSTOMER-456', 'DEPT-A')
// Returns: ['TENANT-123', 'CUSTOMER-456', 'DEPT-A']
```

---

### Multitenantkey()

Create a multi-tenant partition key.

```typescript
function multiTenantKey(
  tenantId: string,
  customerId: string,
  departmentId?: string
): Array<string>
```

**Parameters:**
- `tenantId` - Tenant identifier
- `customerId` - Customer identifier
- `departmentId` - Optional department identifier

**Returns:** Array of key values

**Example:**
```typescript
import { multiTenantKey } from '@ddb-lib/core'

// Two-level key
const key = multiTenantKey('TENANT-123', 'CUSTOMER-456')
// Returns: ['TENANT-123', 'CUSTOMER-456']

// Three-level key with department
const key = multiTenantKey('TENANT-123', 'CUSTOMER-456', 'DEPT-A')
// Returns: ['TENANT-123', 'CUSTOMER-456', 'DEPT-A']
```

---

### Hierarchicalmultikey()

Create a hierarchical multi-attribute key.

```typescript
function hierarchicalMultiKey(
  level1: string,
  level2?: string,
  level3?: string,
  level4?: string
): Array<string>
```

**Parameters:**
- `level1` - First level of hierarchy (required)
- `level2` - Second level (optional)
- `level3` - Third level (optional)
- `level4` - Fourth level (optional)

**Returns:** Array of key values

**Example:**
```typescript
import { hierarchicalMultiKey } from '@ddb-lib/core'

// Full hierarchy
const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco', 'Downtown')
// Returns: ['USA', 'CA', 'San Francisco', 'Downtown']

// Partial hierarchy
const key = hierarchicalMultiKey('USA', 'CA')
// Returns: ['USA', 'CA']
```

---

### Timeseriesmultikey()

Create a time-series multi-attribute key.

```typescript
function timeSeriesMultiKey(
  category: string,
  timestamp: Date | number,
  subcategory?: string
): Array<string | number>
```

**Parameters:**
- `category` - Primary category
- `timestamp` - Unix timestamp or Date object
- `subcategory` - Optional subcategory

**Returns:** Array of key values

**Example:**
```typescript
import { timeSeriesMultiKey } from '@ddb-lib/core'

const key = timeSeriesMultiKey('ERROR', new Date('2024-12-02'))
// Returns: ['ERROR', 1733097600000]

// With subcategory
const key = timeSeriesMultiKey('ERROR', 1733097600000, 'DATABASE')
// Returns: ['ERROR', 1733097600000, 'DATABASE']
```

---

### Locationmultikey()

Create a location-based multi-attribute key.

```typescript
function locationMultiKey(
  country: string,
  state?: string,
  city?: string,
  district?: string
): Array<string>
```

**Parameters:**
- `country` - Country code or name
- `state` - State or province (optional)
- `city` - City name (optional)
- `district` - District (optional)

**Returns:** Array of location values

**Example:**
```typescript
import { locationMultiKey } from '@ddb-lib/core'

const key = locationMultiKey('USA', 'CA', 'San Francisco', 'SOMA')
// Returns: ['USA', 'CA', 'San Francisco', 'SOMA']
```

---

### Productcategorymultikey()

Create a product categorization multi-attribute key.

```typescript
function productCategoryMultiKey(
  category: string,
  subcategory?: string,
  brand?: string,
  productLine?: string
): Array<string>
```

**Parameters:**
- `category` - Top-level category
- `subcategory` - Subcategory (optional)
- `brand` - Brand name (optional)
- `productLine` - Product line (optional)

**Returns:** Array of categorization values

**Example:**
```typescript
import { productCategoryMultiKey } from '@ddb-lib/core'

const key = productCategoryMultiKey('Electronics', 'Laptops', 'Apple', 'MacBook Pro')
// Returns: ['Electronics', 'Laptops', 'Apple', 'MacBook Pro']
```

---

### Statusprioritymultikey()

Create a status and priority multi-attribute key.

```typescript
function statusPriorityMultiKey(
  status: string,
  priority: number | string,
  assignee?: string
): Array<string | number>
```

**Parameters:**
- `status` - Status value
- `priority` - Priority level
- `assignee` - Optional assignee (optional)

**Returns:** Array of status/priority values

**Example:**
```typescript
import { statusPriorityMultiKey } from '@ddb-lib/core'

const key = statusPriorityMultiKey('PENDING', 1)
// Returns: ['PENDING', 1]

// With assignee
const key = statusPriorityMultiKey('ACTIVE', 2, 'USER-123')
// Returns: ['ACTIVE', 2, 'USER-123']
```

---

### Versionmultikey()

Create a version-based multi-attribute key.

```typescript
function versionMultiKey(
  major: number,
  minor?: number,
  patch?: number,
  build?: string | number
): Array<number | string>
```

**Parameters:**
- `major` - Major version number
- `minor` - Minor version (optional)
- `patch` - Patch version (optional)
- `build` - Build number (optional)

**Returns:** Array of version values

**Example:**
```typescript
import { versionMultiKey } from '@ddb-lib/core'

const key = versionMultiKey(2, 1, 5)
// Returns: [2, 1, 5]

// With build
const key = versionMultiKey(2, 1, 5, 'beta-3')
// Returns: [2, 1, 5, 'beta-3']
```

## Related resources

- [Pattern Helpers Guide](../../guides/multi-attribute-keys/)
- [Patterns Documentation](../../patterns/)
- [Best Practices](../../best-practices/)
- [Examples](../../examples/)

