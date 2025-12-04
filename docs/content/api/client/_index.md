---
title: "@ddb-lib/client API"
weight: 30
description: "High-level DynamoDB client with simplified operations"
type: docs
---

# @ddb-lib/client API Reference

High-level DynamoDB client providing simplified, type-safe operations with automatic retry logic and statistics collection.

## Installation

```bash
npm install @ddb-lib/client @ddb-lib/core
```

## Quick Start

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'MyTable',
  region: 'us-east-1'
})

// CRUD operations
await table.put({ pk: 'USER#123', sk: 'PROFILE', name: 'John' })
const user = await table.get({ pk: 'USER#123', sk: 'PROFILE' })
await table.update({ pk: 'USER#123', sk: 'PROFILE', updates: { name: 'Jane' } })
await table.delete({ pk: 'USER#123', sk: 'PROFILE' })

// Query operations
const results = await table.query({
  keyCondition: { pk: 'USER#123', sk: { beginsWith: 'ORDER#' } }
})

// Batch operations
await table.batchGet({ keys: [{ pk: 'USER#1', sk: 'PROFILE' }, { pk: 'USER#2', sk: 'PROFILE' }] })
await table.batchWrite({ puts: [{ pk: 'USER#3', sk: 'PROFILE', name: 'Bob' }] })

// Transactions
await table.transactWrite([
  { put: { pk: 'USER#4', sk: 'PROFILE', name: 'Alice' } },
  { update: { pk: 'USER#5', sk: 'PROFILE', updates: { loginCount: { increment: 1 } } } }
])
```

## TableClient Class

Main client for all DynamoDB operations.

### Constructor

```typescript
new TableClient(config: TableClientConfig)
```

**Configuration:**
- `tableName: string` - DynamoDB table name (required)
- `region?: string` - AWS region
- `client?: DynamoDBClient` - Custom DynamoDB client
- `retryConfig?: RetryConfig` - Retry configuration
- `statsCollector?: StatsCollector` - Statistics collector

### CRUD Operations

#### get()
Retrieve a single item by key.

```typescript
get(params: GetParams): Promise<GetResult>
```

#### put()
Create or replace an item.

```typescript
put(params: PutParams): Promise<PutResult>
```

#### update()
Update an existing item.

```typescript
update(params: UpdateParams): Promise<UpdateResult>
```

#### delete()
Delete an item.

```typescript
delete(params: DeleteParams): Promise<DeleteResult>
```

### Query Operations

#### query()
Query items with key condition.

```typescript
query(params: QueryParams): Promise<QueryResult>
```

#### scan()
Scan table (use sparingly).

```typescript
scan(params: ScanParams): Promise<ScanResult>
```

### Batch Operations

#### batchGet()
Get multiple items (up to 100).

```typescript
batchGet(params: BatchGetParams): Promise<BatchGetResult>
```

#### batchWrite()
Put/delete multiple items (up to 25).

```typescript
batchWrite(params: BatchWriteParams): Promise<BatchWriteResult>
```

### Transaction Operations

#### transactWrite()
Execute multiple operations atomically.

```typescript
transactWrite(items: TransactWriteItem[]): Promise<TransactWriteResult>
```

#### transactGet()
Get multiple items atomically.

```typescript
transactGet(keys: Key[]): Promise<TransactGetResult>
```

## Related Resources

- [Core Operations Guide](/guides/core-operations/)
- [Query and Scan Guide](/guides/query-and-scan/)
- [Batch Operations Guide](/guides/batch-operations/)
- [Transactions Guide](/guides/transactions/)

