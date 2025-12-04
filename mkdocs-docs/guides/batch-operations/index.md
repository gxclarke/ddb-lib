---
title: Batch Operations
description: Efficiently process multiple items with batch operations
---

# Batch operations

This guide covers how to efficiently read and write multiple items using DynamoDB's batch operations. Batch operations significantly improve performance and reduce costs when working with multiple items.

## Overview

DynamoDB provides two batch operations:

- **BatchGet** - Retrieve up to 100 items in a single request
- **BatchWrite** - Put or delete up to 25 items in a single request

**Benefits:**
- Reduced network round trips
- Lower latency for bulk operations
- Better throughput utilization
- Automatic chunking and retry handling

## Batchget operation

Retrieve multiple items efficiently with a single request.

### Basic batchget

```typescript
import { TableClient } from '@ddb-lib/client'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const client = new TableClient({
  tableName: 'my-table',
  client: new DynamoDBClient({ region: 'us-east-1' })
})

// Get multiple items by their keys
const items = await client.batchGet([
  { pk: 'USER#123', sk: 'PROFILE' },
  { pk: 'USER#456', sk: 'PROFILE' },
  { pk: 'USER#789', sk: 'PROFILE' }
])

console.log(`Retrieved ${items.length} items`)
```

### Automatic chunking

The library automatically handles DynamoDB's 100-item limit:

```typescript
// Request 250 items - automatically split into 3 requests
const keys = []
for (let i = 0; i < 250; i++) {
  keys.push({ pk: `USER#${i}`, sk: 'PROFILE' })
}

const items = await client.batchGet(keys)
// Internally: 3 requests (100 + 100 + 50)
console.log(`Retrieved ${items.length} items`)
```

### Automatic retry for unprocessed keys

DynamoDB may return unprocessed keys due to throttling. The library automatically retries:

```typescript
// Automatically retries unprocessed keys with exponential backoff
const items = await client.batchGet(keys)

// If some keys still fail after 3 attempts, you'll see a warning:
// ⚠️  BatchGet: 5 keys could not be processed after 3 attempts
```

### Batchget with projection

Retrieve only specific attributes to reduce data transfer:

```typescript
const items = await client.batchGet(
  [
    { pk: 'USER#123', sk: 'PROFILE' },
    { pk: 'USER#456', sk: 'PROFILE' },
    { pk: 'USER#789', sk: 'PROFILE' }
  ],
  {
    projectionExpression: ['name', 'email', 'status']
  }
)

// Each item contains only: pk, sk, name, email, status
```

### Consistent reads

Use strongly consistent reads when you need the latest data:

```typescript
const items = await client.batchGet(
  keys,
  {
    consistentRead: true  // Higher cost, latest data
  }
)
```

### Custom chunk size

Override the default chunk size if needed:

```typescript
const items = await client.batchGet(
  keys,
  {
    chunkSize: 50  // Process 50 items per request instead of 100
  }
)
```

## Batchwrite operation

Put or delete multiple items in a single request.

### Basic batchwrite

```typescript
// Mix of put and delete operations
await client.batchWrite([
  // Put operations
  {
    type: 'put',
    item: {
      pk: 'USER#123',
      sk: 'PROFILE',
      name: 'Alice',
      email: 'alice@example.com'
    }
  },
  {
    type: 'put',
    item: {
      pk: 'USER#456',
      sk: 'PROFILE',
      name: 'Bob',
      email: 'bob@example.com'
    }
  },
  // Delete operations
  {
    type: 'delete',
    key: { pk: 'USER#789', sk: 'PROFILE' }
  }
])

console.log('Batch write completed')
```

### Automatic chunking

The library handles DynamoDB's 25-item limit:

```typescript
// Write 100 items - automatically split into 4 requests
const operations = []
for (let i = 0; i < 100; i++) {
  operations.push({
    type: 'put',
    item: {
      pk: `USER#${i}`,
      sk: 'PROFILE',
      name: `User ${i}`,
      createdAt: new Date().toISOString()
    }
  })
}

await client.batchWrite(operations)
// Internally: 4 requests (25 + 25 + 25 + 25)
```

### Automatic retry for unprocessed items

Unprocessed items are automatically retried:

```typescript
// Automatically retries unprocessed items with exponential backoff
await client.batchWrite(operations)

// If some items still fail after 3 attempts, you'll see a warning:
// ⚠️  BatchWrite: 3 operations could not be processed after 3 attempts
```

### Bulk put

Create multiple items:

```typescript
const users = [
  { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' },
  { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' },
  { pk: 'USER#3', sk: 'PROFILE', name: 'Charlie' }
]

await client.batchWrite(
  users.map(user => ({
    type: 'put',
    item: user
  }))
)
```

### Bulk delete

Remove multiple items:

```typescript
const keysToDelete = [
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' },
  { pk: 'USER#3', sk: 'PROFILE' }
]

await client.batchWrite(
  keysToDelete.map(key => ({
    type: 'delete',
    key
  }))
)
```

### Custom chunk size

```typescript
await client.batchWrite(
  operations,
  {
    chunkSize: 10  // Process 10 items per request instead of 25
  }
)
```

## Performance comparison

### Individual vs batch operations

```typescript
// ❌ Slow: Individual operations
const items = []
for (const key of keys) {
  const item = await client.get(key)  // 100 network round trips
  items.push(item)
}
// Time: ~5 seconds for 100 items
// Latency: 50ms per item

// ✅ Fast: Batch operation
const items = await client.batchGet(keys)  // 1 network round trip
// Time: ~100ms for 100 items
// Latency: 1ms per item
```

### Cost comparison

```typescript
// Individual operations
// 100 GetItem requests = 100 RCU (assuming 4KB items)

// Batch operation
// 1 BatchGetItem request = 100 RCU (same cost, much faster)
```

**Key Insight:** Batch operations have the same RCU/WCU cost but are much faster due to reduced network overhead.

## Batch operation limits

### DynamoDB limits

| Operation | Max Items | Max Request Size | Max Item Size |
|-----------|-----------|------------------|---------------|
| BatchGet | 100 | 16 MB | 400 KB |
| BatchWrite | 25 | 16 MB | 400 KB |

### Library handling

The library automatically:
- ✅ Chunks requests to stay within limits
- ✅ Retries unprocessed items with exponential backoff
- ✅ Warns if items fail after max retries
- ✅ Validates item sizes

## Common patterns

### Load multiple related items

```typescript
import { PatternHelpers } from '@ddb-lib/core'

const userId = '123'

// Get user profile, settings, and preferences in one request
const items = await client.batchGet([
  {
    pk: PatternHelpers.entityKey('USER', userId),
    sk: 'PROFILE'
  },
  {
    pk: PatternHelpers.entityKey('USER', userId),
    sk: 'SETTINGS'
  },
  {
    pk: PatternHelpers.entityKey('USER', userId),
    sk: 'PREFERENCES'
  }
])

const profile = items.find(i => i.sk === 'PROFILE')
const settings = items.find(i => i.sk === 'SETTINGS')
const preferences = items.find(i => i.sk === 'PREFERENCES')
```

### Bulk data import

```typescript
// Import data from CSV or API
const records = await fetchRecordsFromAPI()

// Convert to batch write operations
const operations = records.map(record => ({
  type: 'put',
  item: {
    pk: PatternHelpers.entityKey('PRODUCT', record.id),
    sk: 'DETAILS',
    ...record,
    importedAt: new Date().toISOString()
  }
}))

// Write in batches (automatically chunked)
await client.batchWrite(operations)
console.log(`Imported ${records.length} records`)
```

### Bulk update with read-modify-write

```typescript
// 1. Batch get items
const items = await client.batchGet(keys)

// 2. Modify items
const operations = items.map(item => ({
  type: 'put',
  item: {
    ...item,
    status: 'PROCESSED',
    processedAt: new Date().toISOString()
  }
}))

// 3. Batch write back
await client.batchWrite(operations)
```

### Cleanup old items

```typescript
// Query old items
const result = await client.query({
  keyCondition: {
    pk: 'LOGS',
    sk: { lt: '2024-01-01' }
  }
})

// Delete in batch
const deleteOps = result.items.map(item => ({
  type: 'delete',
  key: { pk: item.pk, sk: item.sk }
}))

await client.batchWrite(deleteOps)
console.log(`Deleted ${deleteOps.length} old log entries`)
```

### Denormalization updates

```typescript
// Update denormalized data across multiple items
const userId = '123'
const newEmail = 'newemail@example.com'

// Update user profile and all related items
await client.batchWrite([
  {
    type: 'put',
    item: {
      pk: `USER#${userId}`,
      sk: 'PROFILE',
      email: newEmail,
      updatedAt: new Date().toISOString()
    }
  },
  {
    type: 'put',
    item: {
      pk: `USER#${userId}`,
      sk: 'CONTACT',
      email: newEmail,
      updatedAt: new Date().toISOString()
    }
  },
  {
    type: 'put',
    item: {
      pk: `NOTIFICATION#${userId}`,
      sk: 'SETTINGS',
      email: newEmail,
      updatedAt: new Date().toISOString()
    }
  }
])
```

## Best practices

### 1. use batch operations for multiple items

```typescript
// ❌ Bad: Loop with individual operations
for (const key of keys) {
  await client.get(key)
}

// ✅ Good: Single batch operation
await client.batchGet(keys)
```

### 2. handle missing items

BatchGet doesn't guarantee all items exist:

```typescript
const keys = [
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' },
  { pk: 'USER#999', sk: 'PROFILE' }  // Doesn't exist
]

const items = await client.batchGet(keys)
// items.length may be less than keys.length

// Create a map for easy lookup
const itemMap = new Map(items.map(item => [item.pk, item]))

for (const key of keys) {
  const item = itemMap.get(key.pk)
  if (item) {
    console.log('Found:', item)
  } else {
    console.log('Not found:', key.pk)
  }
}
```

### 3. use projection to reduce costs

```typescript
// ❌ Bad: Retrieve all attributes
const items = await client.batchGet(keys)

// ✅ Good: Project only needed attributes
const items = await client.batchGet(keys, {
  projectionExpression: ['pk', 'sk', 'name', 'status']
})
```

### 4. monitor unprocessed items

```typescript
// The library logs warnings for unprocessed items
// Monitor your logs for these warnings:
// ⚠️  BatchGet: 5 keys could not be processed after 3 attempts
// ⚠️  BatchWrite: 3 operations could not be processed after 3 attempts

// This indicates throttling or capacity issues
```

### 5. batch size considerations

```typescript
// For very large batches, consider processing in smaller chunks
const BATCH_SIZE = 1000
const allKeys = [...] // 10,000 keys

for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
  const batch = allKeys.slice(i, i + BATCH_SIZE)
  const items = await client.batchGet(batch)
  await processBatch(items)
  
  // Optional: Add delay between batches to avoid throttling
  await new Promise(resolve => setTimeout(resolve, 100))
}
```

## Limitations and considerations

### No conditional expressions

Batch operations don't support conditions:

```typescript
// ❌ Not possible with batch operations
await client.batchWrite([
  {
    type: 'put',
    item: { ... },
    condition: { pk: { attributeNotExists: true } }  // Not supported
  }
])

// ✅ Use transactions for conditional batch operations
await client.transactWrite([
  {
    type: 'put',
    item: { ... },
    condition: { pk: { attributeNotExists: true } }  // Supported
  }
])
```

### No atomicity

Batch operations are not atomic - some items may succeed while others fail:

```typescript
// Batch write with 25 items
await client.batchWrite(operations)

// Possible outcomes:
// - All 25 succeed
// - Some succeed, some fail (partial success)
// - All fail

// For atomic operations, use transactions
```

### Order not guaranteed

Items may be returned in a different order than requested:

```typescript
const keys = [
  { pk: 'USER#1', sk: 'PROFILE' },
  { pk: 'USER#2', sk: 'PROFILE' },
  { pk: 'USER#3', sk: 'PROFILE' }
]

const items = await client.batchGet(keys)
// items may be in any order

// Create a map if order matters
const itemMap = new Map(items.map(item => [item.pk, item]))
const orderedItems = keys.map(key => itemMap.get(key.pk)).filter(Boolean)
```

### Same table only

Batch operations work on a single table:

```typescript
// ❌ Not possible: Multiple tables in one batch
await client.batchGet([
  { pk: 'USER#1', sk: 'PROFILE' },  // table1
  { pk: 'ORDER#1', sk: 'DETAILS' }  // table2 - not supported
])

// ✅ Use separate batch operations per table
const users = await userClient.batchGet(userKeys)
const orders = await orderClient.batchGet(orderKeys)
```

## Error handling

```typescript
try {
  const items = await client.batchGet(keys)
  console.log(`Retrieved ${items.length} items`)
} catch (error) {
  if (error.name === 'ProvisionedThroughputExceededException') {
    console.error('Throttled - reduce batch size or increase capacity')
  } else if (error.name === 'ValidationException') {
    console.error('Invalid request:', error.message)
  } else if (error.name === 'ResourceNotFoundException') {
    console.error('Table not found')
  } else {
    console.error('Batch operation failed:', error)
  }
}
```

## Monitoring performance

Track batch operation performance with stats:

```typescript
const client = new TableClient({
  tableName: 'my-table',
  client: new DynamoDBClient({ region: 'us-east-1' }),
  statsConfig: {
    enabled: true,
    sampleRate: 1.0
  }
})

// Perform batch operations
await client.batchGet(keys)
await client.batchWrite(operations)

// Get statistics
const stats = client.getStats()
console.log('BatchGet stats:', stats.operations.batchGet)
console.log('BatchWrite stats:', stats.operations.batchWrite)

// Get recommendations
const recommendations = client.getRecommendations()
for (const rec of recommendations) {
  if (rec.category === 'batch') {
    console.log(`${rec.severity}: ${rec.message}`)
  }
}
```

## Next steps

- Learn about [Transactions](../../guides/transactions/) for atomic multi-item operations
- Explore [Access Patterns](../../guides/access-patterns/) for complex queries
- Review [Best Practices](../../best-practices/batch-operations/) for optimization
- Avoid [Inefficient Batching Anti-Pattern](../../anti-patterns/inefficient-batching.md)

