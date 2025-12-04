---
title: "Standalone Quick Start"
description: "Get started with ddb-lib in a standalone Node.js or TypeScript application"
type: docs
weight: 3
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

# Optional: Statistics and monitoring
npm install @ddb-lib/stats

# AWS SDK peer dependencies
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Basic Setup

Create a TableClient instance to interact with your DynamoDB table:

{{< code-example lang="typescript" title="Basic TableClient Setup" >}}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '@ddb-lib/client'

const client = new TableClient({
  tableName: 'my-table',
  client: new DynamoDBClient({
    region: 'us-east-1',
  }),
})
{{< /code-example >}}

## Your First CRUD Operations

### Create an Item

{{< code-example lang="typescript" title="Create Item" >}}
await client.put({
  pk: 'USER#alice',
  sk: 'PROFILE',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 28,
  createdAt: new Date().toISOString(),
})
{{< /code-example >}}

### Read an Item

{{< code-example lang="typescript" title="Get Item" >}}
const user = await client.get({
  pk: 'USER#alice',
  sk: 'PROFILE',
})

console.log(user)
// { pk: 'USER#alice', sk: 'PROFILE', name: 'Alice Johnson', ... }
{{< /code-example >}}

### Update an Item

{{< code-example lang="typescript" title="Update Item" >}}
const updated = await client.update(
  { pk: 'USER#alice', sk: 'PROFILE' },
  {
    email: 'alice.johnson@example.com',
    updatedAt: new Date().toISOString(),
  }
)
{{< /code-example >}}

### Delete an Item

{{< code-example lang="typescript" title="Delete Item" >}}
await client.delete({
  pk: 'USER#alice',
  sk: 'PROFILE',
})
{{< /code-example >}}

## Using Pattern Helpers

Pattern helpers make it easy to construct consistent keys:

{{< code-example lang="typescript" title="Pattern Helpers" >}}
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
{{< /code-example >}}

## Querying Data

Query items with the same partition key:

{{< code-example lang="typescript" title="Query Operations" >}}
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
{{< /code-example >}}

## Batch Operations

Process multiple items efficiently:

{{< code-example lang="typescript" title="Batch Operations" >}}
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
{{< /code-example >}}

## Enable Statistics Collection

Monitor your DynamoDB operations:

{{< code-example lang="typescript" title="Enable Statistics" >}}
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
{{< /code-example >}}

## Local Development with DynamoDB Local

For local development, use DynamoDB Local:

{{< code-example lang="bash" title="Start DynamoDB Local" >}}
# Using Docker
docker run -p 8000:8000 amazon/dynamodb-local

# Or download and run locally
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
{{< /code-example >}}

{{< code-example lang="typescript" title="Connect to DynamoDB Local" >}}
const client = new TableClient({
  tableName: 'my-table',
  client: new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000', // DynamoDB Local endpoint
  }),
})
{{< /code-example >}}

## Complete Example

Here's a complete working example:

{{< code-example lang="typescript" title="Complete Example" >}}
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
{{< /code-example >}}

## Next Steps

- Learn about [Access Patterns](/guides/access-patterns/) for efficient queries
- Explore [DynamoDB Patterns](/patterns/) for common use cases
- Review [Best Practices](/best-practices/) for optimal performance
- Check out [Complete Examples](/examples/) for more complex scenarios

## Troubleshooting

### AWS Credentials Not Found

Make sure your AWS credentials are configured:

```bash
# Using AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### Table Does Not Exist

Create your DynamoDB table first:

{{< code-example lang="bash" title="Create Table" >}}
aws dynamodb create-table \
  --table-name my-table \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
{{< /code-example >}}

### Connection Timeout

If connecting to DynamoDB Local, ensure it's running:

```bash
docker ps | grep dynamodb-local
```

{{< alert type="info" title="Need Help?" >}}
Check out the [complete examples](/examples/) or visit the [GitHub repository](https://github.com/gxclarke/ddb-lib) for more information.
{{< /alert >}}
