# @ddb-lib/amplify

AWS Amplify Gen 2 integration with performance monitoring and DynamoDB best practices.

## Installation

```bash
npm install @ddb-lib/amplify
```

**Peer Dependencies:**
```bash
npm install aws-amplify
```

## Features

- **Seamless Integration**: Works with Amplify Gen 2 data client
- **Automatic Monitoring**: Zero-config operation tracking
- **Performance Statistics**: Track latency, RCU/WCU, and item counts
- **Recommendations**: Get optimization suggestions for Amplify operations
- **Pattern Helpers**: Use DynamoDB best practices with Amplify
- **Type Safe**: Preserves Amplify's type definitions
- **Non-Invasive**: Doesn't modify Amplify's behavior

## Quick Start

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import type { Schema } from './amplify/data/resource'

const client = generateClient<Schema>()

// Create monitor
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true }
})

// Wrap your Amplify model
const monitoredTodos = monitor.wrap(client.models.Todo)

// Use as normal - operations are automatically monitored
await monitoredTodos.create({ title: 'Buy groceries', completed: false })
const todos = await monitoredTodos.list()

// Get statistics and recommendations
const stats = monitor.getStats()
const recommendations = monitor.getRecommendations()
```

## Configuration

### Basic Configuration

```typescript
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true }
})
```

### With Custom Thresholds

```typescript
const monitor = new AmplifyMonitor({
  statsConfig: {
    enabled: true,
    sampleRate: 1.0, // 100% sampling
    thresholds: {
      slowQueryMs: 100,
      highRCU: 50,
      highWCU: 50
    }
  }
})
```

### With Sampling (Production)

```typescript
const monitor = new AmplifyMonitor({
  statsConfig: {
    enabled: true,
    sampleRate: 0.1 // Sample 10% of operations
  }
})
```

### Disable Auto-Instrumentation

```typescript
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true },
  enableAutoInstrumentation: false // Manual recording only
})
```

## Usage

### Wrapping Models

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import type { Schema } from './amplify/data/resource'

const client = generateClient<Schema>()
const monitor = new AmplifyMonitor({ statsConfig: { enabled: true } })

// Wrap individual models
const monitoredTodos = monitor.wrap(client.models.Todo)
const monitoredUsers = monitor.wrap(client.models.User)

// All operations are automatically monitored
await monitoredTodos.create({ title: 'Task 1' })
await monitoredTodos.list()
await monitoredTodos.get({ id: '123' })
await monitoredTodos.update({ id: '123', completed: true })
await monitoredTodos.delete({ id: '123' })
```

### Monitored Operations

All standard Amplify operations are supported:

```typescript
// Create
const todo = await monitoredTodos.create({
  title: 'Buy groceries',
  completed: false
})

// Get
const todo = await monitoredTodos.get({ id: '123' })

// List
const todos = await monitoredTodos.list()

// List with filter
const todos = await monitoredTodos.list({
  filter: { completed: { eq: true } }
})

// Update
const updated = await monitoredTodos.update({
  id: '123',
  completed: true
})

// Delete
await monitoredTodos.delete({ id: '123' })
```

### Manual Recording

For custom operations or when auto-instrumentation is disabled:

```typescript
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true },
  enableAutoInstrumentation: false
})

// Manually record operations
const start = Date.now()
const result = await client.models.Todo.list()

monitor.recordOperation({
  operation: 'query',
  timestamp: start,
  latencyMs: Date.now() - start,
  itemCount: result.data.length,
  patternName: 'listTodos'
})
```

### Getting Statistics

```typescript
const stats = monitor.getStats()

console.log('Total operations:', Object.values(stats.operations)
  .reduce((sum, op) => sum + op.count, 0))

console.log('Query stats:', {
  count: stats.operations.query?.count,
  avgLatency: stats.operations.query?.avgLatencyMs,
  totalRCU: stats.operations.query?.totalRCU
})

// Access pattern statistics
for (const [name, patternStats] of Object.entries(stats.accessPatterns)) {
  console.log(`Pattern ${name}:`, {
    calls: patternStats.count,
    avgLatency: patternStats.avgLatencyMs,
    avgItems: patternStats.avgItemsReturned
  })
}
```

### Getting Recommendations

```typescript
const recommendations = monitor.getRecommendations()

// Filter by severity
const errors = recommendations.filter(r => r.severity === 'error')
const warnings = recommendations.filter(r => r.severity === 'warning')

// Display recommendations
for (const rec of recommendations) {
  console.log(`[${rec.severity.toUpperCase()}] ${rec.category}`)
  console.log(`  ${rec.message}`)
  console.log(`  ${rec.details}`)
  
  if (rec.suggestedAction) {
    console.log(`  Action: ${rec.suggestedAction}`)
  }
  
  if (rec.estimatedImpact) {
    console.log(`  Impact:`, rec.estimatedImpact)
  }
}
```

### Resetting Statistics

```typescript
// Reset statistics (useful for testing or periodic resets)
monitor.reset()
```

### Unwrapping Models

```typescript
// Get the original Amplify model
const originalModel = monitoredTodos.unwrap()
```

## Pattern Helpers with Amplify

Use DynamoDB pattern helpers with Amplify:

```typescript
import { PatternHelpers } from '@ddb-lib/core'
import { AmplifyHelpers } from '@ddb-lib/amplify'

// Entity keys
const userKey = PatternHelpers.entityKey('USER', userId)

// Composite keys for Amplify
const key = AmplifyHelpers.amplifyCompositeKey(['USER', userId, 'ORDER', orderId])

// Parse Amplify-generated keys
const { modelName, id } = AmplifyHelpers.parseAmplifyKey(amplifyKey)

// GSI keys for Amplify
const gsiKey = AmplifyHelpers.amplifyGSIKey('StatusIndex', 'ACTIVE')

// Time-series keys
const dayKey = PatternHelpers.timeSeriesKey(new Date(), 'day')

// Multi-attribute keys
import { multiTenantKey } from '@ddb-lib/core'
const key = multiTenantKey(tenantId, customerId)
```

## Amplify Helpers

Utilities specific to Amplify patterns.

### amplifyCompositeKey

Create composite keys compatible with Amplify's key structure:

```typescript
import { AmplifyHelpers } from '@ddb-lib/amplify'

const key = AmplifyHelpers.amplifyCompositeKey(['USER', '123', 'ORDER', '456'])
// Returns: 'USER#123#ORDER#456'
```

### parseAmplifyKey

Parse Amplify-generated keys:

```typescript
const { modelName, id } = AmplifyHelpers.parseAmplifyKey('Todo::abc-123')
// Returns: { modelName: 'Todo', id: 'abc-123' }
```

### amplifyGSIKey

Create GSI keys for Amplify secondary indexes:

```typescript
const gsiKey = AmplifyHelpers.amplifyGSIKey('StatusIndex', 'ACTIVE')
// Returns: 'StatusIndex#ACTIVE'
```

### schemaToAccessPatterns

Convert Amplify schema to access pattern definitions:

```typescript
import type { Schema } from './amplify/data/resource'

const patterns = AmplifyHelpers.schemaToAccessPatterns<Schema>(schema)
```

### getTableName

Extract DynamoDB table name from Amplify config:

```typescript
const tableName = AmplifyHelpers.getTableName(schema)
```

## API Reference

### AmplifyMonitor

Main class for monitoring Amplify operations.

#### Constructor

```typescript
new AmplifyMonitor<T extends Schema>(config: AmplifyMonitorConfig)
```

**AmplifyMonitorConfig:**
```typescript
interface AmplifyMonitorConfig {
  statsConfig?: StatsConfig
  enableAutoInstrumentation?: boolean // default: true
}

interface StatsConfig {
  enabled: boolean
  sampleRate?: number // 0-1, default: 1.0
  thresholds?: {
    slowQueryMs?: number // default: 100
    highRCU?: number // default: 50
    highWCU?: number // default: 50
  }
}
```

#### Methods

##### wrap<TModel>(model: any): MonitoredModel<TModel>

Wrap an Amplify model to add monitoring.

```typescript
const monitoredTodos = monitor.wrap(client.models.Todo)
```

##### recordOperation(operation: OperationRecord): void

Manually record an operation.

```typescript
monitor.recordOperation({
  operation: 'query',
  timestamp: Date.now(),
  latencyMs: 45,
  itemCount: 10,
  patternName: 'listTodos'
})
```

##### getStats(): TableStats

Get aggregated statistics.

```typescript
const stats = monitor.getStats()
```

##### getRecommendations(): Recommendation[]

Get optimization recommendations.

```typescript
const recommendations = monitor.getRecommendations()
```

##### reset(): void

Reset all statistics.

```typescript
monitor.reset()
```

### MonitoredModel

Wrapper interface for Amplify models with monitoring.

```typescript
interface MonitoredModel<TModel> {
  get(id: string): Promise<TModel | null>
  list(options?: ListOptions): Promise<TModel[]>
  create(data: Partial<TModel>): Promise<TModel>
  update(id: string, data: Partial<TModel>): Promise<TModel>
  delete(id: string): Promise<void>
  unwrap(): any // Get original model
}
```

## Integration Examples

### With Amplify Gen 2 Schema

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
  Todo: a
    .model({
      title: a.string().required(),
      completed: a.boolean().default(false),
      priority: a.enum(['LOW', 'MEDIUM', 'HIGH'])
    })
    .authorization(allow => [allow.owner()])
})

export type Schema = ClientSchema<typeof schema>
export const data = defineData({ schema })
```

```typescript
// app.ts
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import type { Schema } from './amplify/data/resource'

const client = generateClient<Schema>()
const monitor = new AmplifyMonitor({ statsConfig: { enabled: true } })

const monitoredTodos = monitor.wrap(client.models.Todo)

// All operations are type-safe and monitored
await monitoredTodos.create({
  title: 'Buy groceries',
  completed: false,
  priority: 'HIGH'
})
```

### With Authorization

Amplify's authorization rules work seamlessly:

```typescript
// Schema with authorization
const schema = a.schema({
  Todo: a
    .model({
      title: a.string(),
      owner: a.string()
    })
    .authorization(allow => [
      allow.owner(),
      allow.groups(['Admins'])
    ])
})

// Monitoring doesn't interfere with authorization
const monitoredTodos = monitor.wrap(client.models.Todo)
await monitoredTodos.create({ title: 'Task' }) // Authorization still enforced
```

### With Real-time Subscriptions

```typescript
// Subscriptions work through the original model
const subscription = monitoredTodos.unwrap().onCreate().subscribe({
  next: (data) => console.log('New todo:', data),
  error: (error) => console.error('Error:', error)
})
```

### Periodic Statistics Export

```typescript
// Export statistics to CloudWatch or other monitoring
setInterval(() => {
  const stats = monitor.getStats()
  const recommendations = monitor.getRecommendations()
  
  // Send to monitoring service
  sendToCloudWatch({
    stats,
    recommendations,
    timestamp: Date.now()
  })
  
  // Reset for next period
  monitor.reset()
}, 60000) // Every minute
```

## Best Practices

### 1. Enable Monitoring in Development

```typescript
// Development: Full monitoring
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true, sampleRate: 1.0 }
})

// Production: Sampled monitoring
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true, sampleRate: 0.1 }
})
```

### 2. Review Recommendations Regularly

```typescript
// Check recommendations after development
const recommendations = monitor.getRecommendations()

const critical = recommendations.filter(r => r.severity === 'error')
if (critical.length > 0) {
  console.warn('Critical issues found:', critical)
}
```

### 3. Use Pattern Helpers for Keys

```typescript
import { PatternHelpers } from '@ddb-lib/core'

// Good: Use pattern helpers
const key = PatternHelpers.entityKey('USER', userId)

// Avoid: Manual string construction
const key = `USER#${userId}`
```

### 4. Monitor Access Patterns

```typescript
const stats = monitor.getStats()

// Identify most used patterns
const patterns = Object.entries(stats.accessPatterns)
  .sort((a, b) => b[1].count - a[1].count)

console.log('Top patterns:', patterns.slice(0, 5))
```

### 5. Handle Amplify Errors

```typescript
try {
  await monitoredTodos.create({ title: 'Task' })
} catch (error) {
  // Amplify errors are preserved
  if (error.errors) {
    console.error('GraphQL errors:', error.errors)
  }
}
```

## Limitations

### What's Monitored

- ✅ CRUD operations (create, get, list, update, delete)
- ✅ Filtered queries
- ✅ Paginated results
- ❌ Real-time subscriptions (use unwrap() for subscriptions)
- ❌ Custom GraphQL operations

### Amplify Features Preserved

- ✅ Type safety
- ✅ Authorization rules
- ✅ Validation
- ✅ Relationships
- ✅ Custom business logic
- ✅ Error handling

## Examples

See the [examples directory](../../examples) for complete working examples:

- [Basic Amplify Usage](../../examples/amplify/basic-usage.ts)
- [Amplify with Monitoring](../../examples/amplify/with-monitoring.ts)
- [Pattern Helpers with Amplify](../../examples/amplify/pattern-helpers.ts)

## Troubleshooting

### Statistics Not Collecting

Check that monitoring is enabled:

```typescript
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true } // Must be true
})
```

### Type Errors with Wrapped Models

Ensure you're using the correct Schema type:

```typescript
import type { Schema } from './amplify/data/resource'

const monitor = new AmplifyMonitor<Schema>({ statsConfig: { enabled: true } })
```

### Operations Not Monitored

Verify you're using the wrapped model:

```typescript
// Good: Using wrapped model
const monitoredTodos = monitor.wrap(client.models.Todo)
await monitoredTodos.list()

// Bad: Using original model
await client.models.Todo.list() // Not monitored
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- aws-amplify >= 6.0.0
- AWS Amplify Gen 2

## License

MIT
