---
title: "Statistics and Monitoring"
weight: 30
description: "Monitor and optimize DynamoDB operations"
type: docs
---

# Statistics and Monitoring Example

This example demonstrates how to monitor DynamoDB operations and detect performance issues using `@ddb-lib/stats`.

## Source Code

View the complete source code: [examples/standalone/stats-monitoring.ts](https://github.com/gxclarke/ddb-lib/blob/main/examples/standalone/stats-monitoring.ts)

## Topics Covered

- Statistics collection
- Anti-pattern detection
- Optimization recommendations
- Performance metrics
- Cost analysis

## Code Overview

```typescript
import { TableClient } from '@ddb-lib/client'
import { StatsCollector, AntiPatternDetector, RecommendationEngine } from '@ddb-lib/stats'

// Initialize with stats collection
const stats = new StatsCollector()
const table = new TableClient({
  client: dynamoClient,
  tableName: 'MyTable',
  statsCollector: stats
})

// Perform operations (stats are collected automatically)
await table.query({
  keyCondition: { pk: 'USER#123' }
})

// Get statistics
const summary = stats.getSummary()
console.log('Operations:', summary.totalOperations)
console.log('RCU consumed:', summary.totalRCU)
console.log('WCU consumed:', summary.totalWCU)

// Detect anti-patterns
const detector = new AntiPatternDetector(stats)
const issues = detector.detectAll()

for (const issue of issues) {
  console.log(`⚠️  ${issue.type}: ${issue.message}`)
}

// Get recommendations
const engine = new RecommendationEngine(stats)
const recommendations = engine.getRecommendations()

for (const rec of recommendations) {
  console.log(`💡 ${rec.title}`)
  console.log(`   ${rec.description}`)
}
```

## Running the Example

```bash
# From the repository root
npx tsx examples/standalone/stats-monitoring.ts
```

## Prerequisites

- Node.js 18+
- AWS credentials configured
- DynamoDB table with some data

## Related Resources

- [Monitoring Guide](/guides/monitoring/)
- [StatsCollector API Reference](/api/stats/)
- [Best Practices](/best-practices/)
- [Anti-Patterns](/anti-patterns/)
