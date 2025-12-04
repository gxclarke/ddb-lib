---
title: Standalone Quick Start
description: Get started with ddb-lib in a standalone Node.js or TypeScript application
---

This guide will help you get started with ddb-lib in a standalone Node.js or TypeScript application (not using AWS Amplify).

## Prerequisites

- Node.js >= 18.0.0
- AWS account with DynamoDB access
- AWS credentials configured (via environment variables, AWS CLI, or IAM role)

## Installation

Install the packages you need:

```bash
# Core functionality and pattern helpers
npm install @ddb-lib/core

# TableClient for operations
npm install @ddb-lib/client

# Optional: statistics and monitoring
npm install @ddb-lib/stats

# AWS SDK peer dependencies
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Basic setup

Create a TableClient instance to interact with your DynamoDB table:

**Basic TableClient Setup**

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '@ddb-lib/client'

const client = new TableClient({
  tableName: 'my-table',
  client: new DynamoDBClient({
    region: 'us-east-1',
  }),
})
```

## Your first CRUD operations

### Create an item

**Create Item**

```typescript
await client.put({
  pk: 'USER#alice',
  sk: 'PROFILE',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 28,
  createdAt: new Date().toISOString(),
})
```

### Read an item

**Get Item**

```typescript
const user = await client.get({
  pk: 'USER#alice',
  sk: 'PROFILE',
})

console.log(user)
// { pk: 'USER#alice', sk: 'PROFILE', name: 'Alice Johnson', ... }
```

### Update an item

**Update Item**

```typescript
const updated = await client.update(
  { pk: 'USER#alice', sk: 'PROFILE' },
  {
    email: 'alice.johnson@example.com',
    updatedAt: new Date().toISOString(),
  }
)
```

### Delete an item

**Delete Item**

```typescript
await client.delete({
  pk: 'USER#alice',
  sk: 'PROFILE',
})
```

## Using pattern helpers

Pattern helpers make it easy to construct consistent keys:

**Pattern Helpers**

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Entity keys
const userKey = PatternHelpers.entityKey('USER', 'alice')
// Returns: "USER#alice"

// Composite keys
const compositeKey = PatternHelpers.compositeKey([
  'TENANT', 'acme',
  'USER', 'alice'
])
// Returns: "TENANT#acme#USER#alice"

// Time series keys
const dayKey = PatternHelpers.timeSeriesKey(new Date(), 'day')
// Returns: "2025-12-03"

// Use in operations
await client.put({
  pk: PatternHelpers.entityKey('USER', 'alice'),
  sk: 'PROFILE',
  name: 'Alice Johnson',
})
```

## Querying data

Query items with the same partition key:

**Query Operations**

```typescript
// Get all items for a user
const result = await client.query({
  keyCondition: {
    pk: 'USER#alice',
  },
})

console.log(result.items) // Array of items
console.log(result.count) // Number of items returned

// Query with sort key condition
const orders = await client.query({
  keyCondition: {
    pk: 'USER#alice',
    sk: { beginsWith: 'ORDER#' },
  },
})
```

## Batch operations

Process multiple items efficiently:

**Batch Operations**

```typescript
// Batch write (create/delete multiple items)
await client.batchWrite([
  {
    type: 'put',
    item: {
      pk: 'USER#bob',
      sk: 'PROFILE',
      name: 'Bob Smith',
    },
  },
  {
    type: 'put',
    item: {
      pk: 'USER#charlie',
      sk: 'PROFILE',
      name: 'Charlie Brown',
    },
  },
])

// Batch get (retrieve multiple items)
const users = await client.batchGet([
  { pk: 'USER#bob', sk: 'PROFILE' },
  { pk: 'USER#charlie', sk: 'PROFILE' },
])
```

## Enable statistics collection

Monitor your DynamoDB operations:

**Enable Statistics**

```typescript
const client = new TableClient({
  tableName: 'my-table',
  client: new DynamoDBClient({ region: 'us-east-1' }),
  statsConfig: {
    enabled: true,
    sampleRate: 1.0, // Monitor 100% of operations
    thresholds: {
      slowQueryMs: 100,
      highRCU: 50,
      highWCU: 50,
    },
  },
})

// Perform operations...
await client.put({ pk: 'USER#alice', sk: 'PROFILE', name: 'Alice' })
await client.get({ pk: 'USER#alice', sk: 'PROFILE' })

// Get statistics
const stats = client.getStats()
console.log('Total operations:', 
  Object.values(stats.operations).reduce((sum, op) => sum + op.count, 0))

// Get recommendations
const recommendations = client.getRecommendations()
recommendations.forEach(rec => {
  console.log(`[${rec.severity}] ${rec.message}`)
})
```

## Local development with DynamoDB local

For local development, use DynamoDB Local:

**Start DynamoDB Local**

```bash
# Using docker
docker run -p 8000:8000 amazon/dynamodb-local

# Or download and run locally
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

**Connect to DynamoDB Local**

```typescript
const client = new TableClient({
  tableName: 'my-table',
  client: new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000', // DynamoDB Local endpoint
  }),
})
```

## Complete example

Here's a complete working example:

**Complete Example**

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

async function main() {
  // Create client
  const client = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000', // For local development
    }),
    statsConfig: { enabled: true },
  })

  // Create user
  await client.put({
    pk: PatternHelpers.entityKey('USER', 'alice'),
    sk: 'PROFILE',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    createdAt: new Date().toISOString(),
  })

  // Create orders
  await client.batchWrite([
    {
      type: 'put',
      item: {
        pk: PatternHelpers.entityKey('USER', 'alice'),
        sk: PatternHelpers.entityKey('ORDER', 'order1'),
        total: 99.99,
        status: 'COMPLETED',
      },
    },
    {
      type: 'put',
      item: {
        pk: PatternHelpers.entityKey('USER', 'alice'),
        sk: PatternHelpers.entityKey('ORDER', 'order2'),
        total: 149.99,
        status: 'PENDING',
      },
    },
  ])

  // Query user's orders
  const result = await client.query({
    keyCondition: {
      pk: PatternHelpers.entityKey('USER', 'alice'),
      sk: { beginsWith: 'ORDER#' },
    },
  })

  console.log(`Found ${result.count} orders`)

  // Get statistics
  const stats = client.getStats()
  console.log('Operations performed:', 
    Object.values(stats.operations).reduce((sum, op) => sum + op.count, 0))
}

main()
```

## Next steps

- Learn about [Access Patterns](../guides/access-patterns/) for efficient queries
- Explore [DynamoDB Patterns](../patterns/) for common use cases
- Review [Best Practices](../best-practices/) for optimal performance
- Check out [Complete Examples](../examples/) for more complex scenarios

## Troubleshooting

### AWS credentials not found

Make sure your AWS credentials are configured:

```bash
# Using AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### Table does not exist

Create your DynamoDB table first:

**Create Table**

```bash
aws dynamodb create-table \
  --table-name my-table \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

### Connection timeout

If connecting to DynamoDB Local, ensure it's running:

```bash
docker ps | grep dynamodb-local
```

!!! info "Need Help?"
    Check out the [complete examples](../examples/) or visit the [GitHub repository](https://github.com/gxclarke/ddb-lib) for more information.
