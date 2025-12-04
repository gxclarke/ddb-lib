---
title: "Table Scans Anti-Pattern"
weight: 10
description: "Avoid using Scan operations when Query operations would work"
type: docs
---

# Table Scans Anti-Pattern

## What is it?

The table scans anti-pattern occurs when developers use the Scan operation to find items in a DynamoDB table when a Query operation would be more appropriate. A scan examines **every single item** in your table, regardless of whether it matches your criteria, and then filters the results afterward.

## Why is it a problem?

Scans are one of the most expensive and slowest operations in DynamoDB:

- **Performance**: Scans have O(n) complexity - they get slower as your table grows
- **Cost**: You pay for reading every item examined, not just items returned
- **Throughput**: Scans consume massive amounts of read capacity
- **Latency**: Response times increase linearly with table size
- **Scalability**: Scans don't benefit from DynamoDB's distributed architecture

### The Hidden Cost

If you have a table with 1 million items and you scan for 10 specific items:

- **Items examined**: 1,000,000
- **Items returned**: 10
- **RCU consumed**: ~1,000,000 (you pay for all examined items!)
- **Time**: Several seconds to minutes

## Visual Representation

{{< pattern-diagram mermaid="true" caption="Scan vs Query Operation" >}}
graph TB
    subgraph "❌ Scan Operation"
        S[Scan Request] --> P1[Partition 1<br/>Read ALL items]
        S --> P2[Partition 2<br/>Read ALL items]
        S --> P3[Partition 3<br/>Read ALL items]
        S --> P4[Partition 4<br/>Read ALL items]
        P1 --> F[Filter Results]
        P2 --> F
        P3 --> F
        P4 --> F
        F --> R1[Return 10 items<br/>Examined 1M items]
        style R1 fill:#f44336
    end
    
    subgraph "✅ Query Operation"
        Q[Query Request] --> T[Target Partition]
        T --> R2[Return 10 items<br/>Examined 10 items]
        style R2 fill:#4CAF50
    end
{{< /pattern-diagram >}}

## Example of the Problem

### ❌ Anti-Pattern: Using Scan

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'Users',
  // ... config
})

// BAD: Scanning entire table to find active users
const result = await table.scan({
  filter: {
    status: { eq: 'ACTIVE' },
    createdAt: { gt: '2024-01-01' }
  }
})

// This examines EVERY item in the table!
// If you have 1M users, this reads 1M items
// Even if only 100 are active and match the date
```

### Common Scan Mistakes

```typescript
// BAD: Scanning to find a specific user
const user = await table.scan({
  filter: {
    email: { eq: 'user@example.com' }
  }
})

// BAD: Scanning to get recent orders
const orders = await table.scan({
  filter: {
    userId: { eq: '123' },
    orderDate: { gt: '2024-01-01' }
  }
})

// BAD: Scanning to count items
const count = await table.scan({
  filter: {
    type: { eq: 'ORDER' }
  },
  select: 'COUNT'
})
// Still reads every item to count!
```

## The Solution

### ✅ Use Query with Proper Keys

```typescript
// GOOD: Query with partition key
const result = await table.query({
  keyCondition: {
    pk: 'STATUS#ACTIVE',
    sk: { beginsWith: 'USER#' }
  },
  filter: {
    createdAt: { gt: '2024-01-01' }
  }
})

// Only reads items in the STATUS#ACTIVE partition
// Filter is applied after reading, but only on relevant items
```

### ✅ Design Keys for Your Access Patterns

```typescript
// Design your data model to support queries
interface User {
  pk: string    // STATUS#ACTIVE or STATUS#INACTIVE
  sk: string    // USER#{userId}
  email: string
  createdAt: string
  // ... other attributes
}

// Now you can query efficiently
const activeUsers = await table.query({
  keyCondition: {
    pk: 'STATUS#ACTIVE'
  }
})

// Or query a specific user
const user = await table.query({
  keyCondition: {
    pk: 'STATUS#ACTIVE',
    sk: 'USER#123'
  }
})
```

### ✅ Use GSI for Alternative Access Patterns

```typescript
// If you need to query by email, create a GSI
// GSI: email (PK), userId (SK)

const userByEmail = await table.query({
  indexName: 'EmailIndex',
  keyCondition: {
    email: 'user@example.com'
  }
})

// Efficient query on GSI instead of table scan
```

### ✅ Use Get for Single Items

```typescript
// If you know the exact key, use get
const user = await table.get({
  pk: 'USER#123',
  sk: 'PROFILE'
})

// Single-item read, most efficient operation
```

## Impact Metrics

### Performance Comparison

| Operation | Items in Table | Items Returned | Items Examined | RCU Consumed | Latency |
|-----------|----------------|----------------|----------------|--------------|---------|
| **Scan** | 1,000,000 | 10 | 1,000,000 | ~1,000,000 | 5-30 seconds |
| **Query** | 1,000,000 | 10 | 10 | ~10 | 10-50ms |
| **Get** | 1,000,000 | 1 | 1 | 1 | 5-20ms |

### Cost Impact

Assuming $0.25 per million read requests:

| Operation | Monthly Requests | Items Examined | Monthly Cost |
|-----------|-----------------|----------------|--------------|
| **Scan** | 10,000 | 10 billion | $2,500 |
| **Query** | 10,000 | 100,000 | $0.025 |
| **Savings** | - | - | **$2,499.98 (99.99%)** |

## When Scans Are Acceptable

Scans are appropriate in limited scenarios:

### ✅ Acceptable Use Cases

1. **One-time data migrations**
   ```typescript
   // Migrating data structure (run once)
   const allItems = await table.scan({})
   ```

2. **Analytics on small tables** (<1,000 items)
   ```typescript
   // Small lookup table
   const allCategories = await table.scan({})
   ```

3. **Admin operations during maintenance windows**
   ```typescript
   // Cleanup job during low-traffic period
   const oldItems = await table.scan({
     filter: {
       expiresAt: { lt: Date.now() }
     }
   })
   ```

4. **Exporting entire table for backup**
   ```typescript
   // Full table backup
   const backup = await table.scan({})
   ```

### ❌ Never Use Scans For

- Finding specific items by attribute
- Filtering by non-key attributes in production
- Counting items (use aggregated counters instead)
- Regular application queries
- User-facing operations

## Detection

The anti-pattern detector can identify excessive scan usage:

```typescript
import { StatsCollector, AntiPatternDetector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const detector = new AntiPatternDetector(stats)

// After running operations
const issues = detector.detectExcessiveScans()

for (const issue of issues) {
  console.log(issue.message)
  // "High scan usage detected: 45% of operations are scans"
  // "Scan on table 'Users' examined 1M items but returned only 10"
}
```

### Warning Signs

You might have this anti-pattern if:

- Your DynamoDB costs are unexpectedly high
- Queries get slower as your table grows
- You see "ProvisionedThroughputExceededException" errors
- Response times are in seconds instead of milliseconds
- Your read capacity is constantly maxed out

## How to Fix

### Step 1: Identify Your Access Patterns

```typescript
// What queries do you need to support?
// - Get user by ID
// - Get user by email
// - Get active users
// - Get users created after date
```

### Step 2: Design Keys and Indexes

```typescript
// Main table: pk = USER#{id}, sk = PROFILE
// GSI1: pk = EMAIL#{email}, sk = USER#{id}
// GSI2: pk = STATUS#{status}, sk = CREATED#{timestamp}
```

### Step 3: Replace Scans with Queries

```typescript
// Before: Scan
const users = await table.scan({
  filter: { status: { eq: 'ACTIVE' } }
})

// After: Query on GSI
const users = await table.query({
  indexName: 'StatusIndex',
  keyCondition: {
    pk: 'STATUS#ACTIVE'
  }
})
```

### Step 4: Monitor and Validate

```typescript
// Verify improvement
const stats = collector.getStats()
console.log(`Scan operations: ${stats.scanCount}`)
console.log(`Query operations: ${stats.queryCount}`)
console.log(`Avg scan latency: ${stats.avgScanLatency}ms`)
console.log(`Avg query latency: ${stats.avgQueryLatency}ms`)
```

## Related Resources

- [Query vs Scan Best Practice](/best-practices/query-vs-scan/)
- [Key Design Best Practice](/best-practices/key-design/)
- [Entity Keys Pattern](/patterns/entity-keys/)
- [Composite Keys Pattern](/patterns/composite-keys/)
- [Query and Scan Guide](/guides/query-and-scan/)

## Summary

**The Problem**: Using Scan when Query would work examines every item in your table, causing slow performance and high costs.

**The Solution**: Design your keys and indexes to support your access patterns, then use Query operations to target specific partitions.

**The Impact**: Switching from Scan to Query can improve performance by 100x and reduce costs by 99%.

Remember: If you find yourself using Scan in production code for user-facing operations, it's almost always a sign that your data model needs improvement.

