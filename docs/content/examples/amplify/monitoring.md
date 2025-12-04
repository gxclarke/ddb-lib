---
title: "Amplify Monitoring"
weight: 20
description: "Monitor Amplify data operations"
type: docs
---

# Amplify Monitoring

This example demonstrates how to monitor AWS Amplify data operations using `@ddb-lib/amplify`.

## Source Code

View the complete source code: [examples/amplify/with-monitoring.ts](https://github.com/gxclarke/ddb-lib/blob/main/examples/amplify/with-monitoring.ts)

## Topics Covered

- AmplifyMonitor setup
- Statistics collection for Amplify operations
- Performance recommendations
- Anti-pattern detection
- Cost tracking

## Code Overview

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import { AntiPatternDetector, RecommendationEngine } from '@ddb-lib/stats'
import type { Schema } from '../amplify/data/resource'

// Initialize with monitoring
const client = generateClient<Schema>()
const monitor = new AmplifyMonitor(client)

// Perform operations (automatically monitored)
await monitor.create('User', {
  id: '123',
  name: 'John Doe'
})

const user = await monitor.get('User', { id: '123' })

// Get statistics
const stats = monitor.getStats()
const summary = stats.getSummary()

console.log('Total operations:', summary.totalOperations)
console.log('RCU consumed:', summary.totalRCU)
console.log('WCU consumed:', summary.totalWCU)

// Detect issues
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
}
```

## Running the Example

```bash
# From the repository root
npx tsx examples/amplify/with-monitoring.ts
```

## Prerequisites

- AWS Amplify Gen 2 project
- Amplify data schema configured
- AWS credentials configured

## Related Resources

- [Monitoring Guide](/guides/monitoring/)
- [AmplifyMonitor API Reference](/api/amplify/)
- [Statistics API Reference](/api/stats/)
- [Best Practices](/best-practices/)
