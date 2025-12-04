---
title: Key Design
description: Design partition and sort keys to support efficient access patterns and prevent hot partitions
---

# Key design: foundation of DynamoDB performance

## The practice

**Design your partition and sort keys to support your access patterns efficiently. Good key design is the foundation of DynamoDB performance, cost efficiency, and scalability.**

Unlike relational databases where you can add indexes later, DynamoDB key design must be planned upfront based on your access patterns. The right key design enables efficient queries, prevents hot partitions, and supports your application's growth.

## Why it matters

### Performance
- Efficient queries depend on proper key design
- Poor key design forces expensive scans
- Hot partitions cause throttling and slow responses

### Cost
- Well-designed keys enable efficient queries (lower RCU)
- Avoid scans that consume excessive capacity
- Reduce need for additional GSIs

### Scalability
- Proper partition key distribution enables horizontal scaling
- Prevents hot partition bottlenecks
- Supports growing data and traffic

## Key design principles

### Principle 1: design for access patterns

```typescript
// ❌ Bad: Design keys based on data structure
// pk: userId, sk: timestamp
// Doesn't support common queries

// ✅ Good: Design keys based on how you'll query
// Access pattern: "Get user's orders"
// pk: USER#<userId>, sk: ORDER#<orderId>

// Access pattern: "Get user's recent orders"
// pk: USER#<userId>, sk: ORDER#<timestamp>#<orderId>
```

### Principle 2: distribute partition keys evenly

```typescript
// ❌ Bad: Low cardinality partition key
// pk: status (only 3 values: ACTIVE, PENDING, DELETED)
// All active users in one partition = hot partition!

// ✅ Good: High cardinality partition key
// pk: USER#<userId>
// Each user is a separate partition = even distribution
```

### Principle 3: use composite sort keys

```typescript
// ❌ Bad: Single-purpose sort key
// sk: orderId
// Can only sort by order ID

// ✅ Good: Composite sort key
// sk: ORDER#<timestamp>#<orderId>
// Can query by time range AND maintain uniqueness
```

### Principle 4: make keys human-readable

```typescript
// ❌ Bad: Opaque keys
// pk: "a1b2c3d4", sk: "x9y8z7"
// Hard to debug and understand

// ✅ Good: Self-documenting keys
// pk: "USER#123", sk: "ORDER#2024-01-15#abc"
// Clear what entity and relationship
```

## Common key design patterns

### Pattern 1: entity keys

Use entity type prefixes for single-table design:

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Users
const userKey = PatternHelpers.entityKey('USER', '123')
// Returns: 'USER#123'

// Orders
const orderKey = PatternHelpers.entityKey('ORDER', 'abc')
// Returns: 'ORDER#abc'

// Products
const productKey = PatternHelpers.entityKey('PRODUCT', 'xyz')
// Returns: 'PRODUCT#xyz'

// Store in table
await table.put({
  item: {
    pk: userKey,
    sk: 'PROFILE',
    name: 'Alice',
    email: 'alice@example.com'
  }
})
```

### Pattern 2: hierarchical keys

Model one-to-many relationships:

```typescript
// User and their orders
// pk: USER#<userId>, sk: ORDER#<orderId>

await table.put({
  item: {
    pk: 'USER#123',
    sk: 'ORDER#abc',
    total: 99.99,
    status: 'PENDING'
  }
})

// Query all orders for a user
const orders = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})
```

### Pattern 3: composite keys

Combine multiple attributes in sort key:

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Composite sort key: type + timestamp + id
const sk = PatternHelpers.compositeKey([
  'ORDER',
  '2024-01-15T10:30:00Z',
  'abc123'
])
// Returns: 'ORDER#2024-01-15T10:30:00Z#abc123'

// Store item
await table.put({
  item: {
    pk: 'USER#123',
    sk: sk,
    total: 99.99
  }
})

// Query orders in time range
const recentOrders = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { 
      between: [
        'ORDER#2024-01-01',
        'ORDER#2024-01-31'
      ]
    }
  }
})
```

### Pattern 4: inverted index

Support bidirectional queries:

```typescript
// Main table: User -> Orders
await table.put({
  item: {
    pk: 'USER#123',
    sk: 'ORDER#abc',
    orderId: 'abc',
    total: 99.99
  }
})

// GSI: Order -> User (inverted)
// GSI pk: ORDER#abc, GSI sk: USER#123
// Now can query: "Which user owns this order?"

const user = await table.query({
  indexName: 'InvertedIndex',
  keyCondition: {
    gsi1pk: 'ORDER#abc'
  }
})
```

### Pattern 5: time-series keys

Optimize for time-based queries:

```typescript
// Sort key with timestamp prefix
const sk = `METRIC#${Date.now()}#${metricId}`

await table.put({
  item: {
    pk: 'SENSOR#123',
    sk: sk,
    temperature: 72.5,
    humidity: 45
  }
})

// Query recent metrics
const recentMetrics = await table.query({
  keyCondition: {
    pk: 'SENSOR#123',
    sk: { 
      beginsWith: 'METRIC#',
      gt: `METRIC#${Date.now() - 3600000}` // Last hour
    }
  }
})
```

## Preventing hot partitions

### Problem: low cardinality keys

```typescript
// ❌ Bad: Status as partition key
// Only 3 possible values = 3 partitions
await table.put({
  item: {
    pk: 'STATUS#ACTIVE',  // Millions of users here!
    sk: `USER#${userId}`,
    ...userData
  }
})

// All active users in one partition = hot partition
```

### Solution 1: use high cardinality keys

```typescript
// ✅ Good: User ID as partition key
await table.put({
  item: {
    pk: `USER#${userId}`,  // Each user is separate partition
    sk: 'PROFILE',
    status: 'ACTIVE',
    ...userData
  }
})

// Query by status using GSI
// GSI pk: status, GSI sk: userId
```

### Solution 2: distribute with sharding

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Distribute across multiple partitions
const shardCount = 10
const pk = PatternHelpers.distributedKey('STATUS#ACTIVE', shardCount)
// Returns: 'STATUS#ACTIVE#SHARD#7' (random 0-9)

await table.put({
  item: {
    pk: pk,
    sk: `USER#${userId}`,
    ...userData
  }
})

// Query all shards when needed
const allActiveUsers = []
for (let i = 0; i < shardCount; i++) {
  const results = await table.query({
    keyCondition: {
      pk: `STATUS#ACTIVE#SHARD#${i}`
    }
  })
  allActiveUsers.push(...results.items)
}
```

### Solution 3: write sharding

```typescript
// For write-heavy workloads, shard writes
const writeShardCount = 100
const writeShard = Math.floor(Math.random() * writeShardCount)

await table.put({
  item: {
    pk: `EVENTS#${writeShard}`,
    sk: `EVENT#${Date.now()}#${eventId}`,
    ...eventData
  }
})

// Read from all shards (or use GSI)
```

## Multi-attribute keys

For complex queries, use multi-attribute keys:

```typescript
import { 
  createMultiAttributeKey,
  parseMultiAttributeKey 
} from '@ddb-lib/core'

// Create composite key from multiple attributes
const pk = createMultiAttributeKey({
  country: 'US',
  state: 'CA',
  city: 'SF'
})
// Returns: 'US#CA#SF'

// Store item
await table.put({
  item: {
    pk: pk,
    sk: `STORE#${storeId}`,
    ...storeData
  }
})

// Query all stores in California
const caStores = await table.query({
  keyCondition: {
    pk: { beginsWith: 'US#CA#' }
  }
})

// Parse key back to attributes
const { country, state, city } = parseMultiAttributeKey(pk)
```

## GSI key design

Design GSI keys to support additional access patterns:

```typescript
// Main table: User-centric
// pk: USER#<userId>, sk: ORDER#<orderId>

// GSI 1: Query by order status
// gsi1pk: STATUS#<status>, gsi1sk: ORDER#<timestamp>#<orderId>

// GSI 2: Query by product
// gsi2pk: PRODUCT#<productId>, gsi2sk: ORDER#<orderId>

await table.put({
  item: {
    // Main table keys
    pk: 'USER#123',
    sk: 'ORDER#abc',
    
    // GSI 1 keys
    gsi1pk: 'STATUS#PENDING',
    gsi1sk: 'ORDER#2024-01-15#abc',
    
    // GSI 2 keys
    gsi2pk: 'PRODUCT#xyz',
    gsi2sk: 'ORDER#abc',
    
    // Data
    total: 99.99,
    status: 'PENDING'
  }
})

// Query pending orders (GSI 1)
const pendingOrders = await table.query({
  indexName: 'StatusIndex',
  keyCondition: {
    gsi1pk: 'STATUS#PENDING'
  }
})

// Query orders for a product (GSI 2)
const productOrders = await table.query({
  indexName: 'ProductIndex',
  keyCondition: {
    gsi2pk: 'PRODUCT#xyz'
  }
})
```

## Key design anti-patterns

### ❌ anti-pattern 1: using timestamps as partition keys

```typescript
// Bad: Timestamp as partition key
await table.put({
  item: {
    pk: new Date().toISOString().split('T')[0], // '2024-01-15'
    sk: `EVENT#${eventId}`,
    ...eventData
  }
})

// Problem: All today's events in one partition = hot partition
// Solution: Use entity ID as pk, timestamp in sk
```

### ❌ anti-pattern 2: sequential ids as partition keys

```typescript
// Bad: Sequential IDs
await table.put({
  item: {
    pk: `ORDER#${sequentialId}`, // 1, 2, 3, 4...
    sk: 'DETAILS',
    ...orderData
  }
})

// Problem: Recent orders cluster in same partition
// Solution: Use UUIDs or hash-based distribution
```

### ❌ anti-pattern 3: concatenating without delimiters

```typescript
// Bad: No delimiters
const pk = `${userId}${orderId}` // '123abc' - ambiguous!

// Good: Use delimiters
const pk = `USER#${userId}#ORDER#${orderId}` // 'USER#123#ORDER#abc'
```

### ❌ anti-pattern 4: overly complex keys

```typescript
// Bad: Too many components
const sk = `${type}#${subtype}#${category}#${subcategory}#${timestamp}#${id}#${version}`

// Good: Only what's needed for queries
const sk = `${type}#${timestamp}#${id}`
```

## Key design checklist

When designing keys, ask yourself:

1. **Access patterns**
   - [ ] Do my keys support all required queries?
   - [ ] Can I query efficiently without scans?
   - [ ] Do I need GSIs for additional patterns?

2. **Distribution**
   - [ ] Are partition keys evenly distributed?
   - [ ] Will any partition become hot?
   - [ ] Do I need sharding for high-traffic keys?

3. **Scalability**
   - [ ] Will key design work at 10x scale?
   - [ ] Are there cardinality limits?
   - [ ] Can I add new access patterns later?

4. **Maintainability**
   - [ ] Are keys human-readable?
   - [ ] Is the pattern documented?
   - [ ] Can developers understand the design?

## Refactoring key design

If you need to change key design:

### Strategy 1: dual write

```typescript
// Write to both old and new key structures
await Promise.all([
  // Old structure
  table.put({
    item: {
      pk: oldPk,
      sk: oldSk,
      ...data
    }
  }),
  // New structure
  table.put({
    item: {
      pk: newPk,
      sk: newSk,
      ...data
    }
  })
])

// Gradually migrate reads to new structure
// Once complete, stop writing to old structure
```

### Strategy 2: migration script

```typescript
// Scan old items and write with new keys
const oldItems = await table.scan({})

for (const item of oldItems.items) {
  const newPk = convertToNewPk(item.pk)
  const newSk = convertToNewSk(item.sk)
  
  await table.put({
    item: {
      ...item,
      pk: newPk,
      sk: newSk
    }
  })
}
```

## Monitoring key distribution

Check for hot partitions:

```typescript
import { StatsCollector, AntiPatternDetector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const detector = new AntiPatternDetector(stats)

// After operations
const hotPartitions = detector.detectHotPartitions()

for (const issue of hotPartitions) {
  console.log(`Hot partition detected: ${issue.partitionKey}`)
  console.log(`Traffic: ${issue.percentage}% of total`)
  console.log(`Recommendation: ${issue.recommendation}`)
}
```

## Key takeaways

1. **Design for access patterns** - keys must support your queries
2. **Distribute evenly** - high cardinality prevents hot partitions
3. **Use composite keys** - support multiple query patterns
4. **Make keys readable** - self-documenting keys aid debugging
5. **Plan for scale** - design works at 10x, 100x growth

## Related best practices

- [Query vs scan](query-vs-scan.md) - Efficient queries depend on good keys
- [Capacity planning](capacity-planning.md) - Key design affects capacity needs
- [Conditional writes](conditional-writes.md) - Use keys in conditions

## Related patterns

- [Entity keys](../patterns/entity-keys.md) - Type-safe entity identification
- [Composite Keys](../patterns/composite-keys.md) - Multi-attribute keys
- [Hierarchical Keys](../patterns/hierarchical.md) - Model relationships
- [Hot Partition Distribution](../patterns/hot-partition-distribution.md) - Prevent hot partitions
- [Multi-Attribute Keys](../patterns/multi-attribute-keys/) - Complex key structures

## Related guides

- [Access Patterns](../guides/access-patterns/) - Define and implement access patterns
- [Multi-Attribute Keys](../guides/multi-attribute-keys/) - Using the helper functions
- [Core Operations](../guides/core-operations/) - Working with keys in operations
