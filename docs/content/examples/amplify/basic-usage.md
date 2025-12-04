---
title: "Basic Amplify Usage"
weight: 10
description: "Get started with Amplify integration"
type: docs
---

# Basic Amplify Usage

This example demonstrates how to get started with `@ddb-lib/amplify` and AWS Amplify Gen 2.

## Source Code

View the complete source code: [examples/amplify/basic-usage.ts](https://github.com/gxclarke/ddb-lib/blob/main/examples/amplify/basic-usage.ts)

## Topics Covered

- Amplify client setup
- Model operations with ddb-lib helpers
- Monitoring integration
- Pattern helpers with Amplify schemas

## Code Overview

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyHelpers } from '@ddb-lib/amplify'
import type { Schema } from '../amplify/data/resource'

// Initialize Amplify client
const client = generateClient<Schema>()

// Use Amplify helpers
const helpers = new AmplifyHelpers(client)

// Create with entity keys
await helpers.createWithEntityKey('User', {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
})

// Query with pattern helpers
const users = await helpers.queryByEntityType('User')

// Use composite keys for relationships
await helpers.createWithCompositeKey('Order', {
  userId: '123',
  orderId: '456',
  amount: 99.99
})
```

## Running the Example

```bash
# From the repository root
npx tsx examples/amplify/basic-usage.ts
```

## Prerequisites

- AWS Amplify Gen 2 project
- Amplify data schema configured
- AWS credentials configured

## Related Resources

- [Getting Started - Amplify](/getting-started/amplify/)
- [Amplify API Reference](/api/amplify/)
- [Pattern Helpers](/patterns/)
