---
title: "@ddb-lib/amplify API"
weight: 40
description: "AWS Amplify Gen 2 integration helpers"
type: docs
---

# @ddb-lib/amplify API Reference

AWS Amplify Gen 2 integration providing monitoring and pattern helpers for Amplify data operations.

## Installation

```bash
npm install @ddb-lib/amplify @ddb-lib/core @ddb-lib/stats aws-amplify
```

## Quick Start

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'

const client = generateClient()
const monitor = new AmplifyMonitor(client)

// Operations are automatically monitored
const user = await client.models.User.get({ id: '123' })
const users = await client.models.User.list()

// Get statistics
const stats = monitor.getStats()
console.log(`Total operations: ${stats.totalOperations}`)

// Get recommendations
const recommendations = monitor.getRecommendations()
```

## AmplifyMonitor Class

Monitor Amplify data operations with statistics collection.

### Constructor

```typescript
new AmplifyMonitor(client: AmplifyClient, config?: MonitorConfig)
```

**Parameters:**
- `client` - Amplify data client
- `config` - Optional configuration
  - `enableStats?: boolean` - Enable statistics (default: true)
  - `enableRecommendations?: boolean` - Enable recommendations (default: true)

### getStats()
Get operation statistics.

```typescript
getStats(): Stats
```

### getRecommendations()
Get optimization recommendations.

```typescript
getRecommendations(): Recommendation[]
```

## AmplifyHelpers Class

Pattern helpers for Amplify schemas.

### entityKey()
Create entity keys for Amplify models.

```typescript
static entityKey(modelName: string, id: string): string
```

### compositeKey()
Create composite keys for Amplify relationships.

```typescript
static compositeKey(parts: string[]): string
```

## Integration Example

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor, AmplifyHelpers } from '@ddb-lib/amplify'
import type { Schema } from './amplify/data/resource'

const client = generateClient<Schema>()
const monitor = new AmplifyMonitor(client)

// Use pattern helpers
const userKey = AmplifyHelpers.entityKey('User', '123')

// Monitored operations
await client.models.User.create({
  id: userKey,
  name: 'John Doe',
  email: 'john@example.com'
})

// View statistics
const stats = monitor.getStats()
console.log(`Operations: ${stats.totalOperations}`)
console.log(`Avg latency: ${stats.avgLatency}ms`)
```

## Related Resources

- [Amplify Quick Start](/getting-started/amplify/)
- [Amplify Examples](/examples/amplify/)
- [Monitoring Guide](/guides/monitoring/)

