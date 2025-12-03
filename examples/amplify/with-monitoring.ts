/**
 * Amplify with Monitoring Example
 *
 * This example demonstrates how to use AmplifyMonitor to collect statistics
 * and get optimization recommendations for your Amplify Gen 2 application.
 *
 * Requirements: 7.1, 7.2, 7.3
 */

import { AmplifyMonitor } from '@ddb-lib/amplify'

// Mock Amplify client for demonstration
const mockAmplifyClient = {
  models: {
    Todo: {
      name: 'Todo',
      async get({ id }: { id: string }) {
        // Simulate varying latency
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
        return {
          id,
          title: 'Sample Todo',
          completed: false,
          priority: 'MEDIUM',
        }
      },
      async list(options?: any) {
        // Simulate slower list operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 150))
        const items = Array.from({ length: 25 }, (_, i) => ({
          id: `${i + 1}`,
          title: `Todo ${i + 1}`,
          completed: i % 2 === 0,
          priority: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
        }))
        return items
      },
      async create(data: any) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30))
        return {
          id: Math.random().toString(36).substring(7),
          ...data,
          createdAt: new Date().toISOString(),
        }
      },
      async update({ id, ...data }: any) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 40))
        return { id, ...data, updatedAt: new Date().toISOString() }
      },
      async delete({ id }: { id: string }) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
      },
    },
  },
}

/**
 * Example 1: Basic Statistics Collection
 */
async function basicStatistics() {
  console.log('\n=== Basic Statistics Collection ===\n')

  // Create monitor with statistics enabled
  const monitor = new AmplifyMonitor({
    statsConfig: {
      enabled: true,
      sampleRate: 1.0, // Monitor all operations
      thresholds: {
        slowQueryMs: 100,
        highRCU: 50,
        highWCU: 50,
      },
    },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Perform various operations
  console.log('Performing operations...')
  await monitoredTodos.create({ title: 'Task 1', priority: 'HIGH' })
  await monitoredTodos.create({ title: 'Task 2', priority: 'LOW' })
  await monitoredTodos.get('123')
  await monitoredTodos.list()
  await monitoredTodos.update('123', { completed: true })
  await monitoredTodos.delete('456')

  // Get statistics
  console.log('\n--- Statistics Summary ---')
  const stats = monitor.getStats()

  // Overall statistics
  const totalOps = Object.values(stats.operations).reduce((sum: number, op: any) => sum + op.count, 0)
  const avgLatency = Object.values(stats.operations).reduce(
    (sum: number, op: any) => sum + op.avgLatencyMs * op.count,
    0
  ) / totalOps

  console.log(`Total operations: ${totalOps}`)
  console.log(`Average latency: ${avgLatency.toFixed(2)}ms`)

  // Per-operation statistics
  console.log('\nPer-operation breakdown:')
  for (const [opType, opStats] of Object.entries(stats.operations)) {
    const op = opStats as any
    console.log(`\n${opType.toUpperCase()}:`)
    console.log(`  Count: ${op.count}`)
    console.log(`  Avg latency: ${op.avgLatencyMs.toFixed(2)}ms`)
    console.log(`  Total latency: ${op.totalLatencyMs.toFixed(2)}ms`)
    if (op.slowOperations > 0) {
      console.log(`  Slow operations: ${op.slowOperations}`)
    }
  }
}

/**
 * Example 2: Getting Recommendations
 */
async function getRecommendations() {
  console.log('\n=== Getting Optimization Recommendations ===\n')

  const monitor = new AmplifyMonitor({
    statsConfig: {
      enabled: true,
      thresholds: {
        slowQueryMs: 80, // Lower threshold to trigger recommendations
        highRCU: 30,
        highWCU: 30,
      },
    },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Perform operations that might trigger recommendations
  console.log('Performing operations...')

  // Multiple list operations (potentially slow)
  for (let i = 0; i < 5; i++) {
    await monitoredTodos.list()
  }

  // Multiple get operations
  for (let i = 0; i < 10; i++) {
    await monitoredTodos.get(`${i}`)
  }

  // Get recommendations
  console.log('\n--- Optimization Recommendations ---')
  const recommendations = monitor.getRecommendations()

  if (recommendations.length === 0) {
    console.log('✓ No issues detected - your usage looks good!')
  } else {
    console.log(`Found ${recommendations.length} recommendation(s):\n`)

    recommendations.forEach((rec: any, index: number) => {
      console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.category}`)
      console.log(`   ${rec.message}`)
      console.log(`   Details: ${rec.details}`)
      if (rec.suggestedAction) {
        console.log(`   Suggested action: ${rec.suggestedAction}`)
      }
      if (rec.estimatedImpact) {
        if (rec.estimatedImpact.costReduction) {
          console.log(`   Cost reduction: ${rec.estimatedImpact.costReduction}`)
        }
        if (rec.estimatedImpact.performanceImprovement) {
          console.log(`   Performance improvement: ${rec.estimatedImpact.performanceImprovement}`)
        }
      }
      console.log()
    })
  }
}

/**
 * Example 3: Monitoring with Sampling
 */
async function samplingExample() {
  console.log('\n=== Monitoring with Sampling ===\n')

  // Monitor only 50% of operations to reduce overhead
  const monitor = new AmplifyMonitor({
    statsConfig: {
      enabled: true,
      sampleRate: 0.5, // Sample 50% of operations
    },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Perform many operations
  console.log('Performing 20 operations with 50% sampling...')
  for (let i = 0; i < 20; i++) {
    await monitoredTodos.get(`${i}`)
  }

  const stats = monitor.getStats()
  const recordedOps = Object.values(stats.operations).reduce((sum: number, op: any) => sum + op.count, 0)

  console.log(`\nOperations performed: 20`)
  console.log(`Operations recorded: ${recordedOps}`)
  console.log(`Sample rate: 50%`)
  console.log(`Expected recorded: ~10 (actual may vary due to randomness)`)
}

/**
 * Example 4: Tracking Performance Over Time
 */
async function performanceTracking() {
  console.log('\n=== Performance Tracking Over Time ===\n')

  const monitor = new AmplifyMonitor({
    statsConfig: { enabled: true },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Simulate operations over time
  console.log('Simulating operations over time...\n')

  for (let batch = 1; batch <= 3; batch++) {
    console.log(`Batch ${batch}:`)

    // Perform operations
    for (let i = 0; i < 5; i++) {
      await monitoredTodos.create({ title: `Task ${batch}-${i}` })
    }
    await monitoredTodos.list()

    // Check stats after each batch
    const stats = monitor.getStats()
    const totalOps = Object.values(stats.operations).reduce((sum: number, op: any) => sum + op.count, 0)
    const avgLatency = Object.values(stats.operations).reduce(
      (sum: number, op: any) => sum + op.avgLatencyMs * op.count,
      0
    ) / totalOps

    console.log(`  Total operations: ${totalOps}`)
    console.log(`  Average latency: ${avgLatency.toFixed(2)}ms`)
    console.log()

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('Performance tracking complete!')
}

/**
 * Example 5: Manual Operation Recording
 */
async function manualRecording() {
  console.log('\n=== Manual Operation Recording ===\n')

  const monitor = new AmplifyMonitor({
    statsConfig: { enabled: true },
  })

  // Sometimes you need to record custom operations
  console.log('Recording custom operations manually...')

  // Record a custom batch operation
  const batchStart = Date.now()
  // ... perform custom batch operation ...
  await new Promise(resolve => setTimeout(resolve, 75))
  const batchLatency = Date.now() - batchStart

  monitor.recordOperation({
    operation: 'batchWrite',
    timestamp: batchStart,
    latencyMs: batchLatency,
    itemCount: 10,
    wcu: 10,
    metadata: {
      operationType: 'custom-batch',
      modelName: 'Todo',
    },
  })
  console.log('✓ Custom batch operation recorded')

  // Record a custom query operation
  const queryStart = Date.now()
  // ... perform custom query ...
  await new Promise(resolve => setTimeout(resolve, 120))
  const queryLatency = Date.now() - queryStart

  monitor.recordOperation({
    operation: 'query',
    timestamp: queryStart,
    latencyMs: queryLatency,
    itemCount: 50,
    scannedCount: 50,
    rcu: 25,
    indexName: 'byStatus',
    metadata: {
      operationType: 'custom-query',
      modelName: 'Todo',
    },
  })
  console.log('✓ Custom query operation recorded')

  // View statistics including manual recordings
  const stats = monitor.getStats()
  console.log('\n--- Statistics (including manual recordings) ---')
  for (const [opType, opStats] of Object.entries(stats.operations)) {
    console.log(`${opType}: ${opStats.count} operations`)
  }
}

/**
 * Example 6: Analyzing Slow Operations
 */
async function analyzeSlowOperations() {
  console.log('\n=== Analyzing Slow Operations ===\n')

  const monitor = new AmplifyMonitor({
    statsConfig: {
      enabled: true,
      thresholds: {
        slowQueryMs: 100, // Operations over 100ms are considered slow
      },
    },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Perform mix of fast and slow operations
  console.log('Performing operations...')

  // Fast operations
  for (let i = 0; i < 10; i++) {
    await monitoredTodos.get(`${i}`)
  }

  // Potentially slow operations
  for (let i = 0; i < 5; i++) {
    await monitoredTodos.list()
  }

  // Analyze results
  const stats = monitor.getStats()
  console.log('\n--- Slow Operation Analysis ---')

  for (const [opType, opStats] of Object.entries(stats.operations)) {
    const op = opStats as any
    if (op.slowOperations > 0) {
      const slowPercentage = (op.slowOperations / op.count) * 100
      console.log(`\n${opType.toUpperCase()}:`)
      console.log(`  Total operations: ${op.count}`)
      console.log(`  Slow operations: ${op.slowOperations} (${slowPercentage.toFixed(1)}%)`)
      console.log(`  Average latency: ${op.avgLatencyMs.toFixed(2)}ms`)
    }
  }

  // Get recommendations for slow operations
  const recommendations = monitor.getRecommendations()
  const slowOpRecs = recommendations.filter((r: any) =>
    r.category === 'performance' || r.message.toLowerCase().includes('slow')
  )

  if (slowOpRecs.length > 0) {
    console.log('\n--- Recommendations for Slow Operations ---')
    slowOpRecs.forEach((rec: any) => {
      console.log(`• ${rec.message}`)
      if (rec.suggestedAction) {
        console.log(`  Action: ${rec.suggestedAction}`)
      }
    })
  }
}

/**
 * Example 7: Continuous Monitoring Pattern
 */
async function continuousMonitoring() {
  console.log('\n=== Continuous Monitoring Pattern ===\n')

  const monitor = new AmplifyMonitor({
    statsConfig: { enabled: true },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  console.log('Starting continuous monitoring...')
  console.log('(In production, you would run this periodically)\n')

  // Simulate continuous operation
  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`Monitoring cycle ${cycle}:`)

    // Perform operations
    await monitoredTodos.create({ title: `Task ${cycle}` })
    await monitoredTodos.list()
    await monitoredTodos.get(`${cycle}`)

    // Check for issues
    const recommendations = monitor.getRecommendations()
    if (recommendations.length > 0) {
      console.log(`  ⚠️  ${recommendations.length} recommendation(s) found`)
      recommendations.forEach((rec: any) => {
        console.log(`     - [${rec.severity}] ${rec.message}`)
      })
    } else {
      console.log('  ✓ No issues detected')
    }

    // In production, you might:
    // - Log statistics to CloudWatch
    // - Send alerts for critical recommendations
    // - Store metrics in a time-series database
    // - Generate reports

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\nContinuous monitoring complete!')
  console.log('\nFinal statistics:')
  const stats = monitor.getStats()
  const totalOps = Object.values(stats.operations).reduce((sum: number, op: any) => sum + op.count, 0)
  console.log(`Total operations monitored: ${totalOps}`)
}

/**
 * Example 8: Exporting Data for Analysis
 */
async function exportForAnalysis() {
  console.log('\n=== Exporting Data for Analysis ===\n')

  const monitor = new AmplifyMonitor({
    statsConfig: { enabled: true },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Perform operations
  console.log('Performing operations...')
  await monitoredTodos.create({ title: 'Task 1' })
  await monitoredTodos.list()
  await monitoredTodos.get('123')
  await monitoredTodos.update('123', { completed: true })

  // Export raw data
  console.log('\nExporting operation data...')
  const rawData = monitor.export()

  console.log(`✓ Exported ${rawData.length} operation records`)
  console.log('\nYou can now:')
  console.log('- Save to a file for offline analysis')
  console.log('- Send to a logging service (CloudWatch, Datadog, etc.)')
  console.log('- Analyze with custom tools')
  console.log('- Generate custom reports')

  // Example: Calculate custom metrics
  console.log('\n--- Custom Analysis ---')
  const totalLatency = rawData.reduce((sum: number, op: any) => sum + op.latencyMs, 0)
  const avgLatency = totalLatency / rawData.length
  const maxLatency = Math.max(...rawData.map((op: any) => op.latencyMs))
  const minLatency = Math.min(...rawData.map((op: any) => op.latencyMs))

  console.log(`Average latency: ${avgLatency.toFixed(2)}ms`)
  console.log(`Max latency: ${maxLatency.toFixed(2)}ms`)
  console.log(`Min latency: ${minLatency.toFixed(2)}ms`)
  console.log(`Latency range: ${(maxLatency - minLatency).toFixed(2)}ms`)
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    await basicStatistics()
    await getRecommendations()
    await samplingExample()
    await performanceTracking()
    await manualRecording()
    await analyzeSlowOperations()
    await continuousMonitoring()
    await exportForAnalysis()

    console.log('\n✓ All monitoring examples completed successfully!\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Uncomment to run
// main()

export {
  basicStatistics,
  getRecommendations,
  samplingExample,
  performanceTracking,
  manualRecording,
  analyzeSlowOperations,
  continuousMonitoring,
  exportForAnalysis,
}
