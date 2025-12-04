---
title: Inefficient Batching Anti-Pattern
description: Avoid making individual requests when batch operations would work
---

# Inefficient batching anti-pattern

## What is it?

The inefficient batching anti-pattern occurs when developers make individual requests to DynamoDB for multiple items instead of using batch operations, or when they don't properly handle batch operation limits and retries. This results in poor throughput, high latency, and wasted capacity.

## Why is it a problem?

Not using batch operations efficiently creates performance issues:

- **Low Throughput**: Individual requests are 10-100x slower than batches
- **High Latency**: Each request requires a round trip to DynamoDB
- **Connection Overhead**: More TCP connections and HTTP requests
- **Throttling Risk**: More requests = higher chance of throttling
- **Wasted Capacity**: Inefficient use of provisioned throughput
- **Poor User Experience**: Slow response times for bulk operations

### The performance gap

```
Individual Requests:
- 100 items = 100 requests
- Time: 100 × 20ms = 2,000ms (2 seconds)

Batch Operations:
- 100 items = 4 batch requests (25 items each)
- Time: 4 × 20ms = 80ms
- 25x faster!
```

## Visual comparison



## Example of the problem

### ❌ anti-pattern: individual requests in loop

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'Products',
  // ... config
})

// BAD: Individual get requests in a loop
async function getProducts(productIds: string[]) {
  const products = []
  
  for (const id of productIds) {
    const result = await table.get({
      pk: `PRODUCT#${id}`,
      sk: 'METADATA'
    })
    
    if (result.item) {
      products.push(result.item)
    }
  }
  
  return products
}

// For 100 products:
// - 100 individual requests
// - 100 × 20ms = 2,000ms
// - Terrible performance!
```

### ❌ common mistakes

```typescript
// BAD: Individual puts in a loop
async function createUsers(users: User[]) {
  for (const user of users) {
    await table.put({
      pk: `USER#${user.id}`,
      sk: 'PROFILE',
      ...user
    })
  }
  // 100 users = 100 requests = very slow
}

// BAD: Not handling batch limits
async function batchGetProducts(productIds: string[]) {
  // DynamoDB batch limit is 100 items
  // This will fail if productIds.length > 100!
  return await table.batchGet({
    keys: productIds.map(id => ({
      pk: `PRODUCT#${id}`,
      sk: 'METADATA'
    }))
  })
}

// BAD: Not handling unprocessed items
async function batchWriteOrders(orders: Order[]) {
  const result = await table.batchWrite({
    puts: orders.map(order => ({
      pk: `ORDER#${order.id}`,
      sk: 'METADATA',
      ...order
    }))
  })
  
  // Ignoring unprocessed items!
  // Some writes may have failed due to throttling
  return result
}

// BAD: Sequential batch processing
async function processInBatches(items: any[]) {
  const batches = chunk(items, 25)
  
  for (const batch of batches) {
    await table.batchWrite({ puts: batch })
  }
  
  // Processing batches sequentially
  // Could process in parallel!
}
```

## The solution

### ✅ solution 1: use batch get

```typescript
// GOOD: Batch get operation
async function getProducts(productIds: string[]) {
  const result = await table.batchGet({
    keys: productIds.map(id => ({
      pk: `PRODUCT#${id}`,
      sk: 'METADATA'
    }))
  })
  
  return result.items
}

// For 100 products:
// - 4 batch requests (25 items each)
// - 4 × 20ms = 80ms
// - 25x faster!
```

### ✅ solution 2: use batch write

```typescript
// GOOD: Batch write operation
async function createUsers(users: User[]) {
  await table.batchWrite({
    puts: users.map(user => ({
      pk: `USER#${user.id}`,
      sk: 'PROFILE',
      ...user
    }))
  })
}

// Library automatically:
// - Chunks into batches of 25
// - Handles unprocessed items
// - Retries with exponential backoff
```

### ✅ solution 3: automatic chunking

```typescript
// GOOD: Library handles chunking automatically
async function batchGetManyProducts(productIds: string[]) {
  // Works with any number of items
  // Library automatically chunks into batches of 100
  const result = await table.batchGet({
    keys: productIds.map(id => ({
      pk: `PRODUCT#${id}`,
      sk: 'METADATA'
    }))
  })
  
  return result.items
}

// 500 product IDs:
// - Automatically split into 5 batches of 100
// - All handled by the library
```

### ✅ solution 4: parallel batch processing

```typescript
// GOOD: Process batches in parallel
async function processInBatchesParallel(items: any[]) {
  const batches = chunk(items, 25)
  
  // Process all batches in parallel
  await Promise.all(
    batches.map(batch => 
      table.batchWrite({ puts: batch })
    )
  )
}

// Much faster than sequential processing
// Limited by provisioned capacity, not latency
```

### ✅ solution 5: mixed batch operations

```typescript
// GOOD: Combine puts and deletes in one batch
async function syncProducts(
  newProducts: Product[],
  deletedProductIds: string[]
) {
  await table.batchWrite({
    puts: newProducts.map(product => ({
      pk: `PRODUCT#${product.id}`,
      sk: 'METADATA',
      ...product
    })),
    deletes: deletedProductIds.map(id => ({
      pk: `PRODUCT#${id}`,
      sk: 'METADATA'
    }))
  })
}

// Single batch operation for both puts and deletes
```

### ✅ solution 6: batch with projection

```typescript
// GOOD: Batch get with projection
async function getProductNames(productIds: string[]) {
  const result = await table.batchGet({
    keys: productIds.map(id => ({
      pk: `PRODUCT#${id}`,
      sk: 'METADATA'
    })),
    projection: ['name', 'price']
  })
  
  return result.items
}

// Batch operation + projection = maximum efficiency
```

## Performance metrics

### Throughput comparison

| Operation | Items | Requests | Time | Throughput |
|-----------|-------|----------|------|------------|
| **Individual Gets** | 100 | 100 | 2,000ms | 50 items/sec |
| **Batch Gets** | 100 | 4 | 80ms | 1,250 items/sec |
| **Improvement** | - | - | **25x faster** | **25x higher** |

### Latency comparison

| Items | Individual Requests | Batch Operations | Improvement |
|-------|-------------------|------------------|-------------|
| 10 | 200ms | 20ms | 10x faster |
| 25 | 500ms | 20ms | 25x faster |
| 50 | 1,000ms | 40ms | 25x faster |
| 100 | 2,000ms | 80ms | 25x faster |
| 500 | 10,000ms | 400ms | 25x faster |

### Real-world example

E-commerce product page loading 50 products:

**Without Batching:**
```
50 individual requests
50 × 20ms = 1,000ms
User sees: 1 second load time
```

**With Batching:**
```
2 batch requests (25 items each)
2 × 20ms = 40ms
User sees: 40ms load time
25x improvement!
```

## Detection

The anti-pattern detector can identify inefficient batching:

```typescript
import { StatsCollector, AntiPatternDetector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const detector = new AntiPatternDetector(stats)

// After running operations
const issues = detector.detectInefficientBatching()

for (const issue of issues) {
  console.log(issue.message)
  // "Detected 100 individual GetItem requests in 2 seconds"
  // "Consider using batchGet for better performance"
  // "Potential improvement: 25x faster"
}
```

### Warning signs

You might have this anti-pattern if:

- You see many individual get/put requests in logs
- Bulk operations are slow
- You have loops with await inside
- Response times increase linearly with item count
- You're not using batchGet or batchWrite

## Batch operation limits

Understanding DynamoDB batch limits:

### Batchgetitem limits

- **Max items per request**: 100
- **Max request size**: 16 MB
- **Max item size**: 400 KB
- **Returns**: Up to 16 MB of data

### Batchwriteitem limits

- **Max items per request**: 25
- **Max request size**: 16 MB
- **Max item size**: 400 KB
- **Operations**: Put and Delete (not Update)

### Library handling

```typescript
// Library automatically handles all limits
await table.batchGet({
  keys: Array(500).fill(null).map((_, i) => ({
    pk: `ITEM#${i}`,
    sk: 'DATA'
  }))
})

// Automatically:
// 1. Chunks into batches of 100
// 2. Makes 5 parallel requests
// 3. Handles unprocessed items
// 4. Retries with exponential backoff
// 5. Returns all results
```

## Advanced patterns

### Batch with error handling

```typescript
// GOOD: Handle batch errors gracefully
async function batchGetWithRetry(keys: any[]) {
  try {
    const result = await table.batchGet({ keys })
    return result.items
  } catch (error) {
    if (error.name === 'ProvisionedThroughputExceededException') {
      // Wait and retry
      await sleep(1000)
      return batchGetWithRetry(keys)
    }
    throw error
  }
}
```

### Batch with progress tracking

```typescript
// GOOD: Track progress for large batches
async function batchProcessWithProgress(
  items: any[],
  onProgress: (completed: number, total: number) => void
) {
  const batches = chunk(items, 25)
  let completed = 0
  
  for (const batch of batches) {
    await table.batchWrite({ puts: batch })
    completed += batch.length
    onProgress(completed, items.length)
  }
}

// Usage
await batchProcessWithProgress(items, (completed, total) => {
  console.log(`Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`)
})
```

### Batch with rate limiting

```typescript
// GOOD: Rate limit batch operations
async function batchProcessWithRateLimit(
  items: any[],
  batchesPerSecond: number
) {
  const batches = chunk(items, 25)
  const delayMs = 1000 / batchesPerSecond
  
  for (const batch of batches) {
    await table.batchWrite({ puts: batch })
    await sleep(delayMs)
  }
}

// Process 10 batches per second
await batchProcessWithRateLimit(items, 10)
```

## When to use individual requests

Batch operations aren't always the answer:

### Use individual requests when:

1. **You need conditional writes**
   ```typescript
   // Batch operations don't support conditions
   // Use individual puts with conditions
   await table.put({
     pk: `USER#${userId}`,
     sk: 'PROFILE',
     ...userData,
     condition: {
       pk: { attributeNotExists: true }
     }
   })
   ```

2. **You need to update items**
   ```typescript
   // Batch operations don't support updates
   // Use individual updates
   await table.update({
     pk: `USER#${userId}`,
     sk: 'PROFILE',
     updates: {
       loginCount: { increment: 1 }
     }
   })
   ```

3. **You need transactions**
   ```typescript
   // Use transactions for ACID guarantees
   await table.transactWrite([
     { put: { pk: 'A', sk: 'B', ...data } },
     { update: { pk: 'C', sk: 'D', updates: {...} } }
   ])
   ```

4. **You're processing items one at a time**
   ```typescript
   // If items arrive one at a time, process individually
   // Don't wait to accumulate a batch
   ```

## Related resources

- [Batch Operations Best Practice](../best-practices/batch-operations/)
- [Batch Operations Guide](../guides/batch-operations/)
- [Core Operations Guide](../guides/core-operations/)

## Summary

**The Problem**: Making individual requests for multiple items is 10-25x slower than using batch operations and wastes throughput.

**The Solution**: Use batchGet and batchWrite operations, which the library automatically chunks, retries, and optimizes.

**The Impact**: Batch operations can improve throughput by 10-25x and reduce latency from seconds to milliseconds.

Remember: DynamoDB is designed for batch operations. Use them whenever you need to work with multiple items. The library handles all the complexity of chunking, retries, and unprocessed items automatically.

