/**
 * Statistics and Recommendations Example
 *
 * This example demonstrates how to enable statistics collection,
 * retrieve performance metrics, and get optimization recommendations.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '../src/table-client'
import { PatternHelpers } from '../src/pattern-helpers'
import type { StatsConfig } from '../src/types'

// Example 1: Enable and configure statistics collection
async function enableStatsCollection() {
  console.log('\n=== Enable Statistics Collection ===\n')

  // Configure stats collection
  const statsConfig: StatsConfig = {
    enabled: true,
    sampleRate: 1.0, // Collect 100% of operations
    thresholds: {
      slowQueryMs: 100, // Queries slower than 100ms are flagged
      highRCU: 50, // High read capacity threshold
      highWCU: 50, // High write capacity threshold
    },
  }

  const table = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    statsConfig,
  })

  console.log('✓ Statistics collection enabled')
  console.log('  Sample rate: 100%')
  console.log('  Slow query threshold: 100ms')
  console.log('  High RCU threshold: 50')
  console.log('  High WCU threshold: 50')

  return table
}

// Example 2: Perform operations and collect stats
async function performOperationsWithStats() {
  console.log('\n=== Perform Operations with Stats Collection ===\n')

  const table = await enableStatsCollection()

  // Perform various operations
  console.log('Performing operations...')

  // Put operations
  for (let i = 1; i <= 10; i++) {
    await table.put({
      pk: `USER#user${i}`,
      sk: 'PROFILE',
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 20 + i,
    })
  }
  console.log('✓ Created 10 users')

  // Get operations
  for (let i = 1; i <= 5; i++) {
    await table.get({ pk: `USER#user${i}`, sk: 'PROFILE' })
  }
  console.log('✓ Retrieved 5 users')

  // Query operations
  await table.query({
    keyCondition: {
      pk: 'USER#user1',
    },
  })
  console.log('✓ Performed 1 query')

  // Update operations
  for (let i = 1; i <= 3; i++) {
    await table.update({ pk: `USER#user${i}`, sk: 'PROFILE' }, { age: 30 + i })
  }
  console.log('✓ Updated 3 users')

  // Batch operations
  await table.batchGet([
    { pk: 'USER#user1', sk: 'PROFILE' },
    { pk: 'USER#user2', sk: 'PROFILE' },
    { pk: 'USER#user3', sk: 'PROFILE' },
  ])
  console.log('✓ Performed 1 batch get')

  return table
}

// Example 3: Retrieve and analyze statistics
async function retrieveStatistics() {
  console.log('\n=== Retrieve Statistics ===\n')

  const table = await performOperationsWithStats()

  // Get aggregated statistics
  const stats = table.getStats()

  console.log('Operation Statistics:')
  console.log('-------------------')

  // Display stats for each operation type
  for (const [operation, opStats] of Object.entries(stats.operations)) {
    console.log(`\n${operation.toUpperCase()}:`)
    console.log(`  Count: ${opStats.count}`)
    console.log(`  Avg Latency: ${opStats.avgLatencyMs.toFixed(2)}ms`)
    console.log(`  Total Latency: ${opStats.totalLatencyMs.toFixed(2)}ms`)
    console.log(`  Total RCU: ${opStats.totalRCU}`)
    console.log(`  Total WCU: ${opStats.totalWCU}`)
  }

  // Display access pattern statistics if available
  if (Object.keys(stats.accessPatterns).length > 0) {
    console.log('\nAccess Pattern Statistics:')
    console.log('-------------------------')
    for (const [pattern, patternStats] of Object.entries(stats.accessPatterns)) {
      console.log(`\n${pattern}:`)
      console.log(`  Count: ${patternStats.count}`)
      console.log(`  Avg Latency: ${patternStats.avgLatencyMs.toFixed(2)}ms`)
      console.log(`  Avg Items Returned: ${patternStats.avgItemsReturned.toFixed(2)}`)
    }
  }

  return table
}

// Example 4: Get and act on recommendations
async function getRecommendations() {
  console.log('\n=== Get Recommendations ===\n')

  const table = await performOperationsWithStats()

  // Perform some inefficient operations to trigger recommendations

  // Scan operation (inefficient)
  console.log('Performing scan operation...')
  await table.scan()

  // Multiple individual gets (could be batched)
  console.log('Performing multiple individual gets...')
  for (let i = 1; i <= 10; i++) {
    await table.get({ pk: `USER#user${i}`, sk: 'PROFILE' })
  }

  // Get recommendations
  const recommendations = table.getRecommendations()

  console.log(`\nFound ${recommendations.length} recommendations:\n`)

  for (const rec of recommendations) {
    console.log(`[${rec.severity.toUpperCase()}] ${rec.category}`)
    console.log(`  Message: ${rec.message}`)
    console.log(`  Details: ${rec.details}`)
    if (rec.suggestedAction) {
      console.log(`  Suggested Action: ${rec.suggestedAction}`)
    }
    if (rec.estimatedImpact) {
      if (rec.estimatedImpact.costReduction) {
        console.log(`  Cost Reduction: ${rec.estimatedImpact.costReduction}`)
      }
      if (rec.estimatedImpact.performanceImprovement) {
        console.log(`  Performance Improvement: ${rec.estimatedImpact.performanceImprovement}`)
      }
    }
    console.log()
  }

  return { table, recommendations }
}

// Example 5: Act on specific recommendations
async function actOnRecommendations() {
  console.log('\n=== Act on Recommendations ===\n')

  const { table, recommendations } = await getRecommendations()

  // Example: Convert individual gets to batch get
  const batchRecommendation = recommendations.find((r) =>
    r.message.includes('batch'),
  )

  if (batchRecommendation) {
    console.log('Acting on batch recommendation...')
    console.log('Before: Multiple individual get operations')

    // Inefficient way
    const startIndividual = Date.now()
    for (let i = 1; i <= 5; i++) {
      await table.get({ pk: `USER#user${i}`, sk: 'PROFILE' })
    }
    const individualTime = Date.now() - startIndividual

    console.log(`  Individual gets took: ${individualTime}ms`)

    // Efficient way
    const startBatch = Date.now()
    await table.batchGet([
      { pk: 'USER#user1', sk: 'PROFILE' },
      { pk: 'USER#user2', sk: 'PROFILE' },
      { pk: 'USER#user3', sk: 'PROFILE' },
      { pk: 'USER#user4', sk: 'PROFILE' },
      { pk: 'USER#user5', sk: 'PROFILE' },
    ])
    const batchTime = Date.now() - startBatch

    console.log(`  Batch get took: ${batchTime}ms`)
    console.log(`  Improvement: ${((1 - batchTime / individualTime) * 100).toFixed(1)}% faster`)
  }

  // Example: Use projection expressions to reduce data transfer
  console.log('\nUsing projection expressions...')
  console.log('Before: Fetching entire item')

  const fullItem = await table.get({ pk: 'USER#user1', sk: 'PROFILE' })
  console.log(`  Full item size: ${JSON.stringify(fullItem).length} bytes`)

  console.log('After: Fetching only needed attributes')
  const projectedItem = await table.get(
    { pk: 'USER#user1', sk: 'PROFILE' },
    { projectionExpression: ['name', 'email'] },
  )
  console.log(`  Projected item size: ${JSON.stringify(projectedItem).length} bytes`)
  console.log(
    `  Reduction: ${((1 - JSON.stringify(projectedItem).length / JSON.stringify(fullItem).length) * 100).toFixed(1)}%`,
  )
}

// Example 6: Monitor hot partitions
async function monitorHotPartitions() {
  console.log('\n=== Monitor Hot Partitions ===\n')

  const table = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    statsConfig: {
      enabled: true,
      sampleRate: 1.0,
    },
  })

  // Create skewed access pattern (hot partition)
  console.log('Creating skewed access pattern...')

  // Access one partition heavily
  for (let i = 0; i < 50; i++) {
    await table.get({ pk: 'USER#popular', sk: 'PROFILE' })
  }

  // Access other partitions lightly
  for (let i = 1; i <= 10; i++) {
    await table.get({ pk: `USER#user${i}`, sk: 'PROFILE' })
  }

  console.log('✓ Created skewed access pattern')

  // Check for hot partition recommendations
  const recommendations = table.getRecommendations()
  const hotPartitionRecs = recommendations.filter((r) => r.category === 'hot-partition')

  if (hotPartitionRecs.length > 0) {
    console.log('\n⚠️  Hot Partition Detected!')
    for (const rec of hotPartitionRecs) {
      console.log(`  ${rec.message}`)
      console.log(`  ${rec.suggestedAction}`)
    }

    // Demonstrate solution: Use distributed keys
    console.log('\nSolution: Using distributed keys...')
    const shardCount = 10
    const distributedKey = PatternHelpers.distributedKey('USER#popular', shardCount)
    console.log(`  Original key: USER#popular`)
    console.log(`  Distributed key: ${distributedKey}`)
    console.log(`  Shard number: ${PatternHelpers.getShardNumber(distributedKey)}`)
  }
}

// Example 7: Export statistics for external analysis
async function exportStatistics() {
  console.log('\n=== Export Statistics ===\n')

  const table = await performOperationsWithStats()

  // Get the stats collector
  const statsCollector = (table as any).statsCollector

  if (statsCollector) {
    // Export raw operation stats
    const rawStats = statsCollector.export()

    console.log(`Exported ${rawStats.length} operation records`)
    console.log('\nSample records:')
    console.log(JSON.stringify(rawStats.slice(0, 3), null, 2))

    // You could save this to a file or send to an analytics service
    console.log('\n✓ Statistics exported successfully')
    console.log('  These can be saved to a file or sent to an analytics service')

    // Reset statistics
    console.log('\nResetting statistics...')
    statsCollector.reset()
    const statsAfterReset = table.getStats()
    console.log('✓ Statistics reset')
    console.log(`  Operations count after reset: ${Object.keys(statsAfterReset.operations).length}`)
  }
}

// Example 8: Sampling for high-traffic applications
async function samplingExample() {
  console.log('\n=== Sampling for High-Traffic Applications ===\n')

  // Configure with 10% sampling to reduce overhead
  const table = new TableClient({
    tableName: 'high-traffic-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    statsConfig: {
      enabled: true,
      sampleRate: 0.1, // Only collect 10% of operations
      thresholds: {
        slowQueryMs: 50,
        highRCU: 100,
        highWCU: 100,
      },
    },
  })

  console.log('✓ Statistics collection enabled with 10% sampling')
  console.log('  This reduces overhead in high-traffic scenarios')
  console.log('  Statistics will be extrapolated from the sample')

  // Perform operations
  console.log('\nPerforming 100 operations...')
  for (let i = 1; i <= 100; i++) {
    await table.put({
      pk: `USER#user${i}`,
      sk: 'PROFILE',
      name: `User ${i}`,
    })
  }

  const stats = table.getStats()
  console.log(`\n✓ Collected stats for ~${stats.operations.put?.count || 0} operations (10% sample)`)
  console.log('  Actual operations performed: 100')
}

// Run all examples
async function main() {
  try {
    await enableStatsCollection()
    await performOperationsWithStats()
    await retrieveStatistics()
    await getRecommendations()
    await actOnRecommendations()
    await monitorHotPartitions()
    await exportStatistics()
    await samplingExample()

    console.log('\n✓ All stats and recommendations examples completed successfully!\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Uncomment to run
// main()

export {
  enableStatsCollection,
  performOperationsWithStats,
  retrieveStatistics,
  getRecommendations,
  actOnRecommendations,
  monitorHotPartitions,
  exportStatistics,
  samplingExample,
}
