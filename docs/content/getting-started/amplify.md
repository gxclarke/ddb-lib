---
title: "Amplify Quick Start"
description: "Get started with AWS Amplify Gen 2"
weight: 30
---

# Amplify Quick Start

## Installation

```bash
npm install @ddb-lib/amplify
npm install aws-amplify
```

## Basic Setup

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'

const client = generateClient()
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true }
})

// Wrap your model
const monitoredTodos = monitor.wrap(client.models.Todo)
```

## Your First Operations

```typescript
// Create
await monitoredTodos.create({
  title: 'Buy groceries',
  completed: false
})

// List
const todos = await monitoredTodos.list()

// Update
await monitoredTodos.update('id', { completed: true })

// Delete
await monitoredTodos.delete('id')
```

## Get Insights

```typescript
const stats = monitor.getStats()
const recommendations = monitor.getRecommendations()

for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
}
```

## Next Steps

- [Amplify Integration](../../guides/amplify/)
- [Patterns](../../patterns/)
- [API Reference](../../api/amplify/)
