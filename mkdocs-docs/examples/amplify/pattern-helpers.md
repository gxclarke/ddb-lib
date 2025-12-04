---
title: Pattern Helpers
description: Use pattern helpers with Amplify schemas
---

# Pattern helpers with Amplify

This example demonstrates how to use DynamoDB pattern helpers with AWS Amplify Gen 2 schemas.

## Source code

View the complete source code: [examples/amplify/pattern-helpers.ts](https://github.com/gxclarke/ddb-lib/blob/main/examples/amplify/pattern-helpers.ts)

## Topics covered

- Entity keys in Amplify models
- Composite keys for relationships
- Time-series patterns
- Multi-tenant patterns
- Hierarchical data structures

## Code overview

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyHelpers } from '@ddb-lib/amplify'
import { PatternHelpers } from '@ddb-lib/core'
import type { Schema } from '../amplify/data/resource'

const client = generateClient<Schema>()
const helpers = new AmplifyHelpers(client)

// Entity keys for type safety
const userId = PatternHelpers.entityKey('USER', '123')
const orgId = PatternHelpers.entityKey('ORG', 'acme')

// Composite keys for relationships
const orderKey = PatternHelpers.compositeKey([userId, 'ORDER', '456'])

// Time-series keys
const timestamp = new Date()
const timeSeriesKey = PatternHelpers.timeSeriesKey('METRIC', timestamp, 'hour')

// Hierarchical keys
const hierarchicalKey = PatternHelpers.hierarchicalKey(['ORG', 'acme', 'DEPT', 'eng', 'TEAM', 'backend'])

// Create items with patterns
await helpers.createWithEntityKey('User', {
  id: userId,
  name: 'John Doe'
})

await helpers.createWithCompositeKey('Order', {
  id: orderKey,
  userId: userId,
  amount: 99.99
})

// Query by patterns
const userOrders = await helpers.queryByPrefix('Order', userId)
const hourlyMetrics = await helpers.queryByTimeRange('Metric', 'METRIC', startTime, endTime)
```

## Running the example

```bash
# From the repository root
npx tsx examples/amplify/pattern-helpers.ts
```

## Prerequisites

- AWS Amplify Gen 2 project
- Amplify data schema with appropriate key structures
- AWS credentials configured

## Related resources

- [Pattern Documentation](../../patterns/)
- [Entity Keys Pattern](../../patterns/entity-keys.md)
- [Composite Keys Pattern](../../patterns/composite-keys.md)
- [Time-Series Pattern](../../patterns/time-series.md)
- [Hierarchical Pattern](../../patterns/hierarchical.md)
- [PatternHelpers API Reference](../../api/core/)
