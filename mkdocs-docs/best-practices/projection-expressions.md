---
title: Projection Expressions
description: Use projection expressions to retrieve only the attributes you need, reducing costs and improving performance
---

# Projection expressions: retrieve only what you need

## The practice

**Always use projection expressions to retrieve only the attributes you need, rather than fetching entire items.**

Projection expressions allow you to specify exactly which attributes DynamoDB should return, reducing data transfer, lowering costs, and improving performance.

## Why it matters

### Cost efficiency
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

## Visual comparison

| Aspect | With projection | Without projection |
|--------|----------------|-------------------|
| **Data retrieved** | Only requested attributes | All attributes |
| **RCU consumed** | Based on projected size | Based on full item size |
| **Network transfer** | Minimal | Maximum |
| **Response time** | Fast | Slower |
| **Memory usage** | Low | High |

!!! info "How RCU Calculation Works"
    DynamoDB calculates RCU based on the size of data returned, rounded up to the nearest 4KB. Projection expressions reduce the returned data size, potentially reducing RCU consumption significantly.

## Code examples

### ✅ good: using projection expressions

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

### ❌ bad: retrieving full items

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

## Real-world cost impact

### Example scenario
User profile item with 20KB of data, but you only need 2KB:

| Approach | Item size | Data retrieved | RCU per read | Cost per 1M reads |
|----------|-----------|----------------|--------------|-------------------|
| **With projection** | 20KB | 2KB | 1 RCU | $0.25 |
| **Without projection** | 20KB | 20KB | 5 RCU | $1.25 |

!!! success "Cost Savings"
    Using projection expressions in this example reduces costs by 80%! For high-traffic applications, this can save thousands of dollars per month.

## Projection in different operations

### Get operation

```typescript
// Retrieve specific user fields
const user = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  projection: ['name', 'email', 'createdAt']
})
```

### Query operation

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

### Batch get operation

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

### Scan operation (when necessary)

```typescript
// Even scans benefit from projections
const activeUsers = await table.scan({
  filter: { status: { eq: 'ACTIVE' } },
  projection: ['userId', 'name', 'lastLogin']
})

// Reduces the cost of an already expensive operation
```

## Advanced projection techniques

### Nested attribute projection

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

### List element projection

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

## When to use full item retrieval

There are cases where retrieving the full item makes sense:

### ✅ appropriate full item retrieval

1. **Detail pages**: When displaying complete information
   ```typescript
   // User profile detail page - need everything
   const fullProfile = await table.get({
     key: { pk: 'USER#123', sk: 'PROFILE' }
   })
   ```

2. **Small items**: When items are already small (< 1KB)
   ```typescript
   // Configuration item - already tiny
   const config = await table.get({
     key: { pk: 'CONFIG', sk: 'APP_SETTINGS' }
   })
   ```

3. **Update operations**: When you need to read-modify-write
   ```typescript
   // Need full item to update it
   const item = await table.get({
     key: { pk: 'USER#123', sk: 'PROFILE' }
   })
   
   // Modify and save
   item.lastLogin = Date.now()
   await table.put({ item })
   ```

## Design patterns for projections

### Pattern 1: list view vs detail view

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

### Pattern 2: progressive loading

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

### Pattern 3: search results

```typescript
// Search results - minimal data for display
const searchResults = await table.query({
  indexName: 'SearchIndex',
  keyCondition: { searchTerm: query },
  projection: ['id', 'title', 'summary', 'thumbnail']
})

// User clicks for details - fetch full item
```

## Monitoring projection usage

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

## Common mistakes to avoid

### ❌ mistake 1: over-projecting

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

### ❌ mistake 2: not using projections in loops

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

### ❌ mistake 3: ignoring nested attributes

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

## Key takeaways

1. **Always use projections** - unless you truly need the entire item
2. **Project at the field level** - be specific about what you need
3. **Consider nested attributes** - project only needed nested fields
4. **Use in all operations** - Get, Query, Scan, and BatchGet all support projections
5. **Monitor the impact** - track data transfer and RCU consumption

## Related best practices

- [Query vs scan](query-vs-scan.md) - Efficient data retrieval
- [Batch operations](batch-operations/) - Combine with projections for maximum efficiency
- [Capacity planning](capacity-planning.md) - Factor projections into capacity estimates

## Related guides

- [Core operations](../guides/core-operations/) - Using projections in basic operations
- [Query and scan](../guides/query-and-scan/) - Projections in queries
- [Batch operations](../guides/batch-operations/) - Projections in batch operations
