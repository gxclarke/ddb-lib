---
title: "Projection Expressions"
weight: 20
description: "Use projection expressions to retrieve only the attributes you need, reducing costs and improving performance"
type: docs
---

# Projection Expressions: Retrieve Only What You Need

## The Practice

**Always use projection expressions to retrieve only the attributes you need, rather than fetching entire items.**

Projection expressions allow you to specify exactly which attributes DynamoDB should return, reducing data transfer, lowering costs, and improving performance.

## Why It Matters

### Cost Efficiency
- DynamoDB charges based on data read, not data stored
- Retrieving only needed attributes can reduce RCU consumption by 50-90%
- Smaller responses mean lower data transfer costs

### Performance
- Less data to transfer over the network
- Faster response times, especially for large items
- Reduced memory usage in your application

### Bandwidth
- Smaller payloads reduce network bandwidth usage
- Particularly important for mobile or edge applications
- Improves performance in high-latency environments

## Visual Comparison

| Aspect | With Projection | Without Projection |
|--------|----------------|-------------------|
| **Data Retrieved** | Only requested attributes | All attributes |
| **RCU Consumed** | Based on projected size | Based on full item size |
| **Network Transfer** | Minimal | Maximum |
| **Response Time** | Fast | Slower |
| **Memory Usage** | Low | High |

{{< alert type="info" title="How RCU Calculation Works" >}}
DynamoDB calculates RCU based on the size of data returned, rounded up to the nearest 4KB. Projection expressions reduce the returned data size, potentially reducing RCU consumption significantly.
{{< /alert >}}

## Code Examples

### ✅ Good: Using Projection Expressions

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'Users',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// Get only the attributes you need
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: ['email', 'name', 'status']
})

// Returns: { email: '...', name: '...', status: '...' }
// Fast and efficient!
```

### ❌ Bad: Retrieving Full Items

```typescript
// DON'T DO THIS if you only need a few attributes!
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' }
})

// Returns ALL attributes including:
// - Large profile images
// - Full address history
// - Detailed preferences
// - Audit logs
// - etc.
// Slow and expensive!
```

## Real-World Cost Impact

### Example Scenario
User profile item with 20KB of data, but you only need 2KB:

| Approach | Item Size | Data Retrieved | RCU per Read | Cost per 1M Reads |
|----------|-----------|----------------|--------------|-------------------|
| **With Projection** | 20KB | 2KB | 1 RCU | $0.25 |
| **Without Projection** | 20KB | 20KB | 5 RCU | $1.25 |

{{< alert type="success" title="Cost Savings" >}}
Using projection expressions in this example reduces costs by 80%! For high-traffic applications, this can save thousands of dollars per month.
{{< /alert >}}

## Projection in Different Operations

### Get Operation

```typescript
// Retrieve specific user fields
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: ['name', 'email', 'createdAt']
})
```

### Query Operation

```typescript
// Get order summaries without full details
const orders = await table.query({
  keyCondition: {
    pk: 'USER#123',
    sk: { beginsWith: 'ORDER#' }
  },
  projection: ['orderId', 'total', 'status', 'createdAt']
})

// Returns lightweight order summaries
// Full details can be fetched on-demand
```

### Batch Get Operation

```typescript
// Retrieve multiple items with projection
const users = await table.batchGet({
  keys: [
    { pk: 'USER#123', sk: 'PROFILE' },
    { pk: 'USER#456', sk: 'PROFILE' },
    { pk: 'USER#789', sk: 'PROFILE' }
  ],
  projection: ['name', 'email', 'avatar']
})

// Efficient for list views or search results
```

### Scan Operation (when necessary)

```typescript
// Even scans benefit from projections
const activeUsers = await table.scan({
  filter: { status: { eq: 'ACTIVE' } },
  projection: ['userId', 'name', 'lastLogin']
})

// Reduces the cost of an already expensive operation
```

## Advanced Projection Techniques

### Nested Attribute Projection

```typescript
// Project nested attributes
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: [
    'name',
    'address.city',
    'address.country',
    'preferences.theme'
  ]
})

// Returns only specific nested fields
```

### List Element Projection

```typescript
// Project specific list elements
const order = await table.get({
  key: { pk: 'ORDER#123', sk: 'DETAILS' },
  projection: [
    'orderId',
    'items[0]',  // First item only
    'items[1]'   // Second item only
  ]
})
```

### Combining with GSI

```typescript
// Query GSI with projection
const recentOrders = await table.query({
  indexName: 'StatusIndex',
  keyCondition: { status: 'PENDING' },
  projection: ['orderId', 'userId', 'createdAt']
})

// Efficient for dashboard views
```

## When to Use Full Item Retrieval

There are cases where retrieving the full item makes sense:

### ✅ Appropriate Full Item Retrieval

1. **Detail Pages**: When displaying complete information
   ```typescript
   // User profile detail page - need everything
   const fullProfile = await table.get({
     key: { pk: 'USER#123', sk: 'PROFILE' }
   })
   ```

2. **Small Items**: When items are already small (< 1KB)
   ```typescript
   // Configuration item - already tiny
   const config = await table.get({
     key: { pk: 'CONFIG', sk: 'APP_SETTINGS' }
   })
   ```

3. **Update Operations**: When you need to read-modify-write
   ```typescript
   // Need full item to update it
   const item = await table.get({
     key: { pk: 'USER#123', sk: 'PROFILE' }
   })
   
   // Modify and save
   item.lastLogin = Date.now()
   await table.put({ item })
   ```

## Design Patterns for Projections

### Pattern 1: List View vs Detail View

```typescript
// List view - lightweight projection
async function getUserList() {
  return await table.query({
    keyCondition: { pk: 'USERS' },
    projection: ['userId', 'name', 'avatar', 'status']
  })
}

// Detail view - full item
async function getUserDetails(userId: string) {
  return await table.get({
    key: { pk: `USER#${userId}`, sk: 'PROFILE' }
  })
}
```

### Pattern 2: Progressive Loading

```typescript
// Initial load - essential data only
const summary = await table.get({
  key: { pk: 'ORDER#123', sk: 'DETAILS' },
  projection: ['orderId', 'status', 'total', 'createdAt']
})

// Load additional data on demand
if (needsFullDetails) {
  const fullOrder = await table.get({
    key: { pk: 'ORDER#123', sk: 'DETAILS' }
  })
}
```

### Pattern 3: Search Results

```typescript
// Search results - minimal data for display
const searchResults = await table.query({
  indexName: 'SearchIndex',
  keyCondition: { searchTerm: query },
  projection: ['id', 'title', 'summary', 'thumbnail']
})

// User clicks for details - fetch full item
```

## Monitoring Projection Usage

Track the impact of projection expressions:

```typescript
import { StatsCollector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const table = new TableClient({
  tableName: 'Users',
  statsCollector: stats
})

// After operations
const summary = stats.getSummary()

console.log(`Average item size retrieved: ${summary.avgItemSize}`)
console.log(`Total data transferred: ${summary.totalDataTransferred}`)

// Compare with and without projections to measure impact
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Over-Projecting

```typescript
// Bad: Projecting too many attributes
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: [
    'name', 'email', 'phone', 'address', 'preferences',
    'history', 'settings', 'metadata', 'tags', 'notes'
    // ... 20 more attributes
  ]
})

// Better: Only project what you actually use
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: ['name', 'email']
})
```

### ❌ Mistake 2: Not Using Projections in Loops

```typescript
// Bad: Fetching full items in a loop
for (const userId of userIds) {
  const user = await table.get({
    key: { pk: `USER#${userId}`, sk: 'PROFILE' }
  })
  console.log(user.name)  // Only using name!
}

// Good: Use projection and batch operations
const users = await table.batchGet({
  keys: userIds.map(id => ({ pk: `USER#${id}`, sk: 'PROFILE' })),
  projection: ['name']
})
```

### ❌ Mistake 3: Ignoring Nested Attributes

```typescript
// Bad: Retrieving entire nested object
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: ['name', 'address']  // Gets entire address object
})

// Good: Project only needed nested fields
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: ['name', 'address.city', 'address.country']
})
```

## Key Takeaways

1. **Always use projections** - Unless you truly need the entire item
2. **Project at the field level** - Be specific about what you need
3. **Consider nested attributes** - Project only needed nested fields
4. **Use in all operations** - Get, Query, Scan, and BatchGet all support projections
5. **Monitor the impact** - Track data transfer and RCU consumption

## Related Best Practices

- [Query vs Scan](/best-practices/query-vs-scan/) - Efficient data retrieval
- [Batch Operations](/best-practices/batch-operations/) - Combine with projections for maximum efficiency
- [Capacity Planning](/best-practices/capacity-planning/) - Factor projections into capacity estimates

## Related Guides

- [Core Operations](/guides/core-operations/) - Using projections in basic operations
- [Query and Scan](/guides/query-and-scan/) - Projections in queries
- [Batch Operations](/guides/batch-operations/) - Projections in batch operations
