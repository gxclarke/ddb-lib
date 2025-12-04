---
title: Missing Projections Anti-Pattern
description: Avoid retrieving entire items when you only need specific attributes
---

# Missing projections anti-pattern

## What is it?

The missing projections anti-pattern occurs when developers retrieve entire items from DynamoDB when they only need a few specific attributes. This wastes read capacity, bandwidth, and money by transferring unnecessary data.

## Why is it a problem?

Retrieving full items when you only need specific attributes creates waste:

- **Wasted Capacity**: Pay for reading data you don't use
- **Higher Costs**: RCU consumption based on item size, not attributes used
- **Slower Performance**: More data to transfer over the network
- **Bandwidth Waste**: Unnecessary data transfer
- **Memory Pressure**: Larger objects in application memory
- **Parsing Overhead**: Deserializing unused attributes

### The hidden cost

If your items are 10KB but you only need 1KB of attributes:

- **Without projection**: 10KB read = 3 RCU per item
- **With projection**: 1KB read = 1 RCU per item
- **Waste**: 2 RCU per item (67% wasted capacity)

## Visual comparison



## Example of the problem

### ❌ anti-pattern: no projection expression

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'Users',
  // ... config
})

// BAD: Retrieving entire user object
const result = await table.get({
  pk: `USER#${userId}`,
  sk: 'PROFILE'
})

// Item contains:
// - name (100 bytes)
// - email (50 bytes)
// - profileImage (5 KB)
// - preferences (2 KB)
// - activityHistory (10 KB)
// - metadata (1 KB)
// Total: ~18 KB = 5 RCU

// But we only need the name!
const userName = result.item.name  // Used only 100 bytes out of 18 KB
```

### ❌ common scenarios

```typescript
// BAD: Query without projection
const orders = await table.query({
  keyCondition: {
    pk: `USER#${userId}`,
    sk: { beginsWith: 'ORDER#' }
  }
})

// Each order is 20 KB (includes full product details, shipping info, etc.)
// But we only need orderId and status for the list view
// Wasting 95% of read capacity!

for (const order of orders.items) {
  console.log(order.orderId, order.status)  // Only using 2 attributes
}

// BAD: Scan without projection
const activeUsers = await table.scan({
  filter: {
    status: { eq: 'ACTIVE' }
  }
})

// Reading entire user profiles (10 KB each)
// But only need userId and email for notification
// Massive waste!

// BAD: Batch get without projection
const users = await table.batchGet({
  keys: userIds.map(id => ({
    pk: `USER#${id}`,
    sk: 'PROFILE'
  }))
})

// Getting full profiles for all users
// But only displaying names in UI
```

## The solution

### ✅ use projection expressions

```typescript
// GOOD: Get only needed attributes
const result = await table.get({
  pk: `USER#${userId}`,
  sk: 'PROFILE',
  projection: ['name']
})

// Only transfers 100 bytes = 1 RCU
// 80% cost reduction!

const userName = result.item.name
```

### ✅ query with projection

```typescript
// GOOD: Query with projection
const orders = await table.query({
  keyCondition: {
    pk: `USER#${userId}`,
    sk: { beginsWith: 'ORDER#' }
  },
  projection: ['orderId', 'status', 'createdAt', 'total']
})

// Each order now ~500 bytes instead of 20 KB
// 95% cost reduction!

for (const order of orders.items) {
  console.log(order.orderId, order.status)
}
```

### ✅ scan with projection

```typescript
// GOOD: Scan with projection (when scan is necessary)
const activeUsers = await table.scan({
  filter: {
    status: { eq: 'ACTIVE' }
  },
  projection: ['userId', 'email', 'name']
})

// Each user now ~200 bytes instead of 10 KB
// 98% cost reduction!
```

### ✅ batch get with projection

```typescript
// GOOD: Batch get with projection
const users = await table.batchGet({
  keys: userIds.map(id => ({
    pk: `USER#${id}`,
    sk: 'PROFILE'
  })),
  projection: ['name', 'email']
})

// Only get what you need
// Significant cost savings
```

### ✅ nested attribute projection

```typescript
// GOOD: Project nested attributes
const result = await table.get({
  pk: `USER#${userId}`,
  sk: 'PROFILE',
  projection: [
    'name',
    'email',
    'address.city',      // Nested attribute
    'address.country',   // Nested attribute
    'preferences.theme'  // Nested attribute
  ]
})

// Get only specific nested fields
// Don't retrieve entire nested objects
```

### ✅ different projections for different use cases

```typescript
// List view: minimal data
async function getUserList() {
  return await table.query({
    keyCondition: { pk: 'USERS' },
    projection: ['userId', 'name', 'email']
  })
}

// Detail view: more data
async function getUserDetail(userId: string) {
  return await table.get({
    pk: `USER#${userId}`,
    sk: 'PROFILE',
    projection: [
      'userId',
      'name', 
      'email',
      'phone',
      'address',
      'preferences',
      'createdAt'
    ]
  })
}

// Edit view: all data
async function getUserForEdit(userId: string) {
  return await table.get({
    pk: `USER#${userId}`,
    sk: 'PROFILE'
    // No projection - need everything for editing
  })
}
```

## Cost impact

### Real-world example

Scenario: E-commerce order list (1 million views per month)

**Without Projection:**
```typescript
// Full order item: 20 KB
// RCU per item: 5
// Total RCU: 5 million
// Cost: $0.25 per million = $1.25
```

**With Projection:**
```typescript
// Projected attributes: 500 bytes
// RCU per item: 1
// Total RCU: 1 million
// Cost: $0.25 per million = $0.25
// Savings: $1.00/month (80%)
```

### Cost comparison table

| Item Size | Attributes Needed | Without Projection | With Projection | Savings |
|-----------|------------------|-------------------|-----------------|---------|
| 1 KB | 100 bytes | 1 RCU | 1 RCU | 0% |
| 4 KB | 400 bytes | 1 RCU | 1 RCU | 0% |
| 5 KB | 500 bytes | 2 RCU | 1 RCU | 50% |
| 10 KB | 1 KB | 3 RCU | 1 RCU | 67% |
| 20 KB | 2 KB | 5 RCU | 1 RCU | 80% |
| 50 KB | 5 KB | 13 RCU | 2 RCU | 85% |
| 100 KB | 10 KB | 25 RCU | 3 RCU | 88% |

### Monthly cost impact

For 10 million reads per month at $0.25 per million RCU:

| Scenario | RCU per Read | Total RCU | Monthly Cost | Annual Cost |
|----------|--------------|-----------|--------------|-------------|
| **No Projection (20 KB items)** | 5 | 50 million | $12.50 | $150 |
| **With Projection (2 KB)** | 1 | 10 million | $2.50 | $30 |
| **Savings** | - | 40 million | **$10/month** | **$120/year** |

## Detection

The anti-pattern detector can identify missing projections:

```typescript
import { StatsCollector, AntiPatternDetector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const detector = new AntiPatternDetector(stats)

// After running operations
const issues = detector.detectMissingProjections()

for (const issue of issues) {
  console.log(issue.message)
  // "Query on 'Orders' table retrieving full items (avg 18 KB)"
  // "Consider using projection expressions to reduce capacity consumption"
  // "Potential savings: 4 RCU per item (80%)"
}
```

### Warning signs

You might have this anti-pattern if:

- Your read capacity costs are higher than expected
- You're transferring large amounts of data
- Your application only uses a few attributes from items
- You see high RCU consumption on queries
- Network transfer is slow

## Performance impact

### Latency improvement

| Item Size | Without Projection | With Projection | Improvement |
|-----------|-------------------|-----------------|-------------|
| 10 KB | 25ms | 15ms | 40% faster |
| 50 KB | 80ms | 20ms | 75% faster |
| 100 KB | 150ms | 25ms | 83% faster |

### Throughput improvement

With the same provisioned capacity:

```
Provisioned: 1,000 RCU

Without Projection (5 RCU per item):
- Throughput: 200 items/second

With Projection (1 RCU per item):
- Throughput: 1,000 items/second
- 5x improvement!
```

## Best practices

### Analyze your access patterns

```typescript
// Identify what attributes you actually use
function analyzeAttributeUsage(items: any[]) {
  const usedAttributes = new Set<string>()
  
  for (const item of items) {
    // Track which attributes your code accesses
    if (item.name) usedAttributes.add('name')
    if (item.email) usedAttributes.add('email')
    // ... etc
  }
  
  console.log('Used attributes:', Array.from(usedAttributes))
  console.log('Total attributes in items:', Object.keys(items[0]).length)
  
  // Use this to create optimal projection expressions
}
```

### Create projection helpers

```typescript
// Define projections for common use cases
const PROJECTIONS = {
  userList: ['userId', 'name', 'email', 'status'],
  userCard: ['userId', 'name', 'profileImage', 'memberSince'],
  userDetail: ['userId', 'name', 'email', 'phone', 'address', 'preferences'],
  orderList: ['orderId', 'status', 'total', 'createdAt'],
  orderDetail: ['orderId', 'status', 'total', 'items', 'shipping', 'createdAt']
}

// Use in queries
const users = await table.query({
  keyCondition: { pk: 'USERS' },
  projection: PROJECTIONS.userList
})
```

### Document projections

```typescript
/**
 * Get user profile for list view
 * Projection: name, email, status (reduces RCU by 80%)
 */
async function getUserListItem(userId: string) {
  return await table.get({
    pk: `USER#${userId}`,
    sk: 'PROFILE',
    projection: ['name', 'email', 'status']
  })
}
```

## When to skip projections

Projections aren't always beneficial:

### Skip projections when:

1. **You need all attributes** (edit forms, full details)
2. **Items are small** (<4 KB and you need most attributes)
3. **Projection would include most attributes anyway** (>80% of item)
4. **Caching full items** (better to cache complete data)

```typescript
// OK: Skip projection when you need everything
async function getUserForEdit(userId: string) {
  return await table.get({
    pk: `USER#${userId}`,
    sk: 'PROFILE'
    // No projection - need all attributes for editing
  })
}

// OK: Small items where projection doesn't help much
async function getConfig(key: string) {
  return await table.get({
    pk: 'CONFIG',
    sk: key
    // Config items are tiny (< 1 KB), projection overhead not worth it
  })
}
```

## Related resources

- [Projection Expressions Best Practice](../best-practices/projection-expressions.md)
- [Query and Scan Guide](../guides/query-and-scan/)
- [Core Operations Guide](../guides/core-operations/)

## Summary

**The Problem**: Retrieving entire items when you only need specific attributes wastes 50-90% of read capacity and increases latency.

**The Solution**: Use projection expressions to retrieve only the attributes you need for each use case.

**The Impact**: Projection expressions can reduce read capacity consumption by 50-90% and improve latency by 40-80%.

Remember: Every byte you read from DynamoDB costs money and time. Use projection expressions to read only what you need. Your wallet and your users will thank you.

