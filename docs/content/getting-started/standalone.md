---
title: "Standalone Quick Start"
description: "Get started with standalone DynamoDB"
weight: 20
---

# Standalone Quick Start

## Installation

```bash
npm install @ddb-lib/client
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Basic Setup

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'users',
  region: 'us-east-1',
  statsConfig: { enabled: true }
})
```

## Your First Operations

```typescript
// Create
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  name: 'Alice',
  email: 'alice@example.com'
})

// Read
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })

// Update
await table.update(
  { pk: 'USER#123', sk: 'PROFILE' },
  { email: 'newemail@example.com' }
)

// Delete
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })
```

## Get Recommendations

```typescript
const recommendations = table.getRecommendations()
for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
}
```

## Next Steps

- [Core Operations](../../guides/core-operations/)
- [Patterns](../../patterns/)
- [API Reference](../../api/client/)
