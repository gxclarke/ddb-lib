---
title: "@ddb-lib/stats API"
weight: 20
description: "Statistics collection and anti-pattern detection for DynamoDB"
type: docs
---

# @ddb-lib/stats API Reference

Statistics collection, monitoring, and anti-pattern detection for DynamoDB operations.

## Installation

```bash
npm install @ddb-lib/stats
```

## Overview

The `@ddb-lib/stats` package provides:

- **StatsCollector** - Collect operation statistics and metrics
- **RecommendationEngine** - Generate optimization recommendations
- **AntiPatternDetector** - Detect common anti-patterns

## Quick Start

```typescript
import { StatsCollector, RecommendationEngine, AntiPatternDetector } from '@ddb-lib/stats'

// Create stats collector
const stats = new StatsCollector()

// Track operations (automatically done by TableClient)
stats.recordOperation('get', { success: true, latency: 15, itemSize: 1024 })

// Get statistics
const metrics = stats.getStats()
console.log(`Total operations: ${metrics.totalOperations}`)
console.log(`Average latency: ${metrics.avgLatency}ms`)

// Get recommendations
const engine = new RecommendationEngine(stats)
const recommendations = engine.getRecommendations()

// Detect anti-patterns
const detector = new AntiPatternDetector(stats)
const issues = detector.detectAll()
```

## StatsCollector Class

Collects and aggregates operation statistics.

### Constructor

```typescript
new StatsCollector(config?: StatsCollectorConfig)
```

**Parameters:**
- `config` - Optional configuration object
  - `trackItemSizes?: boolean` - Track item sizes (default: true)
  - `trackCapacity?: boolean` - Track capacity consumption (default: true)
  - `samplingRate?: number` - Sampling rate 0-1 (default: 1.0)

**Example:**
```typescript
const stats = new StatsCollector({
  trackItemSizes: true,
  trackCapacity: true,
  samplingRate: 0.1 // Sample 10% of operations
})
```

### recordOperation()

Record a DynamoDB operation.

```typescript
recordOperation(
  operation: string,
  details: OperationDetails
): void
```

**Parameters:**
- `operation` - Operation type ('get', 'put', 'query', 'scan', etc.)
- `details` - Operation details
  - `success: boolean` - Whether operation succeeded
  - `latency: number` - Operation latency in ms
  - `itemSize?: number` - Item size in bytes
  - `itemCount?: number` - Number of items
  - `capacityUnits?: number` - Capacity units consumed

**Example:**
```typescript
stats.recordOperation('query', {
  success: true,
  latency: 25,
  itemCount: 10,
  capacityUnits: 5
})
```

### getStats()

Get aggregated statistics.

```typescript
getStats(): Stats
```

**Returns:** Statistics object with:
- `totalOperations: number` - Total operations recorded
- `successRate: number` - Success rate (0-1)
- `avgLatency: number` - Average latency in ms
- `p50Latency: number` - 50th percentile latency
- `p99Latency: number` - 99th percentile latency
- `operationCounts: Record<string, number>` - Count by operation type
- `totalCapacityUnits: number` - Total capacity consumed
- `avgItemSize: number` - Average item size in bytes

**Example:**
```typescript
const stats = collector.getStats()
console.log(`Operations: ${stats.totalOperations}`)
console.log(`Success rate: ${(stats.successRate * 100).toFixed(2)}%`)
console.log(`P99 latency: ${stats.p99Latency}ms`)
```

### reset()

Reset all statistics.

```typescript
reset(): void
```

**Example:**
```typescript
stats.reset()
```

## RecommendationEngine Class

Generates optimization recommendations based on statistics.

### Constructor

```typescript
new RecommendationEngine(stats: StatsCollector)
```

**Parameters:**
- `stats` - StatsCollector instance

**Example:**
```typescript
const engine = new RecommendationEngine(stats)
```

### getRecommendations()

Get all recommendations.

```typescript
getRecommendations(): Recommendation[]
```

**Returns:** Array of recommendations with:
- `type: string` - Recommendation type
- `severity: 'low' | 'medium' | 'high'` - Severity level
- `message: string` - Human-readable message
- `impact: string` - Expected impact
- `action: string` - Recommended action

**Example:**
```typescript
const recommendations = engine.getRecommendations()

for (const rec of recommendations) {
  console.log(`[${rec.severity.toUpperCase()}] ${rec.message}`)
  console.log(`Impact: ${rec.impact}`)
  console.log(`Action: ${rec.action}`)
}
```

### getHighPriorityRecommendations()

Get only high-priority recommendations.

```typescript
getHighPriorityRecommendations(): Recommendation[]
```

**Returns:** Array of high-severity recommendations

**Example:**
```typescript
const urgent = engine.getHighPriorityRecommendations()
```

## AntiPatternDetector Class

Detects common DynamoDB anti-patterns.

### Constructor

```typescript
new AntiPatternDetector(stats: StatsCollector)
```

**Parameters:**
- `stats` - StatsCollector instance

**Example:**
```typescript
const detector = new AntiPatternDetector(stats)
```

### detectAll()

Detect all anti-patterns.

```typescript
detectAll(): AntiPattern[]
```

**Returns:** Array of detected anti-patterns with:
- `type: string` - Anti-pattern type
- `severity: 'low' | 'medium' | 'high'` - Severity level
- `message: string` - Description of the issue
- `impact: string` - Performance/cost impact
- `recommendation: string` - How to fix it

**Example:**
```typescript
const issues = detector.detectAll()

for (const issue of issues) {
  console.log(`⚠️  ${issue.type}: ${issue.message}`)
  console.log(`   Impact: ${issue.impact}`)
  console.log(`   Fix: ${issue.recommendation}`)
}
```

### detectExcessiveScans()

Detect excessive scan operations.

```typescript
detectExcessiveScans(): AntiPattern[]
```

**Returns:** Array of scan-related anti-patterns

**Example:**
```typescript
const scanIssues = detector.detectExcessiveScans()
```

### detectHotPartitions()

Detect hot partition patterns.

```typescript
detectHotPartitions(): AntiPattern[]
```

**Returns:** Array of hot partition anti-patterns

**Example:**
```typescript
const hotPartitions = detector.detectHotPartitions()
```

### detectMissingProjections()

Detect missing projection expressions.

```typescript
detectMissingProjections(): AntiPattern[]
```

**Returns:** Array of projection-related anti-patterns

**Example:**
```typescript
const projectionIssues = detector.detectMissingProjections()
```

### detectReadBeforeWrite()

Detect read-before-write patterns.

```typescript
detectReadBeforeWrite(): AntiPattern[]
```

**Returns:** Array of read-before-write anti-patterns

**Example:**
```typescript
const rbwIssues = detector.detectReadBeforeWrite()
```

### detectInefficientBatching()

Detect inefficient batching patterns.

```typescript
detectInefficientBatching(): AntiPattern[]
```

**Returns:** Array of batching-related anti-patterns

**Example:**
```typescript
const batchIssues = detector.detectInefficientBatching()
```

## Integration with TableClient

The stats package integrates seamlessly with `@ddb-lib/client`:

```typescript
import { TableClient } from '@ddb-lib/client'
import { StatsCollector, RecommendationEngine, AntiPatternDetector } from '@ddb-lib/stats'

// Create stats collector
const stats = new StatsCollector()

// Pass to TableClient
const table = new TableClient({
  tableName: 'MyTable',
  statsCollector: stats
})

// Operations are automatically tracked
await table.get({ pk: 'USER#123', sk: 'PROFILE' })
await table.query({ keyCondition: { pk: 'USER#123' } })

// Analyze statistics
const metrics = stats.getStats()
const recommendations = new RecommendationEngine(stats).getRecommendations()
const issues = new AntiPatternDetector(stats).detectAll()
```

## Monitoring Dashboard Example

```typescript
import { StatsCollector, RecommendationEngine, AntiPatternDetector } from '@ddb-lib/stats'

function printDashboard(stats: StatsCollector) {
  const metrics = stats.getStats()
  const engine = new RecommendationEngine(stats)
  const detector = new AntiPatternDetector(stats)
  
  console.log('=== DynamoDB Statistics ===')
  console.log(`Total Operations: ${metrics.totalOperations}`)
  console.log(`Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`)
  console.log(`Avg Latency: ${metrics.avgLatency.toFixed(2)}ms`)
  console.log(`P99 Latency: ${metrics.p99Latency.toFixed(2)}ms`)
  console.log(`Total Capacity: ${metrics.totalCapacityUnits} units`)
  
  console.log('\n=== Operations Breakdown ===')
  for (const [op, count] of Object.entries(metrics.operationCounts)) {
    console.log(`${op}: ${count}`)
  }
  
  console.log('\n=== Recommendations ===')
  const recommendations = engine.getRecommendations()
  if (recommendations.length === 0) {
    console.log('No recommendations - great job!')
  } else {
    for (const rec of recommendations) {
      console.log(`[${rec.severity}] ${rec.message}`)
    }
  }
  
  console.log('\n=== Anti-Patterns Detected ===')
  const issues = detector.detectAll()
  if (issues.length === 0) {
    console.log('No anti-patterns detected!')
  } else {
    for (const issue of issues) {
      console.log(`⚠️  ${issue.type}: ${issue.message}`)
    }
  }
}

// Run periodically
setInterval(() => {
  printDashboard(stats)
}, 60000) // Every minute
```

## Related Resources

- [Monitoring Guide](/guides/monitoring/)
- [Anti-Patterns](/anti-patterns/)
- [Best Practices](/best-practices/)
- [Examples](/examples/)

