---
title: Batch Operations
description: Use batch operations to maximize throughput when working with multiple items
---

# Batch operations: maximize throughput

## The practice

**Use batch operations (BatchGetItem, BatchWriteItem) when working with multiple items instead of individual operations.**

Batch operations allow you to read or write up to 25 items in a single request, dramatically improving throughput and reducing latency overhead.

## Why it matters

### Throughput
- Process up to 25 items per request instead of 1
- Reduce total number of API calls by up to 25x
- Maximize utilization of provisioned capacity

### Latency
- Eliminate per-request network overhead
- Single round-trip instead of multiple
- Particularly beneficial for high-latency connections

### Cost efficiency
- Same RCU/WCU consumption as individual operations
- But with significantly less overhead
- Reduced Lambda execution time in serverless applications

## Visual comparison

| Aspect | Batch operations | Individual operations |
|--------|-----------------|----------------------|
| **Items per request** | Up to 25 | 1 |
| **Network round-trips** | 1 | 25 |
| **Latency overhead** | Minimal | 25x overhead |
| **Throughput** | High | Low |
| **Code complexity** | Simple (library handles chunking) | Complex (manual loops) |

!!! info "Automatic Chunking"
    The `@ddb-lib/client` library automatically chunks requests larger than 25 items and handles retries for unprocessed items. You don't need to worry about batch size limits!

## Code examples

### ✅ good: using batch get

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'Users',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// Retrieve multiple items efficiently
const userIds = ['123', '456', '789', '101', '102']

const users = await table.batchGet({
  keys: userIds.map(id => ({
    pk: `USER#${id}`,
    sk: 'PROFILE'
  })),
  projection: ['name', 'email', 'status']
})

// Single request, 5 items retrieved
// Fast and efficient!
```

### ❌ bad: individual get operations

```typescript
// DON'T DO THIS!
const users = []

for (const userId of userIds) {
  const user = await table.get({
    key: { pk: `USER#${userId}`, sk: 'PROFILE' },
    projection: ['name', 'email', 'status']
  })
  users.push(user)
}

// 5 separate requests with 5x the latency overhead
// Slow and inefficient!
```

## Real-world performance impact

### Example scenario
Retrieving 100 user profiles (1KB each):

| Approach | Requests | Network round-trips | Total latency | RCU consumed |
|----------|----------|---------------------|---------------|--------------|
| **Batch get** | 4 | 4 | ~80ms | 100 |
| **Individual gets** | 100 | 100 | ~2000ms | 100 |

!!! success "Performance Gain"
    Batch operations provide 25x reduction in latency overhead! In this example, batch operations are 25x faster while consuming the same RCU.

## Batch get operations

### Basic batch get

```typescript
// Retrieve multiple items from the same table
const items = await table.batchGet({
  keys: [
    { pk: 'USER#123', sk: 'PROFILE' },
    { pk: 'USER#456', sk: 'PROFILE' },
    { pk: 'ORDER#789', sk: 'DETAILS' }
  ]
})

// Library automatically handles:
// - Chunking into 25-item batches
// - Retrying unprocessed items
// - Deduplication of keys
```

### Batch get with projection

```typescript
// Retrieve only needed attributes
const users = await table.batchGet({
  keys: userKeys,
  projection: ['name', 'email', 'avatar']
})

// Combines batch efficiency with projection cost savings
```

### Large batch get (> 25 items)

```typescript
// Library automatically chunks large batches
const allUsers = await table.batchGet({
  keys: Array.from({ length: 100 }, (_, i) => ({
    pk: `USER#${i}`,
    sk: 'PROFILE'
  }))
})

// Automatically split into 4 requests of 25 items each
// All retries handled automatically
```

## Batch write operations

### Basic batch write

```typescript
// Write multiple items efficiently
await table.batchWrite({
  puts: [
    { pk: 'USER#123', sk: 'PROFILE', name: 'Alice' },
    { pk: 'USER#456', sk: 'PROFILE', name: 'Bob' }
  ],
  deletes: [
    { pk: 'USER#789', sk: 'PROFILE' }
  ]
})

// Single request for multiple operations
```

### Batch put

```typescript
// Insert or update multiple items
const newUsers = [
  { pk: 'USER#123', sk: 'PROFILE', name: 'Alice', email: 'alice@example.com' },
  { pk: 'USER#456', sk: 'PROFILE', name: 'Bob', email: 'bob@example.com' },
  { pk: 'USER#789', sk: 'PROFILE', name: 'Charlie', email: 'charlie@example.com' }
]

await table.batchWrite({
  puts: newUsers
})
```

### Batch delete

```typescript
// Delete multiple items
const keysToDelete = [
  { pk: 'USER#123', sk: 'SESSION#abc' },
  { pk: 'USER#123', sk: 'SESSION#def' },
  { pk: 'USER#123', sk: 'SESSION#ghi' }
]

await table.batchWrite({
  deletes: keysToDelete
})
```

### Mixed operations

```typescript
// Combine puts and deletes in one batch
await table.batchWrite({
  puts: [
    { pk: 'USER#123', sk: 'PROFILE', status: 'ACTIVE' }
  ],
  deletes: [
    { pk: 'USER#123', sk: 'OLD_DATA' },
    { pk: 'USER#123', sk: 'TEMP_SESSION' }
  ]
})
```

## Advanced patterns

### Pattern 1: batch processing pipeline

```typescript
// Process items in batches
async function processUsers(userIds: string[]) {
  // Fetch in batches
  const users = await table.batchGet({
    keys: userIds.map(id => ({ pk: `USER#${id}`, sk: 'PROFILE' }))
  })
  
  // Process
  const updates = users.map(user => ({
    ...user,
    lastProcessed: Date.now()
  }))
  
  // Write back in batches
  await table.batchWrite({
    puts: updates
  })
}
```

### Pattern 2: parallel batch operations

```typescript
// Process multiple batches in parallel
async function fetchAllOrders(userIds: string[]) {
  const batches = chunk(userIds, 100) // 100 items per batch
  
  const results = await Promise.all(
    batches.map(batch =>
      table.batchGet({
        keys: batch.map(id => ({ pk: `USER#${id}`, sk: 'ORDERS' }))
      })
    )
  )
  
  return results.flat()
}
```

### Pattern 3: batch with error handling

```typescript
// Handle partial failures gracefully
try {
  const result = await table.batchWrite({
    puts: items
  })
  
  // Check for unprocessed items
  if (result.unprocessedItems?.length > 0) {
    console.log(`${result.unprocessedItems.length} items not processed`)
    // Library automatically retries, but you can handle manually if needed
  }
} catch (error) {
  console.error('Batch write failed:', error)
}
```

## Limitations and considerations

### Batch size limits

- **Maximum 25 items** per batch request
- **Maximum 16MB** total request size
- **Maximum 400KB** per item

```typescript
// Library handles chunking automatically
const largeItems = Array.from({ length: 100 }, (_, i) => ({
  pk: `ITEM#${i}`,
  sk: 'DATA',
  payload: generateLargePayload()
}))

// Automatically split into multiple batches
await table.batchWrite({ puts: largeItems })
```

### No conditional writes

Batch operations don't support conditional expressions:

```typescript
// ❌ Not supported in batch operations
await table.batchWrite({
  puts: [{ 
    pk: 'USER#123', 
    sk: 'PROFILE',
    condition: { attribute_not_exists: 'pk' } // Not supported!
  }]
})

// ✅ Use individual operations for conditional writes
await table.put({
  item: { pk: 'USER#123', sk: 'PROFILE' },
  condition: { attribute_not_exists: 'pk' }
})
```

### Partial failures

Batch operations can partially succeed:

```typescript
// Some items may fail while others succeed
const result = await table.batchWrite({
  puts: items
})

// Library automatically retries unprocessed items
// But you should monitor for persistent failures
if (result.unprocessedItems?.length > 0) {
  // Log or handle persistent failures
  console.warn('Some items could not be processed')
}
```

## When NOT to use batch operations

### ❌ don't use batches for:

1. **Single item operations**
   ```typescript
   // Overkill for one item
   await table.batchGet({
     keys: [{ pk: 'USER#123', sk: 'PROFILE' }]
   })
   
   // Just use get
   await table.get({
     key: { pk: 'USER#123', sk: 'PROFILE' }
   })
   ```

2. **Operations requiring conditions**
   ```typescript
   // Need conditional writes - use individual operations
   await table.put({
     item: { pk: 'USER#123', sk: 'PROFILE' },
     condition: { attribute_not_exists: 'pk' }
   })
   ```

3. **Transactions**
   ```typescript
   // Need ACID guarantees - use transactions
   await table.transactWrite({
     items: [
       { type: 'put', item: { ... } },
       { type: 'update', key: { ... }, updates: { ... } }
     ]
   })
   ```

## Monitoring batch operations

Track batch operation efficiency:

```typescript
import { StatsCollector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const table = new TableClient({
  tableName: 'Users',
  statsCollector: stats
})

// After operations
const summary = stats.getSummary()

console.log(`Batch operations: ${summary.operations.batchGet + summary.operations.batchWrite}`)
console.log(`Individual operations: ${summary.operations.get + summary.operations.put}`)
console.log(`Batch efficiency: ${summary.batchEfficiency}%`)

// Aim for high batch usage in multi-item scenarios
```

## Performance optimization tips

### Tip 1: combine with projections

```typescript
// Maximum efficiency: batch + projection
const users = await table.batchGet({
  keys: userKeys,
  projection: ['name', 'email']  // Only get what you need
})
```

### Tip 2: use parallel batches for large datasets

```typescript
// Process very large datasets efficiently
async function processLargeDataset(keys: Key[]) {
  const batches = chunk(keys, 100)
  
  // Process batches in parallel (with concurrency limit)
  const results = await pMap(
    batches,
    batch => table.batchGet({ keys: batch }),
    { concurrency: 5 }
  )
  
  return results.flat()
}
```

### Tip 3: deduplicate keys

```typescript
// Remove duplicate keys before batching
const uniqueKeys = Array.from(
  new Set(keys.map(k => JSON.stringify(k)))
).map(k => JSON.parse(k))

await table.batchGet({ keys: uniqueKeys })
```

## Key takeaways

1. **Use batches for multiple items** - 25x throughput improvement
2. **Library handles complexity** - automatic chunking and retries
3. **Combine with projections** - maximum cost efficiency
4. **Not for conditional writes** - use individual operations or transactions
5. **Monitor efficiency** - track batch vs individual operation ratio

## Related best practices

- [Projection expressions](projection-expressions.md) - Combine for maximum efficiency
- [Query vs scan](query-vs-scan.md) - Efficient data retrieval
- [Capacity planning](capacity-planning.md) - Plan for batch throughput

## Related guides

- [Batch operations](../guides/batch-operations/) - Detailed usage guide
- [Core operations](../guides/core-operations/) - Individual operations
- [Transactions](../guides/transactions/) - When you need ACID guarantees
