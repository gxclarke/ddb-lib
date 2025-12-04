---
title: API Reference
description: Complete API documentation for all ddb-lib packages
---

# API reference

Complete API documentation for the ddb-lib monorepo packages. Each package provides specific functionality for working with DynamoDB in TypeScript applications.

## Package overview

The ddb-lib library is organized into four main packages:

### [@ddb-lib/core](core/)
Core utilities and pattern helpers for DynamoDB operations.

**Key Features:**
- Pattern helper functions (entity keys, composite keys, hierarchical keys)
- Multi-attribute key management
- Expression builders for conditions and updates
- Type guards and validation utilities

**Use When:** You need low-level utilities and pattern helpers for any DynamoDB client.

### [@ddb-lib/client](client/)
High-level DynamoDB client with simplified operations.

**Key Features:**
- Simplified CRUD operations
- Query and scan with type safety
- Batch operations with automatic chunking
- Transaction support
- Built-in retry logic and error handling

**Use When:** You want a simplified, type-safe interface for DynamoDB operations.

### [@ddb-lib/stats](stats/)
Statistics collection, monitoring, and anti-pattern detection.

**Key Features:**
- Operation statistics collection
- Performance metrics tracking
- Anti-pattern detection
- Actionable recommendations
- Cost optimization insights

**Use When:** You need to monitor, analyze, and optimize your DynamoDB usage.

### [@ddb-lib/amplify](amplify/)
AWS Amplify Gen 2 integration helpers.

**Key Features:**
- Amplify data client integration
- Monitoring for Amplify operations
- Pattern helpers for Amplify schemas
- Type-safe Amplify operations

**Use When:** You're using AWS Amplify Gen 2 and want enhanced DynamoDB capabilities.

## Quick reference

### Common operations

```typescript
// Core - Pattern helpers
import { PatternHelpers } from '@ddb-lib/core'
const key = PatternHelpers.entityKey('USER', '123')

// Client - CRUD operations
import { TableClient } from '@ddb-lib/client'
const table = new TableClient({ tableName: 'MyTable' })
await table.put({ pk: 'USER#123', sk: 'PROFILE', ...data })

// Stats - Monitoring
import { StatsCollector } from '@ddb-lib/stats'
const stats = new StatsCollector()
const metrics = stats.getStats()

// Amplify - Integration
import { AmplifyMonitor } from '@ddb-lib/amplify'
const monitor = new AmplifyMonitor(client)
```

## Package details

### [@ddb-lib/core](core/)

Core utilities for DynamoDB pattern implementation.

**Main Classes:**
- `PatternHelpers` - Entity keys, composite keys, hierarchical keys, distributed keys
- `MultiAttributeKeyHelpers` - Create and parse multi-attribute keys
- `ExpressionBuilder` - Build condition and update expressions
- `TypeGuards` - Runtime type validation

**Installation:**
```bash
npm install @ddb-lib/core
```

[View Full API Documentation →](core/)

### [@ddb-lib/client](client/)

High-level DynamoDB client with simplified operations.

**Main Classes:**
- `TableClient` - Main client for all DynamoDB operations
- `RetryHandler` - Configurable retry logic
- `DynamoDBError` - Enhanced error types

**Key Methods:**
- `get()`, `put()`, `update()`, `delete()` - CRUD operations
- `query()`, `scan()` - Query operations
- `batchGet()`, `batchWrite()` - Batch operations
- `transactWrite()`, `transactGet()` - Transactions

**Installation:**
```bash
npm install @ddb-lib/client @ddb-lib/core
```

[View Full API Documentation →](client/)

### [@ddb-lib/stats](stats/)

Statistics collection and anti-pattern detection.

**Main Classes:**
- `StatsCollector` - Collect operation statistics
- `RecommendationEngine` - Generate optimization recommendations
- `AntiPatternDetector` - Detect common anti-patterns

**Key Features:**
- Operation counting and timing
- Capacity consumption tracking
- Anti-pattern identification
- Cost optimization suggestions

**Installation:**
```bash
npm install @ddb-lib/stats
```

[View Full API Documentation →](stats/)

### [@ddb-lib/amplify](amplify/)

AWS Amplify Gen 2 integration.

**Main Classes:**
- `AmplifyMonitor` - Monitor Amplify operations
- `AmplifyHelpers` - Pattern helpers for Amplify

**Key Features:**
- Seamless Amplify integration
- Statistics collection for Amplify operations
- Pattern helpers compatible with Amplify schemas

**Installation:**
```bash
npm install @ddb-lib/amplify @ddb-lib/core @ddb-lib/stats
```

[View Full API Documentation →](amplify/)

## TypeScript support

All packages are written in TypeScript and provide full type definitions.

```typescript
import type { 
  TableClientConfig,
  QueryOptions,
  PutOptions 
} from '@ddb-lib/client'

import type {
  PatternHelpersConfig,
  EntityKey,
  CompositeKey
} from '@ddb-lib/core'

import type {
  Stats,
  Recommendation,
  AntiPattern
} from '@ddb-lib/stats'
```

## Error handling

All packages use consistent error handling:

```typescript
import { DynamoDBError } from '@ddb-lib/client'

try {
  await table.put({ pk: 'USER#123', sk: 'PROFILE', ...data })
} catch (error) {
  if (error instanceof DynamoDBError) {
    console.error('DynamoDB error:', error.message)
    console.error('Error code:', error.code)
    console.error('Status code:', error.statusCode)
  }
}
```

## Configuration

### Client configuration

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'MyTable',
  region: 'us-east-1',
  
  // Optional: Custom DynamoDB client
  client: customDynamoDBClient,
  
  // Optional: Retry configuration
  retryConfig: {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000
  },
  
  // Optional: Statistics collection
  statsCollector: new StatsCollector()
})
```

### Stats configuration

```typescript
import { StatsCollector } from '@ddb-lib/stats'

const stats = new StatsCollector({
  // Optional: Enable detailed tracking
  trackItemSizes: true,
  trackCapacity: true,
  
  // Optional: Sampling rate (0-1)
  samplingRate: 1.0
})
```

## Best practices

### Import only what you need

```typescript
// Good: Import specific functions
import { entityKey, compositeKey } from '@ddb-lib/core'

// Avoid: Importing entire namespace
import * as Core from '@ddb-lib/core'
```

### Use type definitions

```typescript
// Good: Use provided types
import type { QueryOptions } from '@ddb-lib/client'

const options: QueryOptions = {
  keyCondition: { pk: 'USER#123' },
  limit: 10
}
```

### Handle errors appropriately

```typescript
// Good: Specific error handling
try {
  await table.put(item)
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    // Handle condition failure
  } else if (error.name === 'ProvisionedThroughputExceededException') {
    // Handle throttling
  } else {
    throw error
  }
}
```

## Version compatibility

| Package | Version | DynamoDB SDK | Node.js | TypeScript |
|---------|---------|--------------|---------|------------|
| @ddb-lib/core | 0.1.x | @aws-sdk/client-dynamodb ^3.0.0 | ≥14.0.0 | ≥4.5.0 |
| @ddb-lib/client | 0.1.x | @aws-sdk/client-dynamodb ^3.0.0 | ≥14.0.0 | ≥4.5.0 |
| @ddb-lib/stats | 0.1.x | - | ≥14.0.0 | ≥4.5.0 |
| @ddb-lib/amplify | 0.1.x | aws-amplify ^6.0.0 | ≥14.0.0 | ≥4.5.0 |

## Related resources

- [Getting Started](../getting-started/) - Installation and setup guides
- [Guides](../guides/) - Feature-specific usage guides
- [Patterns](../patterns/) - DynamoDB design patterns
- [Best Practices](../best-practices/) - Optimization techniques
- [Examples](../examples/) - Complete working examples

## Contributing

Found an issue with the API documentation? Please [open an issue](https://github.com/yourusername/ddb-lib/issues) or submit a pull request.

See the [Contributing Guide](../contributing/) for more information.

