# @ddb-lib/stats

Performance monitoring and optimization recommendations for DynamoDB. Framework-agnostic statistics collection with anti-pattern detection.

## Installation

```bash
npm install @ddb-lib/stats
```

## Features

- **Performance Tracking**: Monitor latency, RCU/WCU consumption, and item counts
- **Anti-Pattern Detection**: Identify scans, hot partitions, and inefficient queries
- **Recommendations**: Get actionable optimization suggestions
- **Framework Agnostic**: Works with any data access layer
- **Sampling Support**: Configurable sampling to minimize overhead
- **Manual Recording**: Record operations from any source

## Usage

### Basic Statistics Collection

```typescript
import { StatsCollector } from '@ddb-lib/stats'

// Create collector
const stats = new StatsCollector({
  enabled: true,
  sampleRate: 1.0, // Collect 100% of operations
  thresholds: {
    slowQueryMs: 100,
    highRCU: 50,
    highWCU: 50
  }
})

// Record operations
stats.record({
  operation: 'query',
  timestamp: Date.now(),
  latencyMs: 45,
  rcu: 5,
  itemCount: 10,
  indexName: 'GSI1',
  patternName: 'getUserOrders'
})

// Get aggregated statistics
const tableStats = stats.getStats()
console.log('Average query latency:', tableStats.operations.query.avgLatencyMs)
console.log('Total RCU consumed:', tableStats.operations.query.totalRCU)
```

### Recommendations Engine

```typescript
import { StatsCollector, RecommendationEngine } from '@ddb-lib/stats'

const stats = new StatsCollector({ enabled: true })
const engine = new RecommendationEngine(stats)

// Record some operations
stats.record({
  operation: 'scan',
  timestamp: Date.now(),
  latencyMs: 500,
  rcu: 100,
  scannedCount: 1000,
  itemCount: 50
})

// Get recommendations
const recommendations = engine.generateRecommendations()

for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.category}: ${rec.message}`)
  console.log(`  Details: ${rec.details}`)
  if (rec.suggestedAction) {
    console.log(`  Action: ${rec.suggestedAction}`)
  }
}
```

### Anti-Pattern Detection

```typescript
import { StatsCollector, AntiPatternDetector } from '@ddb-lib/stats'

const stats = new StatsCollector({ enabled: true })
const detector = new AntiPatternDetector(stats)

// Record operations...

// Detect specific anti-patterns
const scanIssues = detector.detectStringConcatenation()
const hotPartitions = detector.detectLargeItemScans()
const unusedIndexes = detector.detectUnusedIndexes()

// All detections return Recommendation[]
for (const issue of scanIssues) {
  console.log(`Found issue: ${issue.message}`)
}
```

### With TableClient

The stats package integrates automatically with `@ddb-lib/client`:

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'users',
  statsConfig: {
    enabled: true,
    sampleRate: 1.0,
    thresholds: {
      slowQueryMs: 100,
      highRCU: 50,
      highWCU: 50
    }
  }
})

// Operations are automatically tracked
await table.query({ keyCondition: { pk: 'USER#123' } })

// Get statistics
const stats = table.getStats()
const recommendations = table.getRecommendations()
```

### With Amplify

The stats package integrates with `@ddb-lib/amplify`:

```typescript
import { AmplifyMonitor } from '@ddb-lib/amplify'
import { generateClient } from 'aws-amplify/data'

const client = generateClient()
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true }
})

const monitoredTodos = monitor.wrap(client.models.Todo)

// Operations are automatically tracked
await monitoredTodos.list()

// Get statistics and recommendations
const stats = monitor.getStats()
const recommendations = monitor.getRecommendations()
```

## API Reference

### StatsCollector

Main class for collecting operation statistics.

#### Constructor

```typescript
new StatsCollector(config: StatsConfig)
```

**StatsConfig:**
```typescript
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

##### record(operation: OperationRecord): void

Record a single operation.

```typescript
stats.record({
  operation: 'query',
  timestamp: Date.now(),
  latencyMs: 45,
  rcu: 5,
  wcu: 0,
  itemCount: 10,
  scannedCount: 10,
  indexName: 'GSI1',
  keyCondition: { pk: 'USER#123' },
  filter: { status: 'ACTIVE' },
  patternName: 'getUserOrders',
  metadata: { userId: '123' }
})
```

**OperationRecord:**
```typescript
interface OperationRecord {
  operation: 'get' | 'put' | 'update' | 'delete' | 'query' | 'scan' | 
             'batchGet' | 'batchWrite' | 'transactWrite' | 'transactGet'
  timestamp: number
  latencyMs: number
  rcu?: number
  wcu?: number
  itemCount?: number
  scannedCount?: number
  indexName?: string
  keyCondition?: any
  filter?: any
  patternName?: string
  metadata?: Record<string, any>
}
```

##### getStats(): TableStats

Get aggregated statistics.

```typescript
const stats = collector.getStats()

console.log('Query operations:', stats.operations.query.count)
console.log('Average latency:', stats.operations.query.avgLatencyMs)
console.log('Total RCU:', stats.operations.query.totalRCU)
```

**TableStats:**
```typescript
interface TableStats {
  operations: {
    [operationType: string]: OperationTypeStats
  }
  accessPatterns: {
    [patternName: string]: AccessPatternStats
  }
}

interface OperationTypeStats {
  count: number
  totalLatencyMs: number
  avgLatencyMs: number
  totalRCU: number
  totalWCU: number
  slowOperations: number
}

interface AccessPatternStats {
  count: number
  avgLatencyMs: number
  avgItemsReturned: number
  avgScannedCount: number
}
```

##### export(): OperationRecord[]

Export raw operation records.

```typescript
const records = collector.export()
// Save to file, send to analytics, etc.
```

##### reset(): void

Reset all statistics.

```typescript
collector.reset()
```

##### shouldSample(): boolean

Check if current operation should be sampled (based on sampleRate).

```typescript
if (collector.shouldSample()) {
  // Record this operation
}
```

### RecommendationEngine

Generates optimization recommendations based on collected statistics.

#### Constructor

```typescript
new RecommendationEngine(statsCollector: StatsCollector)
```

#### Methods

##### generateRecommendations(): Recommendation[]

Generate all recommendations.

```typescript
const recommendations = engine.generateRecommendations()

for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
}
```

**Recommendation:**
```typescript
interface Recommendation {
  severity: 'info' | 'warning' | 'error'
  category: 'performance' | 'cost' | 'best-practice' | 'hot-partition' | 'capacity'
  message: string
  details: string
  suggestedAction?: string
  affectedOperations?: string[]
  estimatedImpact?: {
    costReduction?: string
    performanceImprovement?: string
  }
}
```

### AntiPatternDetector

Detects specific DynamoDB anti-patterns.

#### Constructor

```typescript
new AntiPatternDetector(statsCollector: StatsCollector)
```

#### Methods

##### detectStringConcatenation(): Recommendation[]

Detect use of string concatenation instead of multi-attribute keys.

```typescript
const issues = detector.detectStringConcatenation()
```

##### detectLargeItemScans(): Recommendation[]

Detect scans that return large numbers of items.

```typescript
const issues = detector.detectLargeItemScans()
```

##### detectUnusedIndexes(): Recommendation[]

Detect indexes that are rarely or never used.

```typescript
const issues = detector.detectUnusedIndexes()
```

##### detectMissingGSIs(): Recommendation[]

Detect access patterns that would benefit from a GSI.

```typescript
const issues = detector.detectMissingGSIs()
```

##### detectReadBeforeWrite(): Recommendation[]

Detect read-before-write patterns that could use conditional writes.

```typescript
const issues = detector.detectReadBeforeWrite()
```

## Recommendation Categories

### Performance

Issues that affect query latency and throughput.

**Examples:**
- Slow queries exceeding threshold
- Scans instead of queries
- Missing projections causing over-fetching

### Cost

Issues that increase DynamoDB costs.

**Examples:**
- High RCU/WCU consumption
- Inefficient batch operations
- Unnecessary consistent reads

### Best Practice

Violations of DynamoDB best practices.

**Examples:**
- String concatenation instead of multi-attribute keys
- Missing GSIs for common access patterns
- Read-before-write patterns

### Hot Partition

Issues related to partition key distribution.

**Examples:**
- Uneven partition key distribution
- High traffic to single partition
- Missing shard distribution

### Capacity

Issues related to capacity planning.

**Examples:**
- Approaching provisioned capacity limits
- Throttling events
- Burst capacity exhaustion

## Severity Levels

### Info

Informational recommendations for optimization.

**Example:** "Consider using projection expressions to reduce data transfer"

### Warning

Issues that should be addressed but aren't critical.

**Example:** "Query latency is above threshold (150ms avg)"

### Error

Critical issues that significantly impact performance or cost.

**Example:** "Scan operations detected - use query with proper indexes"

## Best Practices

### 1. Enable Sampling in Production

```typescript
// Development: Full sampling
const stats = new StatsCollector({
  enabled: true,
  sampleRate: 1.0
})

// Production: Sample 10% to reduce overhead
const stats = new StatsCollector({
  enabled: true,
  sampleRate: 0.1
})
```

### 2. Set Appropriate Thresholds

```typescript
const stats = new StatsCollector({
  enabled: true,
  thresholds: {
    slowQueryMs: 100, // Adjust based on your SLA
    highRCU: 50,      // Adjust based on your capacity
    highWCU: 50
  }
})
```

### 3. Export Statistics Regularly

```typescript
// Export to external monitoring
setInterval(() => {
  const records = stats.export()
  sendToCloudWatch(records)
  stats.reset()
}, 60000) // Every minute
```

### 4. Act on Recommendations

```typescript
const recommendations = engine.generateRecommendations()

// Filter by severity
const critical = recommendations.filter(r => r.severity === 'error')

// Group by category
const byCategory = recommendations.reduce((acc, rec) => {
  acc[rec.category] = acc[rec.category] || []
  acc[rec.category].push(rec)
  return acc
}, {})
```

### 5. Monitor Access Patterns

```typescript
const stats = collector.getStats()

// Identify most used patterns
const patterns = Object.entries(stats.accessPatterns)
  .sort((a, b) => b[1].count - a[1].count)

console.log('Top access patterns:')
for (const [name, stats] of patterns.slice(0, 5)) {
  console.log(`  ${name}: ${stats.count} calls, ${stats.avgLatencyMs}ms avg`)
}
```

## Examples

See the [examples directory](../../examples) for complete working examples:

- [Statistics Monitoring](../../examples/standalone/stats-monitoring.ts)
- [Amplify with Monitoring](../../examples/amplify/with-monitoring.ts)

## Integration

### With Custom Data Access Layer

```typescript
import { StatsCollector } from '@ddb-lib/stats'

class MyCustomClient {
  private stats: StatsCollector

  constructor() {
    this.stats = new StatsCollector({ enabled: true })
  }

  async query(params: any) {
    const start = Date.now()
    
    try {
      const result = await this.dynamodb.query(params)
      
      // Record successful operation
      this.stats.record({
        operation: 'query',
        timestamp: start,
        latencyMs: Date.now() - start,
        rcu: result.ConsumedCapacity?.CapacityUnits,
        itemCount: result.Items?.length,
        scannedCount: result.ScannedCount
      })
      
      return result
    } catch (error) {
      // Still record failed operations
      this.stats.record({
        operation: 'query',
        timestamp: start,
        latencyMs: Date.now() - start,
        metadata: { error: error.message }
      })
      throw error
    }
  }

  getRecommendations() {
    const engine = new RecommendationEngine(this.stats)
    return engine.generateRecommendations()
  }
}
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- @ddb-lib/core (peer dependency)

## License

MIT
