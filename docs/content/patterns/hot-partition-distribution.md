---
title: "Hot Partition Distribution Pattern"
description: "Distributing load across partitions to prevent throttling"
type: docs
weight: 60
---

# Hot Partition Distribution Pattern

## What is it?

The hot partition distribution pattern (also known as write sharding) distributes high-volume writes across multiple partition keys to prevent throttling. This pattern adds a shard suffix to partition keys, spreading the load evenly across multiple partitions.

The pattern uses the format: `BASE_KEY#SHARD_{N}` where N is a number from 0 to shard count - 1.

For example with 10 shards:
- `ACTIVE_USERS#SHARD_0`
- `ACTIVE_USERS#SHARD_1`
- `ACTIVE_USERS#SHARD_2`
- ... up to `ACTIVE_USERS#SHARD_9`

## Why is it important?

### Prevents Throttling
DynamoDB partitions have throughput limits (3,000 RCU and 1,000 WCU per partition). High-volume writes to a single partition key will cause throttling. Sharding distributes the load.

### Scales Beyond Single Partition Limits
By distributing across N shards, you can achieve N times the throughput of a single partition.

### Maintains Performance
Even distribution prevents hot partitions that slow down your entire application.

### Cost Efficiency
Prevents wasted capacity on underutilized partitions while others are throttled.

## Visual Representation

{{< pattern-diagram mermaid="true" caption="Hot Partition Problem" >}}
graph TD
    Writes[High Volume Writes] --> Hot[ACTIVE_USERS]
    Hot --> Throttle[⚠️ THROTTLED]
    style Hot fill:#FF5252
    style Throttle fill:#FF5252
{{< /pattern-diagram >}}

{{< pattern-diagram mermaid="true" caption="Distributed Solution" >}}
graph TD
    Writes[High Volume Writes]
    Writes --> S0[ACTIVE_USERS#SHARD_0]
    Writes --> S1[ACTIVE_USERS#SHARD_1]
    Writes --> S2[ACTIVE_USERS#SHARD_2]
    Writes --> S3[ACTIVE_USERS#SHARD_3]
    S0 --> OK0[✓ Normal]
    S1 --> OK1[✓ Normal]
    S2 --> OK2[✓ Normal]
    S3 --> OK3[✓ Normal]
    style S0 fill:#4CAF50
    style S1 fill:#4CAF50
    style S2 fill:#4CAF50
    style S3 fill:#4CAF50
{{< /pattern-diagram >}}

## Implementation

The `@ddb-lib/core` package provides helper functions for working with distributed keys:

### Creating Distributed Keys

{{< code-example lang="typescript" title="Creating Distributed Keys" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Create distributed key with 10 shards
const key1 = PatternHelpers.distributedKey('ACTIVE_USERS', 10)
console.log(key1) // 'ACTIVE_USERS#SHARD_7' (random 0-9)

const key2 = PatternHelpers.distributedKey('ACTIVE_USERS', 10)
console.log(key2) // 'ACTIVE_USERS#SHARD_3' (random 0-9)

// Create distributed key with 100 shards for very high volume
const key3 = PatternHelpers.distributedKey('POPULAR_ITEM', 100)
console.log(key3) // 'POPULAR_ITEM#SHARD_42' (random 0-99)
{{< /code-example >}}

### Extracting Shard Number

{{< code-example lang="typescript" title="Extracting Shard Number" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Get shard number from distributed key
const shardNum = PatternHelpers.getShardNumber('ACTIVE_USERS#SHARD_7')
console.log(shardNum) // 7

// Returns null for non-distributed keys
const notSharded = PatternHelpers.getShardNumber('REGULAR_KEY')
console.log(notSharded) // null
{{< /code-example >}}

### Using with TableClient

{{< code-example lang="typescript" title="Distributed Writes with TableClient" >}}
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'Analytics',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// Write to distributed partition
async function recordActiveUser(userId: string) {
  const timestamp = new Date().toISOString()
  
  await table.put({
    pk: PatternHelpers.distributedKey('ACTIVE_USERS', 10),
    sk: PatternHelpers.compositeKey([timestamp, userId]),
    userId,
    timestamp,
    activity: 'page_view'
  })
}

// High-volume writes are distributed across 10 partitions
for (let i = 0; i < 1000; i++) {
  await recordActiveUser(`user-${i}`)
}
{{< /code-example >}}

### Querying Distributed Data

{{< code-example lang="typescript" title="Querying All Shards" >}}
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

// Query all shards to get complete data
async function getAllActiveUsers(shardCount: number) {
  const allUsers = []
  
  // Query each shard
  for (let shard = 0; shard < shardCount; shard++) {
    const shardKey = `ACTIVE_USERS#SHARD_${shard}`
    
    const result = await table.query({
      keyCondition: {
        pk: shardKey
      }
    })
    
    allUsers.push(...result.items)
  }
  
  return allUsers
}

// Get all active users from 10 shards
const activeUsers = await getAllActiveUsers(10)

// Query shards in parallel for better performance
async function getAllActiveUsersParallel(shardCount: number) {
  const queries = []
  
  for (let shard = 0; shard < shardCount; shard++) {
    const shardKey = `ACTIVE_USERS#SHARD_${shard}`
    queries.push(
      table.query({
        keyCondition: { pk: shardKey }
      })
    )
  }
  
  const results = await Promise.all(queries)
  return results.flatMap(r => r.items)
}

const activeUsersParallel = await getAllActiveUsersParallel(10)
{{< /code-example >}}

## Common Use Cases

### Use Case 1: Real-Time Analytics

{{< code-example lang="typescript" title="High-Volume Event Tracking" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Track page views (very high volume)
async function trackPageView(
  userId: string,
  page: string,
  metadata: any
) {
  const timestamp = new Date()
  
  await table.put({
    pk: PatternHelpers.distributedKey('PAGE_VIEWS', 50),
    sk: PatternHelpers.compositeKey([
      timestamp.toISOString(),
      userId
    ]),
    userId,
    page,
    metadata,
    timestamp: timestamp.toISOString()
  })
}

// Get page views for last hour (query all shards)
async function getRecentPageViews(minutes: number = 60) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000)
  const allViews = []
  
  for (let shard = 0; shard < 50; shard++) {
    const result = await table.query({
      keyCondition: {
        pk: `PAGE_VIEWS#SHARD_${shard}`,
        sk: { gte: cutoff.toISOString() }
      }
    })
    allViews.push(...result.items)
  }
  
  return allViews
}

// Aggregate page views by page
async function getPageViewCounts(minutes: number = 60) {
  const views = await getRecentPageViews(minutes)
  const counts = new Map()
  
  for (const view of views) {
    const count = counts.get(view.page) || 0
    counts.set(view.page, count + 1)
  }
  
  return Array.from(counts.entries())
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
}
{{< /code-example >}}

### Use Case 2: Rate Limiting

{{< code-example lang="typescript" title="Distributed Rate Limiting" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Track API requests with sharding
async function recordApiRequest(
  apiKey: string,
  endpoint: string
) {
  const timestamp = new Date()
  const minute = PatternHelpers.timeSeriesKey(timestamp, 'hour')
  
  // Shard by API key to distribute load
  const shardKey = PatternHelpers.distributedKey(
    `RATE_LIMIT#${apiKey}`,
    10
  )
  
  await table.put({
    pk: shardKey,
    sk: PatternHelpers.compositeKey([minute, timestamp.toISOString()]),
    apiKey,
    endpoint,
    timestamp: timestamp.toISOString(),
    ttl: PatternHelpers.ttlTimestamp(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    )
  })
}

// Check rate limit (query all shards for this API key)
async function checkRateLimit(
  apiKey: string,
  limitPerHour: number
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  let totalRequests = 0
  
  for (let shard = 0; shard < 10; shard++) {
    const shardKey = `RATE_LIMIT#${apiKey}#SHARD_${shard}`
    
    const result = await table.query({
      keyCondition: {
        pk: shardKey,
        sk: { gte: oneHourAgo.toISOString() }
      },
      select: 'COUNT'
    })
    
    totalRequests += result.count
  }
  
  return totalRequests < limitPerHour
}
{{< /code-example >}}

### Use Case 3: Leaderboard Updates

{{< code-example lang="typescript" title="High-Volume Score Updates" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Update player score (high volume during events)
async function updateScore(
  playerId: string,
  gameId: string,
  score: number
) {
  const timestamp = new Date()
  
  // Shard score updates to handle high volume
  await table.put({
    pk: PatternHelpers.distributedKey(`GAME#${gameId}#SCORES`, 20),
    sk: PatternHelpers.compositeKey([
      timestamp.toISOString(),
      playerId
    ]),
    playerId,
    gameId,
    score,
    timestamp: timestamp.toISOString()
  })
}

// Calculate leaderboard (aggregate from all shards)
async function calculateLeaderboard(
  gameId: string,
  topN: number = 100
) {
  const playerScores = new Map()
  
  // Query all shards
  for (let shard = 0; shard < 20; shard++) {
    const result = await table.query({
      keyCondition: {
        pk: `GAME#${gameId}#SCORES#SHARD_${shard}`
      }
    })
    
    // Keep highest score for each player
    for (const item of result.items) {
      const currentScore = playerScores.get(item.playerId) || 0
      if (item.score > currentScore) {
        playerScores.set(item.playerId, item.score)
      }
    }
  }
  
  // Sort and return top N
  return Array.from(playerScores.entries())
    .map(([playerId, score]) => ({ playerId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
{{< /code-example >}}

### Use Case 4: Session Tracking

{{< code-example lang="typescript" title="Active Session Tracking" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Track active sessions (high volume)
async function createSession(
  userId: string,
  sessionId: string,
  metadata: any
) {
  const timestamp = new Date()
  
  await table.put({
    pk: PatternHelpers.distributedKey('ACTIVE_SESSIONS', 25),
    sk: PatternHelpers.compositeKey([sessionId, userId]),
    userId,
    sessionId,
    metadata,
    createdAt: timestamp.toISOString(),
    ttl: PatternHelpers.ttlTimestamp(
      new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    )
  })
}

// Count active sessions
async function countActiveSessions() {
  let total = 0
  
  const queries = []
  for (let shard = 0; shard < 25; shard++) {
    queries.push(
      table.query({
        keyCondition: {
          pk: `ACTIVE_SESSIONS#SHARD_${shard}`
        },
        select: 'COUNT'
      })
    )
  }
  
  const results = await Promise.all(queries)
  return results.reduce((sum, r) => sum + r.count, 0)
}

// Get all active sessions (parallel queries)
async function getAllActiveSessions() {
  const queries = []
  
  for (let shard = 0; shard < 25; shard++) {
    queries.push(
      table.query({
        keyCondition: {
          pk: `ACTIVE_SESSIONS#SHARD_${shard}`
        }
      })
    )
  }
  
  const results = await Promise.all(queries)
  return results.flatMap(r => r.items)
}
{{< /code-example >}}

## When to Use

### ✅ Use Hot Partition Distribution When:

- **High write volume**: Writing more than 1,000 WCU to a single partition key
- **Popular items**: Tracking views/likes for viral content
- **Real-time analytics**: High-volume event tracking
- **Rate limiting**: Tracking requests across many users
- **Session management**: Managing thousands of concurrent sessions

### ❌ Avoid Hot Partition Distribution When:

- **Low volume**: Writes are well below partition limits
- **Natural distribution**: Your partition keys already distribute well
- **Simple queries**: You need simple, single-partition queries
- **Read-heavy**: The pattern adds complexity mainly for write-heavy scenarios

### ⚠️ Considerations:

- **Query complexity**: Reading requires querying all shards
- **Shard count**: Choose based on expected throughput (1,000 WCU per shard)
- **Consistency**: Aggregating across shards may have slight delays
- **Cost**: More queries needed to read complete data

## Best Practices

### 1. Choose Appropriate Shard Count

```typescript
// ✅ Good: Calculate based on expected throughput
// Expected: 10,000 writes/second
// DynamoDB limit: 1,000 WCU per partition
// Shard count: 10,000 / 1,000 = 10 shards (minimum)
// Add buffer: 15-20 shards

const SHARD_COUNT = 20
PatternHelpers.distributedKey('HIGH_VOLUME', SHARD_COUNT)

// ❌ Bad: Too few shards
const SHARD_COUNT = 2 // Still causes hot partitions

// ❌ Bad: Too many shards
const SHARD_COUNT = 1000 // Unnecessary query overhead
```

### 2. Use Parallel Queries

```typescript
// ✅ Good: Query shards in parallel
async function queryAllShards(baseKey: string, shardCount: number) {
  const queries = Array.from({ length: shardCount }, (_, shard) =>
    table.query({
      keyCondition: { pk: `${baseKey}#SHARD_${shard}` }
    })
  )
  
  const results = await Promise.all(queries)
  return results.flatMap(r => r.items)
}

// ❌ Bad: Sequential queries
async function queryAllShardsSequential(baseKey: string, shardCount: number) {
  const items = []
  for (let shard = 0; shard < shardCount; shard++) {
    const result = await table.query({
      keyCondition: { pk: `${baseKey}#SHARD_${shard}` }
    })
    items.push(...result.items)
  }
  return items
}
```

### 3. Use TTL for Temporary Data

```typescript
// ✅ Good: Use TTL to automatically clean up sharded data
await table.put({
  pk: PatternHelpers.distributedKey('ACTIVE_SESSIONS', 25),
  sk: sessionId,
  data: sessionData,
  ttl: PatternHelpers.ttlTimestamp(
    new Date(Date.now() + 30 * 60 * 1000)
  )
})
```

### 4. Monitor Shard Distribution

```typescript
// ✅ Good: Monitor to ensure even distribution
async function checkShardDistribution(baseKey: string, shardCount: number) {
  const counts = []
  
  for (let shard = 0; shard < shardCount; shard++) {
    const result = await table.query({
      keyCondition: { pk: `${baseKey}#SHARD_${shard}` },
      select: 'COUNT'
    })
    counts.push({ shard, count: result.count })
  }
  
  // Check for imbalance
  const avg = counts.reduce((sum, c) => sum + c.count, 0) / shardCount
  const maxDeviation = Math.max(...counts.map(c => Math.abs(c.count - avg)))
  
  if (maxDeviation > avg * 0.2) {
    console.warn('Shard distribution imbalance detected')
  }
  
  return counts
}
```

### 5. Cache Aggregated Results

```typescript
// ✅ Good: Cache expensive aggregations
const cache = new Map()

async function getAggregatedData(
  baseKey: string,
  shardCount: number,
  cacheTTL: number = 60000
) {
  const cacheKey = `${baseKey}:${Date.now() / cacheTTL | 0}`
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }
  
  const data = await queryAllShards(baseKey, shardCount)
  cache.set(cacheKey, data)
  
  // Clean old cache entries
  setTimeout(() => cache.delete(cacheKey), cacheTTL)
  
  return data
}
```

## Performance Considerations

### Write Performance

```typescript
// ✅ Distributed writes scale linearly with shard count
// 10 shards = 10,000 WCU capacity
// 100 shards = 100,000 WCU capacity

// Each write goes to random shard
for (let i = 0; i < 10000; i++) {
  await table.put({
    pk: PatternHelpers.distributedKey('EVENTS', 10),
    sk: `event-${i}`,
    data: eventData
  })
}
```

### Read Performance

```typescript
// ⚠️ Reading requires N queries (one per shard)
// Use parallel queries to minimize latency

// Sequential: N * query_time
// Parallel: max(query_times) ≈ single query time

const results = await Promise.all(
  Array.from({ length: shardCount }, (_, i) =>
    table.query({ keyCondition: { pk: `BASE#SHARD_${i}` } })
  )
)
```

### Cost Considerations

```typescript
// ⚠️ Reading all shards costs N queries
// Consider:
// - Use COUNT for aggregations when possible
// - Cache results when appropriate
// - Use time-based filtering to reduce data scanned
// - Consider GSI for read-heavy access patterns
```

## Choosing Shard Count

### Formula

```
Shard Count = (Expected Peak WCU / 1000) * Safety Factor

Safety Factor: 1.5 - 2.0 for buffer
```

### Examples

```typescript
// Low volume: 500 WCU
// Shard count: (500 / 1000) * 1.5 = 1 (no sharding needed)

// Medium volume: 5,000 WCU
// Shard count: (5000 / 1000) * 1.5 = 8 shards

// High volume: 50,000 WCU
// Shard count: (50000 / 1000) * 1.5 = 75 shards

// Very high volume: 500,000 WCU
// Shard count: (500000 / 1000) * 1.5 = 750 shards
```

## Related Patterns

- [Entity Keys](/patterns/entity-keys/) - Foundation for distributed keys
- [Composite Keys](/patterns/composite-keys/) - Combine with sharding
- [Time-Series](/patterns/time-series/) - Often needs sharding for high volume
- [Sparse Indexes](/patterns/sparse-indexes/) - Alternative for read optimization

## Additional Resources

- [Best Practices: Capacity Planning](/best-practices/capacity-planning/)
- [Anti-Patterns: Hot Partitions](/anti-patterns/hot-partitions/)
- [Monitoring Guide](/guides/monitoring/)
- [API Reference: PatternHelpers](/api/core/#patternhelpers-class)
