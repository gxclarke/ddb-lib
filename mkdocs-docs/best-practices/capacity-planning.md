---
title: Capacity Planning
description: Understand your access patterns and plan capacity to optimize costs and performance
---

# Capacity planning: optimize costs and performance

## The practice

**Understand your access patterns and plan capacity accordingly. Choose the right capacity mode (on-demand vs provisioned) and monitor usage to optimize costs.**

Proper capacity planning ensures your application has the throughput it needs while minimizing costs. DynamoDB offers two capacity modes, each suited for different workload patterns.

## Why it matters

### Cost optimization
- Provisioned capacity can be 5-10x cheaper than on-demand for steady workloads
- On-demand eliminates waste for unpredictable traffic
- Right-sizing prevents over-provisioning

### Performance
- Adequate capacity prevents throttling
- Auto-scaling responds to traffic changes
- Burst capacity handles temporary spikes

### Predictability
- Understand your costs before they occur
- Plan for growth and scaling
- Avoid surprise bills

## Capacity modes comparison

| Aspect | On-demand | Provisioned |
|--------|-----------|-------------|
| **Best for** | Unpredictable workloads | Steady, predictable traffic |
| **Pricing** | Per-request | Per-hour capacity |
| **Cost** | Higher per request | Lower for consistent traffic |
| **Scaling** | Automatic, instant | Manual or auto-scaling |
| **Planning** | None required | Requires capacity planning |
| **Throttling risk** | Very low | Possible if under-provisioned |

!!! info "Choosing a Capacity Mode"
    Use **on-demand** for new applications, unpredictable workloads, or spiky traffic. Use **provisioned** for mature applications with steady, predictable traffic patterns to save costs.

## Understanding capacity units

### Read capacity units (RCU)

- **1 RCU** = 1 strongly consistent read per second for items up to 4KB
- **1 RCU** = 2 eventually consistent reads per second for items up to 4KB
- Items larger than 4KB consume additional RCU (rounded up)

```typescript
// Examples of RCU consumption

// 1KB item, strongly consistent
// 1 RCU per read

// 1KB item, eventually consistent
// 0.5 RCU per read

// 10KB item, strongly consistent
// 3 RCU per read (10KB / 4KB = 2.5, rounded up to 3)

// 10KB item, eventually consistent
// 1.5 RCU per read
```

### Write capacity units (WCU)

- **1 WCU** = 1 write per second for items up to 1KB
- Items larger than 1KB consume additional WCU (rounded up)

```typescript
// Examples of WCU consumption

// 500 bytes item
// 1 WCU per write

// 1KB item
// 1 WCU per write

// 3.5KB item
// 4 WCU per write (3.5KB / 1KB = 3.5, rounded up to 4)
```

## Calculating capacity requirements

### Step 1: understand your access patterns

```typescript
// Track your operations
import { StatsCollector } from '@ddb-lib/stats'

const stats = new StatsCollector()
const table = new TableClient({
  tableName: 'Users',
  statsCollector: stats
})

// After running your application
const summary = stats.getSummary()

console.log('Operations per second:')
console.log(`  Reads: ${summary.operations.get + summary.operations.query}`)
console.log(`  Writes: ${summary.operations.put + summary.operations.update}`)
console.log(`Average item size: ${summary.avgItemSize} bytes`)
```

### Step 2: calculate required capacity

```typescript
// Calculate RCU requirements
function calculateRCU(
  readsPerSecond: number,
  avgItemSizeKB: number,
  stronglyConsistent = true
): number {
  const rcuPerRead = Math.ceil(avgItemSizeKB / 4)
  const multiplier = stronglyConsistent ? 1 : 0.5
  return Math.ceil(readsPerSecond * rcuPerRead * multiplier)
}

// Calculate WCU requirements
function calculateWCU(
  writesPerSecond: number,
  avgItemSizeKB: number
): number {
  const wcuPerWrite = Math.ceil(avgItemSizeKB / 1)
  return Math.ceil(writesPerSecond * wcuPerWrite)
}

// Example calculation
const readsPerSecond = 100
const writesPerSecond = 20
const avgItemSizeKB = 2

const requiredRCU = calculateRCU(readsPerSecond, avgItemSizeKB, true)
const requiredWCU = calculateWCU(writesPerSecond, avgItemSizeKB)

console.log(`Required capacity:`)
console.log(`  RCU: ${requiredRCU}`)
console.log(`  WCU: ${requiredWCU}`)
```

### Step 3: add buffer for bursts

```typescript
// Add 20-30% buffer for traffic spikes
const bufferMultiplier = 1.25

const provisionedRCU = Math.ceil(requiredRCU * bufferMultiplier)
const provisionedWCU = Math.ceil(requiredWCU * bufferMultiplier)

console.log(`Provisioned capacity (with 25% buffer):`)
console.log(`  RCU: ${provisionedRCU}`)
console.log(`  WCU: ${provisionedWCU}`)
```

## Cost comparison

### On-demand pricing

```typescript
// On-demand pricing (approximate, varies by region)
const onDemandReadCost = 0.25 / 1_000_000  // $0.25 per million reads
const onDemandWriteCost = 1.25 / 1_000_000  // $1.25 per million writes

function calculateOnDemandCost(
  readsPerMonth: number,
  writesPerMonth: number
): number {
  const readCost = readsPerMonth * onDemandReadCost
  const writeCost = writesPerMonth * onDemandWriteCost
  return readCost + writeCost
}

// Example: 100M reads, 20M writes per month
const monthlyCost = calculateOnDemandCost(100_000_000, 20_000_000)
console.log(`On-demand monthly cost: $${monthlyCost.toFixed(2)}`)
// Output: On-demand monthly cost: $50.00
```

### Provisioned pricing

```typescript
// Provisioned pricing (approximate, varies by region)
const provisionedRCUCost = 0.00013 / 3600  // $0.00013 per RCU-hour
const provisionedWCUCost = 0.00065 / 3600  // $0.00065 per WCU-hour

function calculateProvisionedCost(
  rcu: number,
  wcu: number,
  hoursPerMonth = 730
): number {
  const readCost = rcu * provisionedRCUCost * hoursPerMonth
  const writeCost = wcu * provisionedWCUCost * hoursPerMonth
  return readCost + writeCost
}

// Example: 50 RCU, 10 WCU
const monthlyCost = calculateProvisionedCost(50, 10)
console.log(`Provisioned monthly cost: $${monthlyCost.toFixed(2)}`)
// Output: Provisioned monthly cost: $1.31
```

### Cost comparison example

```typescript
// Scenario: Steady traffic
// 100 reads/sec, 20 writes/sec, 2KB items
// 259M reads, 52M writes per month

const onDemandCost = calculateOnDemandCost(259_000_000, 52_000_000)
const provisionedCost = calculateProvisionedCost(125, 40)

console.log(`Monthly costs:`)
console.log(`  On-demand: $${onDemandCost.toFixed(2)}`)
console.log(`  Provisioned: $${provisionedCost.toFixed(2)}`)
console.log(`  Savings: $${(onDemandCost - provisionedCost).toFixed(2)} (${((1 - provisionedCost / onDemandCost) * 100).toFixed(0)}%)`)

// Output:
// Monthly costs:
//   On-demand: $129.75
//   Provisioned: $3.28
//   Savings: $126.47 (97%)
```

!!! success "Cost Savings"
    For steady, predictable workloads, provisioned capacity can save 90%+ compared to on-demand!

## Auto-scaling configuration

### Setting up auto-scaling

```typescript
// Configure auto-scaling for provisioned capacity
// (typically done via AWS Console, CloudFormation, or CDK)

const autoScalingConfig = {
  minCapacity: 5,      // Minimum RCU/WCU
  maxCapacity: 100,    // Maximum RCU/WCU
  targetUtilization: 70, // Target 70% utilization
  scaleInCooldown: 60,   // Wait 60s before scaling in
  scaleOutCooldown: 60   // Wait 60s before scaling out
}

// Auto-scaling will:
// - Scale up when utilization > 70% for 2 consecutive minutes
// - Scale down when utilization < 70% for 15 consecutive minutes
```

### Monitoring auto-scaling

```typescript
// Monitor capacity utilization
import { CloudWatch } from '@aws-sdk/client-cloudwatch'

const cloudwatch = new CloudWatch({})

async function getCapacityUtilization(tableName: string) {
  const metrics = await cloudwatch.getMetricStatistics({
    Namespace: 'AWS/DynamoDB',
    MetricName: 'ConsumedReadCapacityUnits',
    Dimensions: [{ Name: 'TableName', Value: tableName }],
    StartTime: new Date(Date.now() - 3600000), // Last hour
    EndTime: new Date(),
    Period: 300, // 5 minutes
    Statistics: ['Average', 'Maximum']
  })
  
  return metrics.Datapoints
}
```

## Monitoring and optimization

### Key metrics to monitor

```typescript
// Use stats collector to track capacity usage
const stats = new StatsCollector()

// After operations
const summary = stats.getSummary()

console.log('Capacity metrics:')
console.log(`  Total RCU consumed: ${summary.totalRCU}`)
console.log(`  Total WCU consumed: ${summary.totalWCU}`)
console.log(`  Peak RCU/sec: ${summary.peakRCU}`)
console.log(`  Peak WCU/sec: ${summary.peakWCU}`)
console.log(`  Average item size: ${summary.avgItemSize} bytes`)
```

### Identifying optimization opportunities

```typescript
import { RecommendationEngine } from '@ddb-lib/stats'

const recommendations = new RecommendationEngine(stats)
const capacityRecommendations = recommendations.getRecommendations()
  .filter(r => r.type === 'CAPACITY')

for (const rec of capacityRecommendations) {
  console.log(`${rec.message}`)
  console.log(`  Impact: ${rec.impact}`)
  console.log(`  Suggestion: ${rec.suggestion}`)
}

// Example output:
// "Table is over-provisioned"
//   Impact: "Wasting $50/month"
//   Suggestion: "Reduce RCU from 100 to 50"
```

## Capacity planning strategies

### Strategy 1: start with on-demand

```typescript
// For new applications, start with on-demand
const table = new TableClient({
  tableName: 'NewApp',
  billingMode: 'PAY_PER_REQUEST'
})

// Monitor for 1-2 weeks to understand patterns
// Then switch to provisioned if traffic is steady
```

### Strategy 2: use reserved capacity

```typescript
// For predictable, long-term workloads
// Purchase reserved capacity for 1-3 years
// Saves up to 76% compared to provisioned

// Reserved capacity pricing (approximate):
// 1-year: 43% savings
// 3-year: 76% savings

// Example: 100 RCU reserved for 1 year
const standardCost = 100 * 0.00013 * 730 * 12  // $113.88/year
const reservedCost = standardCost * 0.57        // $64.91/year
const savings = standardCost - reservedCost     // $48.97/year
```

### Strategy 3: separate hot and cold data

```typescript
// Use different tables for different access patterns

// Hot data: frequently accessed, provisioned capacity
const hotTable = new TableClient({
  tableName: 'HotData',
  billingMode: 'PROVISIONED',
  readCapacity: 100,
  writeCapacity: 50
})

// Cold data: rarely accessed, on-demand
const coldTable = new TableClient({
  tableName: 'ColdData',
  billingMode: 'PAY_PER_REQUEST'
})

// Archive old data to cold table
// Saves costs while maintaining access
```

### Strategy 4: use GSI projections wisely

```typescript
// GSIs consume additional capacity
// Project only needed attributes to reduce costs

// Bad: Project all attributes
const gsiConfig = {
  indexName: 'StatusIndex',
  projectionType: 'ALL'  // Doubles storage and capacity costs
}

// Good: Project only needed attributes
const gsiConfig = {
  indexName: 'StatusIndex',
  projectionType: 'INCLUDE',
  nonKeyAttributes: ['name', 'email']  // Only what's needed
}
```

## Handling traffic spikes

### Burst capacity

DynamoDB provides burst capacity for temporary spikes:

- **Burst capacity**: 300 seconds of unused capacity
- Automatically available, no configuration needed
- Helps handle short-term spikes

```typescript
// Example: Provisioned 10 RCU
// Unused capacity accumulates up to 3000 RCU (10 * 300)
// Can burst to 30 RCU/sec for 100 seconds
```

### Adaptive capacity

DynamoDB automatically redistributes capacity for hot partitions:

- Isolates frequently accessed items
- Provides additional throughput automatically
- No configuration needed

!!! info "Burst and Adaptive Capacity"
    While burst and adaptive capacity help with spikes, don't rely on them for sustained traffic. Provision adequate capacity or use on-demand mode.

## Common mistakes to avoid

### ❌ mistake 1: under-provisioning

```typescript
// Bad: Provisioning exactly for average load
const avgRCU = 50
const provisionedRCU = 50  // No buffer!

// Good: Add buffer for spikes
const provisionedRCU = Math.ceil(avgRCU * 1.25)  // 25% buffer
```

### ❌ mistake 2: not monitoring utilization

```typescript
// Bad: Set and forget
// Provision capacity and never check again

// Good: Monitor and adjust
setInterval(async () => {
  const utilization = await getCapacityUtilization('MyTable')
  if (utilization.average < 0.3) {
    console.log('Consider reducing capacity')
  }
}, 86400000)  // Check daily
```

### ❌ mistake 3: using on-demand for steady traffic

```typescript
// Bad: Using on-demand for predictable workload
// Costs 5-10x more than provisioned

// Good: Switch to provisioned after understanding patterns
// Monitor for 1-2 weeks, then switch if traffic is steady
```

## Key takeaways

1. **Choose the right mode** - on-demand for unpredictable, provisioned for steady traffic
2. **Calculate requirements** - understand your access patterns and item sizes
3. **Add buffer capacity** - 20-30% buffer for traffic spikes
4. **Monitor continuously** - track utilization and adjust as needed
5. **Optimize costs** - use reserved capacity, projections, and separate hot/cold data

## Related best practices

- [Query vs scan](query-vs-scan.md) - Efficient queries reduce capacity needs
- [Projection expressions](projection-expressions.md) - Reduce RCU consumption
- [Batch operations](batch-operations/) - Maximize throughput efficiency

## Related guides

- [Monitoring](../guides/monitoring/) - Track capacity usage with stats
- [Core operations](../guides/core-operations/) - Understand operation costs
- [Access patterns](../guides/access-patterns/) - Design efficient access patterns
