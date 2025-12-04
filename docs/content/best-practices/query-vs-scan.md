---
title: "Query vs Scan"
weight: 10
description: "Always prefer Query operations over Scan operations for better performance and lower costs"
type: docs
---

# Query vs Scan: The Most Important Best Practice

## The Practice

**Always use Query operations with proper key conditions instead of Scan operations.**

This is the single most important performance optimization in DynamoDB. Queries are efficient and targeted, while scans are expensive and slow.

## Why It Matters

### Performance
- **Query**: O(log n) complexity - uses indexes to find data quickly
- **Scan**: O(n) complexity - examines every single item in the table

### Cost
- **Query**: Consumes RCU only for items returned
- **Scan**: Consumes RCU for every item examined, even if filtered out

### Scalability
- **Query**: Performance remains consistent as table grows
- **Scan**: Performance degrades linearly with table size

## Visual Comparison

{{< alert type="info" title="Understanding the Difference" >}}
A Query operation uses your table's indexes to efficiently locate data, while a Scan operation reads every item in the table and then filters the results.
{{< /alert >}}

| Aspect | Query | Scan |
|--------|-------|------|
| **Items Examined** | Only items matching key condition | Every item in table |
| **RCU Consumed** | Based on items returned | Based on entire table size |
| **Latency** | Consistent, low | Increases with table size |
| **Scalability** | Excellent | Poor |
| **Cost** | Low | High |

## Code Examples

### ✅ Good: Using Query

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'Users',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// Query specific partition with sort key condition
const userOrders = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})

// Only reads items in the USER#123 partition that start with ORDER#
// Fast and efficient!
```

### ❌ Bad: Using Scan with Filter

```typescript
// DON'T DO THIS!
const userOrders = await table.scan({
  filter: {
    userId: { eq: '123' },
    type: { eq: 'ORDER' }
  }
})

// This reads EVERY item in the entire table!
// Filters are applied AFTER reading, so you pay for all items
// Slow and expensive!
```

## Real-World Performance Impact

### Example Scenario
Table with 1 million items, looking for 10 specific orders:

| Operation | Items Examined | RCU Consumed | Latency | Cost (per 1M requests) |
|-----------|----------------|--------------|---------|------------------------|
| **Query** | 10 | 10 | ~10ms | $0.25 |
| **Scan** | 1,000,000 | 1,000,000 | ~30s | $25,000 |

{{< alert type="warning" title="Cost Impact" >}}
A scan on a 1 million item table consumes 1 million RCU even if it returns only 10 items! That's 100,000x more expensive than a query.
{{< /alert >}}

## When Scans Are Acceptable

There are legitimate use cases for scans, but they're rare:

### ✅ Acceptable Scan Use Cases

1. **One-time data migrations**
   ```typescript
   // Migrating data structure - run once
   const allItems = await table.scan({})
   ```

2. **Analytics on small tables** (< 1,000 items)
   ```typescript
   // Small lookup table - acceptable
   const allCategories = await table.scan({})
   ```

3. **Admin operations during low-traffic periods**
   ```typescript
   // Nightly cleanup job
   const expiredItems = await table.scan({
     filter: { expiresAt: { lt: Date.now() } }
   })
   ```

4. **Parallel scans for data export**
   ```typescript
   // Export entire table using parallel scans
   const segment1 = await table.scan({ segment: 0, totalSegments: 4 })
   const segment2 = await table.scan({ segment: 1, totalSegments: 4 })
   // ... etc
   ```

## How to Fix Scan Operations

If you find yourself using scans, here are strategies to convert them to queries:

### Strategy 1: Add a GSI

If you're filtering on an attribute, create a Global Secondary Index:

```typescript
// Before: Scanning for active users
const activeUsers = await table.scan({
  filter: { status: { eq: 'ACTIVE' } }
})

// After: Query GSI with status as partition key
const activeUsers = await table.query({
  indexName: 'StatusIndex',
  keyCondition: {
    status: 'ACTIVE'
  }
})
```

### Strategy 2: Redesign Your Keys

Structure your partition and sort keys to support your access patterns:

```typescript
// Before: Scan for user's orders
const orders = await table.scan({
  filter: { userId: { eq: '123' } }
})

// After: Use composite keys
// pk: USER#123, sk: ORDER#<orderId>
const orders = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  }
})
```

### Strategy 3: Use Composite Keys

Group related items together:

```typescript
// Before: Scan for recent posts
const recentPosts = await table.scan({
  filter: { 
    type: { eq: 'POST' },
    createdAt: { gt: lastWeek }
  }
})

// After: Use type-based partition key
// pk: POST, sk: <timestamp>#<postId>
const recentPosts = await table.query({
  keyCondition: {
    pk: 'POST',
    sk: { beginsWith: lastWeek.toString() }
  }
})
```

## Detecting Scan Usage

Use the stats collector to identify scan operations in your application:

```typescript
import { StatsCollector, RecommendationEngine } from '@ddb-lib/stats'

const stats = new StatsCollector()
const table = new TableClient({
  tableName: 'Users',
  statsCollector: stats
})

// After running your application
const recommendations = new RecommendationEngine(stats)
const scanIssues = recommendations.getRecommendations()
  .filter(r => r.type === 'SCAN_USAGE')

for (const issue of scanIssues) {
  console.log(issue.message)
  // "Scan operation detected on table Users. Consider using Query with a GSI."
}
```

## Performance Monitoring

Track query vs scan usage in your application:

```typescript
const stats = new StatsCollector()

// After operations
const summary = stats.getSummary()

console.log(`Queries: ${summary.operations.query}`)
console.log(`Scans: ${summary.operations.scan}`)
console.log(`Query/Scan Ratio: ${summary.operations.query / summary.operations.scan}`)

// Aim for a high query/scan ratio (ideally > 100:1)
```

## Key Takeaways

1. **Always prefer Query over Scan** - It's faster, cheaper, and scales better
2. **Design keys to support queries** - Plan your data model around access patterns
3. **Use GSIs when needed** - Add indexes to support additional query patterns
4. **Scans are rarely necessary** - Most scan use cases can be converted to queries
5. **Monitor your usage** - Use stats to identify and eliminate scans

## Related Best Practices

- [Key Design](/best-practices/key-design/) - Design keys that enable efficient queries
- [Projection Expressions](/best-practices/projection-expressions/) - Optimize what you retrieve
- [Capacity Planning](/best-practices/capacity-planning/) - Plan for query-based access patterns

## Related Patterns

- [Entity Keys](/patterns/entity-keys/) - Organize items for efficient queries
- [Composite Keys](/patterns/composite-keys/) - Support multiple access patterns
- [Time-Series](/patterns/time-series/) - Query time-based data efficiently
