---
title: "Packages"
description: "Detailed overview of each ddb-lib package"
weight: 20
---

# Packages

ddb-lib consists of four packages, each serving a specific purpose. Choose the packages that fit your needs.

## @ddb-lib/core

**Pure utility functions for DynamoDB patterns**

### Installation

```bash
npm install @ddb-lib/core
```

### What's Included

- **Pattern Helpers**: Entity keys, composite keys, time-series keys, hierarchical keys, adjacency lists, distributed keys, GSI keys, sparse indexes
- **Multi-Attribute Keys**: Native support for DynamoDB's multi-attribute composite keys
- **Expression Builders**: Type-safe builders for key conditions, filters, and condition expressions
- **Type Guards**: Runtime type checking utilities

### When to Use

✅ You need pattern helpers for key construction  
✅ You want multi-attribute key utilities  
✅ You're building your own DynamoDB abstraction  
✅ You need expression builders  
✅ You want zero-dependency utilities

### Example

```typescript
import { PatternHelpers, multiTenantKey } from '@ddb-lib/core'

// Entity keys
const userKey = PatternHelpers.entityKey('USER', '123')

// Composite keys
const orderKey = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])

// Multi-attribute keys
const tenantKey = multiTenantKey('TENANT-1', 'CUST-123')
```

[View Core API Documentation →](/api/core/)

---

## @ddb-lib/stats

**Performance monitoring and optimization recommendations**

### Installation

```bash
npm install @ddb-lib/stats
```

### What's Included

- **StatsCollector**: Track operation latency, RCU/WCU, and item counts
- **RecommendationEngine**: Generate actionable optimization suggestions
- **AntiPatternDetector**: Identify scans, hot partitions, and inefficient queries
- **Framework Agnostic**: Works with any data access layer

### When to Use

✅ You want to monitor DynamoDB performance  
✅ You need anti-pattern detection  
✅ You want optimization recommendations  
✅ You're using a custom data access layer  
✅ You need performance metrics

### Example

```typescript
import { StatsCollector, RecommendationEngine } from '@ddb-lib/stats'

const stats = new StatsCollector({ enabled: true })

// Record operations
stats.record({
  operation: 'query',
  timestamp: Date.now(),
  latencyMs: 45,
  rcu: 5,
  itemCount: 10
})

// Get recommendations
const engine = new RecommendationEngine(stats)
const recommendations = engine.generateRecommendations()
```

[View Stats API Documentation →](/api/stats/)

---

## @ddb-lib/client

**Full-featured DynamoDB client for standalone applications**

### Installation

```bash
npm install @ddb-lib/client
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### What's Included

- **Complete DynamoDB API**: All operations with simplified interface
- **Built-in Monitoring**: Automatic statistics collection
- **Pattern Helpers**: Integrated utilities from @ddb-lib/core
- **Retry Logic**: Configurable exponential backoff
- **Access Patterns**: Named, reusable query patterns
- **Type Safety**: Full TypeScript support

### When to Use

✅ You're building a standalone Node.js application  
✅ You want a simplified DynamoDB interface  
✅ You need built-in monitoring and best practices  
✅ You're not using Amplify  
✅ You want automatic batching and retry logic

### Example

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'users',
  region: 'us-east-1',
  statsConfig: { enabled: true }
})

// CRUD operations
await table.put({ pk: 'USER#123', sk: 'PROFILE', name: 'Alice' })
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })

// Get recommendations
const recommendations = table.getRecommendations()
```

[View Client API Documentation →](/api/client/)

---

## @ddb-lib/amplify

**AWS Amplify Gen 2 integration with monitoring**

### Installation

```bash
npm install @ddb-lib/amplify
npm install aws-amplify
```

### What's Included

- **AmplifyMonitor**: Wrap Amplify data client with monitoring
- **Automatic Tracking**: Zero-config operation monitoring
- **Pattern Helpers**: DynamoDB best practices for Amplify
- **Type Safe**: Preserves Amplify's type definitions
- **Non-Invasive**: Doesn't modify Amplify's behavior

### When to Use

✅ You're using AWS Amplify Gen 2  
✅ You want to monitor Amplify operations  
✅ You need DynamoDB best practices with Amplify  
✅ You want pattern helpers for Amplify keys  
✅ You need performance insights for Amplify

### Example

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'

const client = generateClient()
const monitor = new AmplifyMonitor({ statsConfig: { enabled: true } })

// Wrap your model
const monitoredTodos = monitor.wrap(client.models.Todo)

// Operations are automatically monitored
await monitoredTodos.create({ title: 'Buy groceries' })

// Get insights
const stats = monitor.getStats()
const recommendations = monitor.getRecommendations()
```

[View Amplify API Documentation →](/api/amplify/)

---

## Package Comparison

| Feature | Core | Stats | Client | Amplify |
|---------|------|-------|--------|---------|
| Pattern Helpers | ✅ | ❌ | ✅ | ✅ |
| Multi-Attribute Keys | ✅ | ❌ | ✅ | ✅ |
| Statistics Collection | ❌ | ✅ | ✅ | ✅ |
| Recommendations | ❌ | ✅ | ✅ | ✅ |
| Anti-Pattern Detection | ❌ | ✅ | ✅ | ✅ |
| DynamoDB Operations | ❌ | ❌ | ✅ | ❌ |
| Amplify Integration | ❌ | ❌ | ❌ | ✅ |
| Dependencies | None | Core | Core, Stats, AWS SDK | Core, Stats, Amplify |
| Bundle Size (gzipped) | ~8KB | ~15KB | ~35KB | ~12KB |

## Choosing Packages

### Scenario 1: Standalone Application

**Install**: `@ddb-lib/client`

This includes everything you need: core utilities, statistics, and the full DynamoDB client.

### Scenario 2: Amplify Application

**Install**: `@ddb-lib/amplify`

This includes core utilities, statistics, and Amplify integration.

### Scenario 3: Custom Implementation

**Install**: `@ddb-lib/core` and optionally `@ddb-lib/stats`

Use the utilities with your own data access layer.

### Scenario 4: Just Utilities

**Install**: `@ddb-lib/core`

Get pattern helpers and utilities without any client or monitoring.

## Version Compatibility

All packages are versioned together and should use the same version:

```json
{
  "dependencies": {
    "@ddb-lib/core": "^0.1.0",
    "@ddb-lib/stats": "^0.1.0",
    "@ddb-lib/client": "^0.1.0"
  }
}
```

## Peer Dependencies

### @ddb-lib/client

Requires AWS SDK v3:
```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### @ddb-lib/amplify

Requires aws-amplify:
```bash
npm install aws-amplify
```

## TypeScript Support

All packages include TypeScript definitions and support:
- Type inference
- Strict typing
- Generic types
- Type guards

Minimum TypeScript version: 5.0.0

## Node.js Support

Minimum Node.js version: 18.0.0

All packages are tested on:
- Node.js 18.x (LTS)
- Node.js 20.x (LTS)
- Node.js 22.x (Current)

## License

All packages are licensed under MIT.
