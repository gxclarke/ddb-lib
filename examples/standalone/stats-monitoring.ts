/**
 * Statistics and Monitoring Example - Standalone Mode
 *
 * This example demonstrates how to use statistics collection and recommendations
 * with @ddb-lib/client and @ddb-lib/stats packages.
 *
 * Requirements: 7.2, 7.3
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient, type StatsConfig } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

/**
 * Example 1: Enable Statistics Collection
 */
async function enableStatsCollection() {
  console.log('\n=== Enable Statistics Collection ===\n')

  // Configure stats collection with thresholds
  const statsConfig: StatsConfig = {
    enabled: true,
    sampleRate: 1.0, // Collect 100% of operations
    thresholds: {
      slowQueryMs: 100, // Flag queries slower than 100ms
      highRCU: 50, // High read capacity threshold
      highWCU: 50, // High write capacity threshold
    },
  }

  const client = new TableClient({
    tableName: 'my-app-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000', // DynamoDB Local
    }),
    statsConfig,
  })

  console.log('✓ Statistics collection enabled')
  console.log('  Sample rate: 100%')
  console.log('  Slow query threshold: 100ms')
  console.log('  High RCU threshold: 50')
  console.log('  High WCU threshold: 50')

  return client
}

/**
 * Example 2: Perform Operations and Collect Stats
 */
async function performOperationsWithStats() {
  console.log('\n=== Perform Operations with Stats Collection ===\n')

  const client = await enableStatsCollection()

  // Perform various operations
  console.log('Performing operations...')

  // Put operations
  for (let i = 1; i <= 10; i++) {
    await client.put({
      pk: PatternHelpers.entityKey('USER', `user-${i}`),
      sk: 'PROFILE',
      userId: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 20 + i,
      createdAt: new Date().toISOString(),
    })
  }
  console.log('✓ Created 10 users')

  // Get operations
  for (let i = 1; i <= 5; i++) {
    await client.get({
      pk: PatternHelpers.entityKey('USER', `user-${i}`),
      sk: 'PROFILE',
    })
  }
  console.log('✓ Retrieved 5 users')

  // Query operations
  await client.query({
    keyCondition: {
      pk: PatternHelpers.entityKey('USER', 'user-1'),
    },
  })
  console.log('✓ Performed 1 query')

  // Update operations
  for (let i = 1; i <= 3; i++) {
    await client.update(
      {
        pk: PatternHelpers.entityKey('USER', `user-${i}`),
        sk: 'PROFILE',
      },
      { age: 30 + i },
    )
  }
  console.log('✓ Updated 3 users')

  // Batch operations
  await client.batchGet([
    { pk: PatternHelpers.entityKey('USER', 'user-1'), sk: 'PROFILE' },
    { pk: PatternHelpers.entityKey('USER', 'user-2'), sk: 'PROFILE' },
    { pk: PatternHelpers.entityKey('USER', 'user-3'), sk: 'PROFILE' },
  ])
  console.log('✓ Performed 1 batch get')

  return client
}

/**
 * Example 3: Retrieve and Analyze Statistics
 */
async function retrieveStatistics() {
  console.log('\n=== Retrieve Statistics ===\n')

  const client = await performOperationsWithStats()

  // Get aggregated statistics
  const stats = client.getStats()

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
    if (opStats.slowOperations > 0) {
      console.log(`  Slow Operations: ${opStats.slowOperations}`)
    }
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
      console.log(`  Avg Scanned Count: ${patternStats.avgScannedCount.toFixed(2)}`)
    }
  }

  return client
}

/**
 * Example 4: Get Optimization Recommendations
 */
async function getOptimizationRecommendations() {
  console.log('\n=== Get Optimization Recommendations ===\n')

  const client = await performOperationsWithStats()

  // Perform some inefficient operations to trigger recommendations

  // Scan operation (inefficient)
  console.log('Performing scan operation...')
  await client.scan()

  // Multiple individual gets (could be batched)
  console.log('Performing multiple individual gets...')
  for (let i = 1; i <= 10; i++) {
    await client.get({
      pk: PatternHelpers.entityKey('USER', `user-${i}`),
      sk: 'PROFILE',
    })
  }

  // Get recommendations
  const recommendations = client.getRecommendations()

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

  return { client, recommendations }
}

/**
 * Example 5: Act on Recommendations
 */
async function actOnRecommendations() {
  console.log('\n=== Act on Recommendations ===\n')

  const { client } = await getOptimizationRecommendations()

  // Example: Convert individual gets to batch get
  console.log('Demonstrating batch optimization...')
  console.log('Before: Multiple individual get operations')

  // Inefficient way
  const startIndividual = Date.now()
  for (let i = 1; i <= 5; i++) {
    await client.get({
      pk: PatternHelpers.entityKey('USER', `user-${i}`),
      sk: 'PROFILE',
    })
  }
  const individualTime = Date.now() - startIndividual

  console.log(`  Individual gets took: ${individualTime}ms`)

  // Efficient way
  const startBatch = Date.now()
  await client.batchGet([
    { pk: PatternHelpers.entityKey('USER', 'user-1'), sk: 'PROFILE' },
    { pk: PatternHelpers.entityKey('USER', 'user-2'), sk: 'PROFILE' },
    { pk: PatternHelpers.entityKey('USER', 'user-3'), sk: 'PROFILE' },
    { pk: PatternHelpers.entityKey('USER', 'user-4'), sk: 'PROFILE' },
    { pk: PatternHelpers.entityKey('USER', 'user-5'), sk: 'PROFILE' },
  ])
  const batchTime = Date.now() - startBatch

  console.log(`  Batch get took: ${batchTime}ms`)
  if (individualTime > 0) {
    console.log(`  Improvement: ${((1 - batchTime / individualTime) * 100).toFixed(1)}% faster`)
  }

  // Example: Use projection expressions to reduce data transfer
  console.log('\nDemonstrating projection optimization...')
  console.log('Before: Fetching entire item')

  const fullItem = await client.get({
    pk: PatternHelpers.entityKey('USER', 'user-1'),
    sk: 'PROFILE',
  })
  console.log(`  Full item size: ${JSON.stringify(fullItem).length} bytes`)

  console.log('After: Fetching only needed attributes')
  const projectedItem = await client.get(
    {
      pk: PatternHelpers.entityKey('USER', 'user-1'),
      sk: 'PROFILE',
    },
    { projectionExpression: ['name', 'email'] },
  )
  console.log(`  Projected item size: ${JSON.stringify(projectedItem).length} bytes`)
  if (fullItem) {
    const reduction =
      ((1 - JSON.stringify(projectedItem).length / JSON.stringify(fullItem).length) * 100).toFixed(
        1,
      )
    console.log(`  Reduction: ${reduction}%`)
  }
}

/**
 * Example 6: Monitor Hot Partitions
 */
async function monitorHotPartitions() {
  console.log('\n=== Monitor Hot Partitions ===\n')

  const client = new TableClient({
    tableName: 'my-app-table',
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

  const popularKey = PatternHelpers.entityKey('USER', 'popular-user')

  // Create the popular user
  await client.put({
    pk: popularKey,
    sk: 'PROFILE',
    userId: 'popular-user',
    name: 'Popular User',
    email: 'popular@example.com',
  })

  // Access one partition heavily
  for (let i = 0; i < 50; i++) {
    await client.get({ pk: popularKey, sk: 'PROFILE' })
  }

  // Access other partitions lightly
  for (let i = 1; i <= 10; i++) {
    await client.get({
      pk: PatternHelpers.entityKey('USER', `user-${i}`),
      sk: 'PROFILE',
    })
  }

  console.log('✓ Created skewed access pattern')

  // Check for hot partition recommendations
  const recommendations = client.getRecommendations()
  const hotPartitionRecs = recommendations.filter((r) => r.category === 'hot-partition')

  if (hotPartitionRecs.length > 0) {
    console.log('\n⚠️  Hot Partition Detected!')
    for (const rec of hotPartitionRecs) {
      console.log(`  ${rec.message}`)
      if (rec.suggestedAction) {
        console.log(`  ${rec.suggestedAction}`)
      }
    }

    // Demonstrate solution: Use distributed keys
    console.log('\nSolution: Using distributed keys...')
    const shardCount = 10
    const distributedKey = PatternHelpers.distributedKey(popularKey, shardCount)
    console.log(`  Original key: ${popularKey}`)
    console.log(`  Distributed key: ${distributedKey}`)
    console.log(`  Shard number: ${PatternHelpers.getShardNumber(distributedKey)}`)
    console.log(`  This distributes load across ${shardCount} partitions`)
  } else {
    console.log('\n✓ No hot partitions detected')
  }
}

/**
 * Example 7: Sampling for High-Traffic Applications
 */
async function samplingExample() {
  console.log('\n=== Sampling for High-Traffic Applications ===\n')

  // Configure with 10% sampling to reduce overhead
  const client = new TableClient({
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
  console.log('  Statistics will be representative of the sample')

  // Perform operations
  console.log('\nPerforming 100 operations...')
  for (let i = 1; i <= 100; i++) {
    await client.put({
      pk: PatternHelpers.entityKey('USER', `user-${i}`),
      sk: 'PROFILE',
      userId: `user-${i}`,
      name: `User ${i}`,
    })
  }

  const stats = client.getStats()
  const putCount = stats.operations.put?.count || 0
  console.log(`\n✓ Collected stats for ~${putCount} operations (10% sample)`)
  console.log('  Actual operations performed: 100')
  console.log('  Sample provides representative performance metrics')
}

/**
 * Example 8: Export Statistics for External Analysis
 */
async function exportStatistics() {
  console.log('\n=== Export Statistics ===\n')

  const client = await performOperationsWithStats()

  // Access the stats collector (internal API)
  const statsCollector = (client as any).statsCollector

  if (statsCollector) {
    // Export raw operation records
    const rawStats = statsCollector.export()

    console.log(`Exported ${rawStats.length} operation records`)
    console.log('\nSample records:')
    console.log(JSON.stringify(rawStats.slice(0, 3), null, 2))

    console.log('\n✓ Statistics exported successfully')
    console.log('  These can be:')
    console.log('  - Saved to a file for historical analysis')
    console.log('  - Sent to an analytics service (CloudWatch, DataDog, etc.)')
    console.log('  - Processed by custom monitoring tools')

    // Reset statistics
    console.log('\nResetting statistics...')
    statsCollector.reset()
    const statsAfterReset = client.getStats()
    console.log('✓ Statistics reset')
    console.log(`  Operations tracked after reset: ${Object.keys(statsAfterReset.operations).length}`)
  }
}

/**
 * Example 9: Real-Time Monitoring Dashboard Data
 */
async function realTimeMonitoringData() {
  console.log('\n=== Real-Time Monitoring Dashboard Data ===\n')

  const client = new TableClient({
    tableName: 'monitored-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    statsConfig: {
      enabled: true,
      sampleRate: 1.0,
      thresholds: {
        slowQueryMs: 100,
        highRCU: 50,
        highWCU: 50,
      },
    },
  })

  // Simulate application traffic
  console.log('Simulating application traffic...')

  for (let i = 0; i < 20; i++) {
    // Mix of operations
    await client.put({
      pk: PatternHelpers.entityKey('USER', `user-${i}`),
      sk: 'PROFILE',
      userId: `user-${i}`,
      name: `User ${i}`,
    })

    if (i % 3 === 0) {
      await client.get({
        pk: PatternHelpers.entityKey('USER', `user-${i}`),
        sk: 'PROFILE',
      })
    }

    if (i % 5 === 0) {
      await client.query({
        keyCondition: {
          pk: PatternHelpers.entityKey('USER', `user-${i}`),
        },
      })
    }
  }

  console.log('✓ Traffic simulation complete')

  // Get real-time metrics
  const stats = client.getStats()
  const recommendations = client.getRecommendations()

  console.log('\nReal-Time Dashboard Metrics:')
  console.log('---------------------------')
  console.log(`Total Operations: ${Object.values(stats.operations).reduce((sum, op) => sum + op.count, 0)}`)
  console.log(`Avg Latency: ${(Object.values(stats.operations).reduce((sum, op) => sum + op.avgLatencyMs, 0) / Object.keys(stats.operations).length).toFixed(2)}ms`)
  console.log(`Total RCU: ${Object.values(stats.operations).reduce((sum, op) => sum + op.totalRCU, 0)}`)
  console.log(`Total WCU: ${Object.values(stats.operations).reduce((sum, op) => sum + op.totalWCU, 0)}`)
  console.log(`Active Recommendations: ${recommendations.length}`)

  // Breakdown by severity
  const severityCounts = recommendations.reduce(
    (acc, rec) => {
      acc[rec.severity] = (acc[rec.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  if (Object.keys(severityCounts).length > 0) {
    console.log('\nRecommendations by Severity:')
    for (const [severity, count] of Object.entries(severityCounts)) {
      console.log(`  ${severity}: ${count}`)
    }
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    await enableStatsCollection()
    await performOperationsWithStats()
    await retrieveStatistics()
    await getOptimizationRecommendations()
    await actOnRecommendations()
    await monitorHotPartitions()
    await samplingExample()
    await exportStatistics()
    await realTimeMonitoringData()

    console.log('\n✓ All stats monitoring examples completed successfully!\n')
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
  getOptimizationRecommendations,
  actOnRecommendations,
  monitorHotPartitions,
  samplingExample,
  exportStatistics,
  realTimeMonitoringData,
}
