/**
 * Example: Anti-Pattern Detection
 * 
 * This example demonstrates how the StatsCollector detects common
 * DynamoDB anti-patterns and provides actionable recommendations.
 */

import { StatsCollector } from '../src/stats-collector'
import type { OperationStats } from '../src/types'

// Create a stats collector
const collector = new StatsCollector({
  enabled: true,
  sampleRate: 1.0, // Collect 100% of operations
})

console.log('=== Anti-Pattern Detection Example ===\n')

// Simulate various anti-patterns

// 1. Fetching to Filter Pattern
console.log('1. Simulating fetching-to-filter pattern...')
for (let i = 0; i < 5; i++) {
  collector.recordOperation({
    operation: 'query',
    tableName: 'Users',
    indexName: 'StatusIndex',
    accessPattern: 'getUsersByStatus',
    timestamp: Date.now(),
    latencyMs: 150,
    itemCount: 5,
    scannedCount: 100, // Only 5% efficiency - likely client-side filtering
  })
}

// 2. Sequential Writes Pattern
console.log('2. Simulating sequential writes pattern...')
const baseTime = Date.now()
for (let i = 0; i < 10; i++) {
  collector.recordOperation({
    operation: 'put',
    tableName: 'Orders',
    timestamp: baseTime + i * 50, // 50ms apart
    latencyMs: 30,
    itemCount: 1,
  })
}

// 3. Read-Before-Write Pattern
console.log('3. Simulating read-before-write pattern...')
for (let i = 0; i < 4; i++) {
  // Get operation
  collector.recordOperation({
    operation: 'get',
    tableName: 'Products',
    partitionKey: 'PRODUCT#123',
    timestamp: Date.now() + i * 5000,
    latencyMs: 20,
    itemCount: 1,
  })

  // Followed by put operation
  collector.recordOperation({
    operation: 'put',
    tableName: 'Products',
    partitionKey: 'PRODUCT#123',
    timestamp: Date.now() + i * 5000 + 100,
    latencyMs: 25,
    itemCount: 1,
  })
}

// 4. Large Items Pattern
console.log('4. Simulating large items pattern...')
collector.recordOperation({
  operation: 'put',
  tableName: 'Documents',
  timestamp: Date.now(),
  latencyMs: 200,
  itemCount: 1,
  itemSizeBytes: 150 * 1024, // 150KB
})

collector.recordOperation({
  operation: 'put',
  tableName: 'Documents',
  timestamp: Date.now(),
  latencyMs: 300,
  itemCount: 1,
  itemSizeBytes: 350 * 1024, // 350KB - approaching limit!
})

// 5. Uniform Partition Key Pattern
console.log('5. Simulating sequential partition keys pattern...')
for (let i = 1; i <= 25; i++) {
  collector.recordOperation({
    operation: 'put',
    tableName: 'Events',
    partitionKey: `EVENT#${i}`, // Sequential keys
    timestamp: Date.now(),
    latencyMs: 30,
    itemCount: 1,
  })
}

console.log('\n=== Generating Recommendations ===\n')

// Get all recommendations
const recommendations = collector.getRecommendations()

// Display recommendations grouped by severity
const bySeverity = {
  error: recommendations.filter(r => r.severity === 'error'),
  warning: recommendations.filter(r => r.severity === 'warning'),
  info: recommendations.filter(r => r.severity === 'info'),
}

console.log(`Found ${recommendations.length} recommendations:\n`)

if (bySeverity.error.length > 0) {
  console.log('🔴 ERRORS:')
  for (const rec of bySeverity.error) {
    console.log(`\n  ${rec.message}`)
    console.log(`  ${rec.details}`)
    console.log(`  → ${rec.suggestedAction}`)
    if (rec.estimatedImpact) {
      console.log(`  Impact: ${JSON.stringify(rec.estimatedImpact, null, 2)}`)
    }
  }
}

if (bySeverity.warning.length > 0) {
  console.log('\n⚠️  WARNINGS:')
  for (const rec of bySeverity.warning) {
    console.log(`\n  ${rec.message}`)
    console.log(`  ${rec.details}`)
    console.log(`  → ${rec.suggestedAction}`)
    if (rec.estimatedImpact) {
      console.log(`  Impact: ${JSON.stringify(rec.estimatedImpact, null, 2)}`)
    }
  }
}

if (bySeverity.info.length > 0) {
  console.log('\nℹ️  INFO:')
  for (const rec of bySeverity.info) {
    console.log(`\n  ${rec.message}`)
    console.log(`  ${rec.details}`)
    console.log(`  → ${rec.suggestedAction}`)
    if (rec.estimatedImpact) {
      console.log(`  Impact: ${JSON.stringify(rec.estimatedImpact, null, 2)}`)
    }
  }
}

console.log('\n=== Statistics Summary ===\n')

const stats = collector.getStats()

console.log('Operations:')
for (const [operation, opStats] of Object.entries(stats.operations)) {
  console.log(`  ${operation}:`)
  console.log(`    Count: ${opStats.count}`)
  console.log(`    Avg Latency: ${opStats.avgLatencyMs.toFixed(2)}ms`)
  console.log(`    Total RCU: ${opStats.totalRCU}`)
  console.log(`    Total WCU: ${opStats.totalWCU}`)
}

if (Object.keys(stats.accessPatterns).length > 0) {
  console.log('\nAccess Patterns:')
  for (const [pattern, patternStats] of Object.entries(stats.accessPatterns)) {
    console.log(`  ${pattern}:`)
    console.log(`    Count: ${patternStats.count}`)
    console.log(`    Avg Latency: ${patternStats.avgLatencyMs.toFixed(2)}ms`)
    console.log(`    Avg Items: ${patternStats.avgItemsReturned.toFixed(2)}`)
  }
}

console.log('\n=== Example Complete ===')
