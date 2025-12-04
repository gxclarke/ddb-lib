---
title: ddb-lib
description: Modular TypeScript library for AWS DynamoDB with best practices, pattern helpers, and performance monitoring
---

# Ddb-lib

A modular TypeScript library that makes working with AWS DynamoDB easier, faster, and more reliable.

Whether you're building with standalone DynamoDB or AWS Amplify Gen 2, ddb-lib provides the tools you need to implement best practices and avoid common pitfalls.

**Modular • Type-Safe • Performance-Focused**

## Features

### :bulb: Modular architecture
Install only what you need. Use core utilities standalone, add monitoring, or integrate with Amplify.

### :chart_with_upwards_trend: Performance monitoring
Built-in statistics collection, anti-pattern detection, and actionable recommendations.

### :shield: Best practices built-in
Pattern helpers, multi-attribute keys, and utilities that guide you toward optimal DynamoDB usage.

### :keyboard: Type safe
Full TypeScript support with type inference and validation throughout.

### :jigsaw: DynamoDB patterns
Learn and implement proven DynamoDB design patterns with helper functions.

### :rocket: Quick start
Get up and running in minutes with comprehensive guides and examples.

## Package overview

### @ddb-lib/core
Pattern helpers and utilities for DynamoDB best practices.

```bash
npm install @ddb-lib/core
```

[Learn more about @ddb-lib/core](api/core/index.md)

### @ddb-lib/stats
Performance monitoring and anti-pattern detection.

```bash
npm install @ddb-lib/stats
```

[Learn more about @ddb-lib/stats](api/stats/index.md)

### @ddb-lib/client
Standalone DynamoDB client with monitoring.

```bash
npm install @ddb-lib/client
```

[Learn more about @ddb-lib/client](api/client/index.md)

### @ddb-lib/amplify
Seamless Amplify Gen 2 integration.

```bash
npm install @ddb-lib/amplify
```

[Learn more about @ddb-lib/amplify](api/amplify/index.md)

## Quick examples

### Standalone usage

```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'users',
  statsConfig: { enabled: true }
})

// Use pattern helpers
const userKey = PatternHelpers.entityKey('USER', '123')

// Perform operations
await table.put({ 
  pk: userKey, 
  sk: 'PROFILE', 
  name: 'Alice' 
})

// Get recommendations
const recommendations = table.getRecommendations()
```

### Amplify integration

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'

const client = generateClient()
const monitor = new AmplifyMonitor({ 
  statsConfig: { enabled: true } 
})

// Wrap your model
const monitoredTodos = monitor.wrap(
  client.models.Todo
)

// Operations are automatically monitored
await monitoredTodos.create({ 
  title: 'Buy groceries' 
})

// Get insights
const stats = monitor.getStats()
```

## Ready to get started?

Choose your path and start building better DynamoDB applications today.

- [:rocket: Getting started](getting-started/index.md)
- [:jigsaw: Learn patterns](patterns/index.md)
- [:keyboard: View examples](examples/index.md)
- [:books: API reference](api/index.md)
