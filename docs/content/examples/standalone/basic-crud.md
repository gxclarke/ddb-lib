---
title: "Basic CRUD Operations"
weight: 10
description: "Learn the fundamentals of CRUD operations with TableClient"
type: docs
---

# Basic CRUD Operations

This example demonstrates the fundamental create, read, update, and delete operations using `@ddb-lib/client`.

## Source Code

View the complete source code: [examples/standalone/basic-crud.ts](https://github.com/gxclarke/ddb-lib/blob/main/examples/standalone/basic-crud.ts)

## Topics Covered

- Creating items with `put()`
- Reading items with `get()`
- Updating items with `update()`
- Deleting items with `delete()`
- Error handling
- Basic configuration

## Code Overview

```typescript
import { TableClient } from '@ddb-lib/client'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

// Initialize the client
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' })
const table = new TableClient({
  client: dynamoClient,
  tableName: 'MyTable'
})

// Create an item
await table.put({
  pk: 'USER#123',
  sk: 'PROFILE',
  name: 'John Doe',
  email: 'john@example.com'
})

// Read an item
const user = await table.get({
  pk: 'USER#123',
  sk: 'PROFILE'
})

// Update an item
await table.update({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  updates: {
    email: 'newemail@example.com'
  }
})

// Delete an item
await table.delete({
  pk: 'USER#123',
  sk: 'PROFILE'
})
```

## Running the Example

```bash
# From the repository root
npx tsx examples/standalone/basic-crud.ts
```

## Prerequisites

- Node.js 18+
- AWS credentials configured
- DynamoDB table created

## Related Resources

- [Core Operations Guide](/guides/core-operations/)
- [TableClient API Reference](/api/client/)
- [Getting Started - Standalone](/getting-started/standalone/)
