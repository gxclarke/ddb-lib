---
title: Single-Table Design
description: Implement single-table design patterns with multiple entity types
---

# Single-table design example

This example demonstrates how to implement single-table design patterns with multiple entity types using `@ddb-lib/client`.

## Source code

View the complete source code: [examples/standalone/single-table-design.ts](https://github.com/gxclarke/ddb-lib/blob/main/examples/standalone/single-table-design.ts)

## Topics covered

- Entity keys for different types
- Composite keys for relationships
- GSI for alternative access patterns
- Query patterns for related entities
- Single-table design best practices

## Code overview

```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

// Create entity keys
const userId = PatternHelpers.entityKey('USER', '123')
const orderId = PatternHelpers.entityKey('ORDER', '456')

// Store user
await table.put({
  pk: userId,
  sk: 'PROFILE',
  name: 'John Doe',
  email: 'john@example.com'
})

// Store order with relationship
await table.put({
  pk: userId,
  sk: orderId,
  amount: 99.99,
  status: 'pending'
})

// Query all orders for a user
const orders = await table.query({
  keyCondition: {
    pk: userId,
    sk: { beginsWith: 'ORDER#' }
  }
})
```

## Running the example

```bash
# From the repository root
npx tsx examples/standalone/single-table-design.ts
```

## Prerequisites

- Node.js 18+
- AWS credentials configured
- DynamoDB table with GSI configured

## Related resources

- [Single-Table Design Patterns](../../patterns/)
- [Entity Keys Pattern](../../patterns/entity-keys.md)
- [Composite Keys Pattern](../../patterns/composite-keys.md)
- [Query and Scan Guide](../../guides/query-and-scan/)
