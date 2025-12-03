/**
 * StatsCollector - Collects and aggregates DynamoDB operation statistics
 */

import type {
  StatsConfig,
  OperationStats,
  OperationTypeStats,
  AccessPatternStats,
  TableStats,
  HotPartitionReport,
  ScanReport,
  IndexReport,
  CapacityRecommendation,
  Recommendation,
} from './types'

/**
 * StatsCollector class for collecting and aggregating operation statistics
 */
export class StatsCollector {
  private readonly config: Required<StatsConfig>
  private readonly operations: OperationStats[] = []

  constructor(config: StatsConfig) {
    // Set defaults for optional config values
    this.config = {
      enabled: config.enabled,
      sampleRate: config.sampleRate ?? 1.0,
      thresholds: {
        slowQueryMs: config.thresholds?.slowQueryMs ?? 1000,
        highRCU: config.thresholds?.highRCU ?? 100,
        highWCU: config.thresholds?.highWCU ?? 100,
      },
    }

    // Validate sample rate
    if (this.config.sampleRate < 0 || this.config.sampleRate > 1) {
      throw new Error('sampleRate must be between 0 and 1')
    }
  }

  /**
   * Record an operation's statistics
   * Uses sampling based on configured sampleRate
   * 
   * @param stats - Operation statistics to record
   */
  recordOperation(stats: OperationStats): void {
    // Skip if stats collection is disabled
    if (!this.config.enabled) {
      return
    }

    // Apply sampling - only record if random value is below sample rate
    if (Math.random() > this.config.sampleRate) {
      return
    }

    // Store the operation stats
    this.operations.push(stats)
  }

  /**
   * Get aggregated statistics
   * 
   * @returns Aggregated table statistics
   */
  getStats(): TableStats {
    const operationStats: { [operationType: string]: OperationTypeStats } = {}
    const patternStats: { [patternName: string]: AccessPatternStats } = {}

    // Aggregate by operation type
    for (const op of this.operations) {
      if (!operationStats[op.operation]) {
        operationStats[op.operation] = {
          count: 0,
          totalLatencyMs: 0,
          avgLatencyMs: 0,
          totalRCU: 0,
          totalWCU: 0,
        }
      }

      const stats = operationStats[op.operation]
      stats.count++
      stats.totalLatencyMs += op.latencyMs
      stats.totalRCU += op.consumedRCU ?? 0
      stats.totalWCU += op.consumedWCU ?? 0
    }

    // Calculate averages for operation types
    for (const stats of Object.values(operationStats)) {
      stats.avgLatencyMs = stats.totalLatencyMs / stats.count
    }

    // Aggregate by access pattern
    for (const op of this.operations) {
      if (op.accessPattern) {
        if (!patternStats[op.accessPattern]) {
          patternStats[op.accessPattern] = {
            count: 0,
            avgLatencyMs: 0,
            avgItemsReturned: 0,
          }
        }

        const stats = patternStats[op.accessPattern]
        const prevCount = stats.count

        stats.count++
        // Calculate running average for latency
        stats.avgLatencyMs =
          (stats.avgLatencyMs * prevCount + op.latencyMs) / stats.count
        // Calculate running average for items returned
        stats.avgItemsReturned =
          (stats.avgItemsReturned * prevCount + op.itemCount) / stats.count
      }
    }

    return {
      operations: operationStats,
      accessPatterns: patternStats,
    }
  }

  /**
   * Export raw operation statistics
   * 
   * @returns Array of all recorded operation statistics
   */
  export(): OperationStats[] {
    return [...this.operations]
  }

  /**
   * Reset all collected statistics
   */
  reset(): void {
    this.operations.length = 0
  }

  /**
   * Check if stats collection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Get the configured thresholds
   */
  getThresholds(): Required<StatsConfig>['thresholds'] {
    return this.config.thresholds
  }

  /**
   * Detect hot partitions (partitions receiving >10% of traffic)
   * 
   * @returns Array of hot partition reports
   */
  detectHotPartitions(): HotPartitionReport[] {
    const partitionCounts = new Map<string, number>()
    let totalOperations = 0

    // Count operations per partition key
    for (const op of this.operations) {
      // We need to extract partition key from the operation
      // For now, we'll track by a combination of table and any key info we have
      // In a real implementation, we'd need to track the actual partition key values

      // Skip operations that don't have partition key info
      if (!op.indexName && op.operation !== 'scan') {
        // For operations on the primary index, we'd need the actual PK value
        // This would need to be added to OperationStats in a real implementation
        // For now, we'll use a placeholder approach
        const key = `${op.tableName}:primary`
        partitionCounts.set(key, (partitionCounts.get(key) || 0) + 1)
        totalOperations++
      } else if (op.indexName) {
        const key = `${op.tableName}:${op.indexName}`
        partitionCounts.set(key, (partitionCounts.get(key) || 0) + 1)
        totalOperations++
      }
    }

    // Identify hot partitions (>10% of traffic)
    const hotPartitions: HotPartitionReport[] = []
    const threshold = 0.1 // 10%

    for (const [partitionKey, count] of partitionCounts.entries()) {
      const percentage = totalOperations > 0 ? count / totalOperations : 0

      if (percentage > threshold) {
        hotPartitions.push({
          partitionKey,
          accessCount: count,
          percentageOfTotal: percentage,
          recommendation: `Partition key '${partitionKey}' receives ${(percentage * 100).toFixed(1)}% of all requests. Consider write sharding or better key distribution to prevent throttling.`,
        })
      }
    }

    // Sort by percentage descending
    hotPartitions.sort((a, b) => b.percentageOfTotal - a.percentageOfTotal)

    return hotPartitions
  }

  /**
   * Detect inefficient scan operations (efficiency <20%)
   * 
   * @returns Array of scan inefficiency reports
   */
  detectIneffientScans(): ScanReport[] {
    const scanReports: ScanReport[] = []
    const efficiencyThreshold = 0.2 // 20%

    for (const op of this.operations) {
      // Only analyze scan operations with scannedCount data
      if (op.operation === 'scan' && op.scannedCount !== undefined && op.scannedCount > 0) {
        const efficiency = op.itemCount / op.scannedCount

        if (efficiency < efficiencyThreshold) {
          const operationId = `${op.operation} on ${op.tableName}${op.indexName ? `:${op.indexName}` : ''}`

          scanReports.push({
            operation: operationId,
            scannedCount: op.scannedCount,
            returnedCount: op.itemCount,
            efficiency,
            recommendation: `Scan operation has ${(efficiency * 100).toFixed(1)}% efficiency (${op.itemCount} returned / ${op.scannedCount} scanned). Consider using a query with an appropriate index or adding a filter expression.`,
          })
        }
      }
    }

    // Sort by efficiency ascending (worst first)
    scanReports.sort((a, b) => a.efficiency - b.efficiency)

    return scanReports
  }

  /**
   * Detect unused indexes (not used in 7 days)
   * 
   * @returns Array of unused index reports
   */
  detectUnusedIndexes(): IndexReport[] {
    const indexUsage = new Map<string, { count: number; lastUsed: number }>()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

    // Track index usage
    for (const op of this.operations) {
      if (op.indexName) {
        const key = `${op.tableName}:${op.indexName}`
        const existing = indexUsage.get(key)

        if (existing) {
          existing.count++
          existing.lastUsed = Math.max(existing.lastUsed, op.timestamp)
        } else {
          indexUsage.set(key, {
            count: 1,
            lastUsed: op.timestamp,
          })
        }
      }
    }

    // Identify unused indexes
    const indexReports: IndexReport[] = []

    for (const [indexKey, usage] of indexUsage.entries()) {
      // Check if index hasn't been used in 7 days
      if (usage.lastUsed < sevenDaysAgo) {
        indexReports.push({
          indexName: indexKey,
          usageCount: usage.count,
          lastUsed: usage.lastUsed,
          recommendation: `Index '${indexKey}' has not been used in the last 7 days (last used: ${new Date(usage.lastUsed).toISOString()}). Consider removing this index to reduce storage costs.`,
        })
      }
    }

    // Sort by last used ascending (oldest first)
    indexReports.sort((a, b) => (a.lastUsed ?? 0) - (b.lastUsed ?? 0))

    return indexReports
  }

  /**
   * Suggest capacity mode based on usage patterns
   * 
   * @returns Capacity mode recommendation
   */
  suggestCapacityMode(): CapacityRecommendation {
    // Calculate total RCU and WCU consumed
    let totalRCU = 0
    let totalWCU = 0
    let operationCount = 0

    // Track operations per hour to detect spiky traffic
    const operationsByHour = new Map<number, number>()

    for (const op of this.operations) {
      totalRCU += op.consumedRCU ?? 0
      totalWCU += op.consumedWCU ?? 0
      operationCount++

      // Group by hour
      const hour = Math.floor(op.timestamp / (60 * 60 * 1000))
      operationsByHour.set(hour, (operationsByHour.get(hour) || 0) + 1)
    }

    // If no operations, return unknown
    if (operationCount === 0) {
      return {
        currentMode: 'unknown',
        recommendedMode: 'on-demand',
        reasoning: 'No operations recorded. On-demand mode is recommended for unpredictable workloads.',
        estimatedMonthlyCost: {
          current: 0,
          recommended: 0,
          savings: 0,
        },
      }
    }

    // Calculate traffic variability
    const hourCounts = Array.from(operationsByHour.values())
    const avgOpsPerHour = hourCounts.reduce((sum, count) => sum + count, 0) / hourCounts.length
    const maxOpsPerHour = Math.max(...hourCounts)
    const minOpsPerHour = Math.min(...hourCounts)

    // Calculate coefficient of variation (CV) to measure spikiness
    const variance = hourCounts.reduce((sum, count) => sum + Math.pow(count - avgOpsPerHour, 2), 0) / hourCounts.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = avgOpsPerHour > 0 ? stdDev / avgOpsPerHour : 0

    // Calculate average capacity per second
    const totalSeconds = this.operations.length > 0
      ? (Math.max(...this.operations.map(op => op.timestamp)) - Math.min(...this.operations.map(op => op.timestamp))) / 1000
      : 1
    const avgRCUPerSecond = totalRCU / totalSeconds
    const avgWCUPerSecond = totalWCU / totalSeconds

    // Estimate costs (simplified pricing)
    // Provisioned: $0.00013 per RCU-hour, $0.00065 per WCU-hour
    // On-demand: $0.25 per million read requests, $1.25 per million write requests
    const hoursPerMonth = 730

    // For provisioned, we need to provision for peak capacity
    const peakRCU = avgRCUPerSecond * (maxOpsPerHour / avgOpsPerHour)
    const peakWCU = avgWCUPerSecond * (maxOpsPerHour / avgOpsPerHour)
    const provisionedCost = (peakRCU * 0.00013 + peakWCU * 0.00065) * hoursPerMonth

    // For on-demand, cost is based on actual usage
    const onDemandCost = (totalRCU * 0.25 / 1000000) + (totalWCU * 1.25 / 1000000)

    // Determine recommendation based on traffic patterns
    let recommendedMode: 'provisioned' | 'on-demand'
    let reasoning: string

    // High variability (CV > 0.5) suggests on-demand
    if (coefficientOfVariation > 0.5) {
      recommendedMode = 'on-demand'
      reasoning = `Traffic is highly variable (CV: ${coefficientOfVariation.toFixed(2)}). On-demand mode handles spiky workloads more cost-effectively.`
    }
    // Low utilization (idle >80% of time) suggests on-demand
    else if (minOpsPerHour < avgOpsPerHour * 0.2) {
      recommendedMode = 'on-demand'
      reasoning = `Traffic has significant idle periods. On-demand mode avoids paying for unused provisioned capacity.`
    }
    // Steady, predictable traffic suggests provisioned
    else if (coefficientOfVariation < 0.3 && avgOpsPerHour > 10) {
      recommendedMode = 'provisioned'
      reasoning = `Traffic is steady and predictable (CV: ${coefficientOfVariation.toFixed(2)}). Provisioned mode offers better cost efficiency.`
    }
    // Default to on-demand for safety
    else {
      recommendedMode = 'on-demand'
      reasoning = `Traffic patterns are moderate. On-demand mode provides flexibility without capacity planning.`
    }

    return {
      currentMode: 'unknown',
      recommendedMode,
      reasoning,
      estimatedMonthlyCost: {
        current: 0,
        recommended: recommendedMode === 'provisioned' ? provisionedCost : onDemandCost,
        savings: 0,
      },
    }
  }

  /**
   * Detect batch opportunities (multiple individual operations within time windows)
   * 
   * @returns Array of recommendations for using batch operations
   */
  detectBatchOpportunities(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const timeWindowMs = 1000 // 1 second window
    const minOperationsForBatch = 5 // Minimum operations to recommend batching

    // Group operations by type and time window
    const getOperations: OperationStats[] = []
    const putOperations: OperationStats[] = []
    const deleteOperations: OperationStats[] = []

    for (const op of this.operations) {
      if (op.operation === 'get') {
        getOperations.push(op)
      } else if (op.operation === 'put') {
        putOperations.push(op)
      } else if (op.operation === 'delete') {
        deleteOperations.push(op)
      }
    }

    // Analyze get operations for batchGet opportunities
    if (getOperations.length >= minOperationsForBatch) {
      // Sort by timestamp
      getOperations.sort((a, b) => a.timestamp - b.timestamp)

      // Find clusters of operations within time windows
      for (let windowStart = 0; windowStart < getOperations.length; windowStart++) {
        let windowEnd = windowStart

        // Extend window while operations are within timeWindowMs
        while (
          windowEnd < getOperations.length - 1 &&
          getOperations[windowEnd + 1].timestamp - getOperations[windowStart].timestamp <= timeWindowMs
        ) {
          windowEnd++
        }

        // Check if we have enough operations in this window
        const opsInWindow = windowEnd - windowStart + 1
        if (opsInWindow >= minOperationsForBatch) {
          recommendations.push({
            severity: 'info',
            category: 'performance',
            message: `Batch get opportunity detected`,
            details: `Detected ${opsInWindow} individual get operations within a ${timeWindowMs}ms window. These could be combined into a single batchGet operation.`,
            suggestedAction: 'Use batchGet() to retrieve multiple items in a single request. This reduces network overhead and can improve throughput.',
            affectedOperations: ['get'],
            estimatedImpact: {
              performanceImprovement: `Reduce ${opsInWindow} requests to ${Math.ceil(opsInWindow / 100)} batch requests`,
              costReduction: 'Lower network overhead and improved latency',
            },
          })
          break // Only report once
        }
      }
    }

    // Analyze put/delete operations for batchWrite opportunities
    const writeOperations = [...putOperations, ...deleteOperations]
    if (writeOperations.length >= minOperationsForBatch) {
      // Sort by timestamp
      writeOperations.sort((a, b) => a.timestamp - b.timestamp)

      // Find clusters of operations within time windows
      for (let windowStart = 0; windowStart < writeOperations.length; windowStart++) {
        let windowEnd = windowStart

        // Extend window while operations are within timeWindowMs
        while (
          windowEnd < writeOperations.length - 1 &&
          writeOperations[windowEnd + 1].timestamp - writeOperations[windowStart].timestamp <= timeWindowMs
        ) {
          windowEnd++
        }

        // Check if we have enough operations in this window
        const opsInWindow = windowEnd - windowStart + 1
        if (opsInWindow >= minOperationsForBatch) {
          const putCount = writeOperations.slice(windowStart, windowEnd + 1).filter(op => op.operation === 'put').length
          const deleteCount = writeOperations.slice(windowStart, windowEnd + 1).filter(op => op.operation === 'delete').length

          recommendations.push({
            severity: 'info',
            category: 'performance',
            message: `Batch write opportunity detected`,
            details: `Detected ${opsInWindow} individual write operations (${putCount} puts, ${deleteCount} deletes) within a ${timeWindowMs}ms window. These could be combined into a single batchWrite operation.`,
            suggestedAction: 'Use batchWrite() to write multiple items in a single request. This reduces network overhead and can improve throughput.',
            affectedOperations: ['put', 'delete'],
            estimatedImpact: {
              performanceImprovement: `Reduce ${opsInWindow} requests to ${Math.ceil(opsInWindow / 25)} batch requests`,
              costReduction: 'Lower network overhead and improved latency',
            },
          })
          break // Only report once
        }
      }
    }

    return recommendations
  }

  /**
   * Detect concatenated key patterns that could benefit from multi-attribute keys
   * 
   * @returns Array of recommendations for migrating to multi-attribute keys
   */
  detectConcatenatedKeyPatterns(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const concatenationPatterns = new Map<string, number>()

    // Analyze operations for concatenated key patterns
    for (const op of this.operations) {
      // We would need actual key values to detect patterns
      // For now, we'll use a heuristic based on index names and operation patterns
      // In a real implementation, we'd track actual key values in OperationStats

      if (op.indexName) {
        const key = `${op.tableName}:${op.indexName}`
        concatenationPatterns.set(key, (concatenationPatterns.get(key) || 0) + 1)
      }
    }

    // Generate recommendations for indexes with high usage
    // (These are candidates for multi-attribute key migration)
    for (const [indexKey, count] of concatenationPatterns.entries()) {
      if (count > 10) { // Threshold for recommendation
        recommendations.push({
          severity: 'info',
          category: 'best-practice',
          message: `Consider multi-attribute keys for ${indexKey}`,
          details: `This index has ${count} operations. If you're using concatenated strings for keys (e.g., "TENANT#123#CUSTOMER#456"), consider migrating to multi-attribute composite keys.`,
          suggestedAction: 'Use multi-attribute keys to preserve native data types, improve type safety, and enable more flexible querying patterns.',
          estimatedImpact: {
            performanceImprovement: 'Better type safety and query flexibility',
          },
        })
      }
    }

    return recommendations
  }

  /**
   * Detect operations that could benefit from projection expressions
   * 
   * @returns Array of recommendations for using projections
   */
  detectProjectionOpportunities(): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Group operations by operation type
    const operationsByType = new Map<string, OperationStats[]>()
    for (const op of this.operations) {
      if (!operationsByType.has(op.operation)) {
        operationsByType.set(op.operation, [])
      }
      operationsByType.get(op.operation)!.push(op)
    }

    // Check read operations (get, query, scan, batchGet)
    const readOperations = ['get', 'query', 'scan', 'batchGet']
    for (const opType of readOperations) {
      const ops = operationsByType.get(opType) || []
      if (ops.length === 0) continue

      // Count operations without projection
      const opsWithoutProjection = ops.filter((op) => !op.usedProjection)
      const projectionUsageRate = 1 - opsWithoutProjection.length / ops.length

      // If less than 50% of operations use projection, recommend it
      if (projectionUsageRate < 0.5 && opsWithoutProjection.length > 10) {
        recommendations.push({
          severity: 'info',
          category: 'performance',
          message: `Consider using projection expressions for ${opType} operations`,
          details: `Only ${(projectionUsageRate * 100).toFixed(1)}% of ${opType} operations use projection expressions. ${opsWithoutProjection.length} operations fetch full items when they might only need specific attributes.`,
          suggestedAction: `Add projectionExpression to ${opType} operations to fetch only needed attributes. This reduces data transfer and can lower RCU consumption.`,
          affectedOperations: [opType],
          estimatedImpact: {
            performanceImprovement: 'Reduced data transfer and RCU consumption',
            costReduction: 'Lower read capacity costs',
          },
        })
      }
    }

    return recommendations
  }

  /**
   * Detect fetching to filter anti-pattern
   * Identifies queries that fetch many items but return few (client-side filtering)
   * 
   * @returns Array of recommendations for using FilterExpression
   */
  detectFetchingToFilter(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const efficiencyThreshold = 0.5 // 50% efficiency threshold

    // Group query operations by access pattern or table+index
    const queryGroups = new Map<string, OperationStats[]>()

    for (const op of this.operations) {
      if (op.operation === 'query' && op.scannedCount !== undefined && op.scannedCount > 0) {
        const key = op.accessPattern || `${op.tableName}${op.indexName ? `:${op.indexName}` : ''}`
        if (!queryGroups.has(key)) {
          queryGroups.set(key, [])
        }
        queryGroups.get(key)!.push(op)
      }
    }

    // Analyze each group for low efficiency
    for (const [groupKey, operations] of queryGroups.entries()) {
      // Calculate average efficiency
      let totalEfficiency = 0
      let lowEfficiencyCount = 0

      for (const op of operations) {
        const efficiency = op.scannedCount! > 0 ? op.itemCount / op.scannedCount! : 1
        totalEfficiency += efficiency

        if (efficiency < efficiencyThreshold) {
          lowEfficiencyCount++
        }
      }

      const avgEfficiency = totalEfficiency / operations.length

      // If average efficiency is low and we have multiple occurrences, recommend FilterExpression
      if (avgEfficiency < efficiencyThreshold && operations.length >= 3) {
        const severity = avgEfficiency < 0.2 ? 'warning' : 'info'

        recommendations.push({
          severity,
          category: 'performance',
          message: `Potential client-side filtering detected in ${groupKey}`,
          details: `Query operations have ${(avgEfficiency * 100).toFixed(1)}% efficiency (${operations.length} operations, ${lowEfficiencyCount} with low efficiency). This suggests client-side filtering after fetching data.`,
          suggestedAction: 'Add a FilterExpression to your query to filter items on the server side. This reduces data transfer and consumed capacity.',
          affectedOperations: ['query'],
          estimatedImpact: {
            performanceImprovement: 'Reduced data transfer and faster response times',
            costReduction: `Up to ${((1 - avgEfficiency) * 100).toFixed(0)}% reduction in RCU consumption`,
          },
        })
      }
    }

    return recommendations
  }

  /**
   * Detect sequential writes anti-pattern
   * Identifies multiple put/delete operations in short time windows that could be batched
   * 
   * @returns Array of recommendations for using batchWrite
   */
  detectSequentialWrites(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const timeWindowMs = 1000 // 1 second window
    const minOperationsForBatch = 3 // Minimum operations to recommend batching

    // Collect write operations (put and delete)
    const writeOperations: OperationStats[] = []

    for (const op of this.operations) {
      if (op.operation === 'put' || op.operation === 'delete') {
        writeOperations.push(op)
      }
    }

    if (writeOperations.length < minOperationsForBatch) {
      return recommendations
    }

    // Sort by timestamp
    writeOperations.sort((a, b) => a.timestamp - b.timestamp)

    // Find clusters of sequential writes
    const clusters: OperationStats[][] = []
    let currentCluster: OperationStats[] = []

    for (const op of writeOperations) {
      if (currentCluster.length === 0) {
        currentCluster.push(op)
      } else {
        const timeSinceFirst = op.timestamp - currentCluster[0].timestamp

        if (timeSinceFirst <= timeWindowMs) {
          currentCluster.push(op)
        } else {
          // Check if current cluster is large enough
          if (currentCluster.length >= minOperationsForBatch) {
            clusters.push([...currentCluster])
          }
          // Start new cluster
          currentCluster = [op]
        }
      }
    }

    // Check final cluster
    if (currentCluster.length >= minOperationsForBatch) {
      clusters.push(currentCluster)
    }

    // Generate recommendations for each cluster
    for (const cluster of clusters) {
      const putCount = cluster.filter(op => op.operation === 'put').length
      const deleteCount = cluster.filter(op => op.operation === 'delete').length

      recommendations.push({
        severity: 'info',
        category: 'performance',
        message: `Sequential write operations detected`,
        details: `Detected ${cluster.length} sequential write operations (${putCount} puts, ${deleteCount} deletes) within a ${timeWindowMs}ms window. These could be combined into batch operations.`,
        suggestedAction: 'Use batchWrite() to combine multiple put and delete operations into a single request. This reduces network overhead and improves throughput.',
        affectedOperations: ['put', 'delete'],
        estimatedImpact: {
          performanceImprovement: `Reduce ${cluster.length} requests to ${Math.ceil(cluster.length / 25)} batch requests`,
          costReduction: 'Lower network overhead and improved latency',
        },
      })
    }

    return recommendations
  }

  /**
   * Detect read-before-write anti-pattern
   * Identifies get operations followed by put on the same key
   * 
   * @returns Array of recommendations for using update
   */
  detectReadBeforeWrite(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const timeWindowMs = 5000 // 5 second window
    const minOccurrences = 3 // Minimum occurrences to recommend

    // Track get operations by key
    const getOperations = new Map<string, OperationStats[]>()

    for (const op of this.operations) {
      if (op.operation === 'get' && op.partitionKey) {
        const key = `${op.partitionKey}${op.sortKey ? `#${op.sortKey}` : ''}`
        if (!getOperations.has(key)) {
          getOperations.set(key, [])
        }
        getOperations.get(key)!.push(op)
      }
    }

    // Track put operations by key
    const putOperations = new Map<string, OperationStats[]>()

    for (const op of this.operations) {
      if (op.operation === 'put' && op.partitionKey) {
        const key = `${op.partitionKey}${op.sortKey ? `#${op.sortKey}` : ''}`
        if (!putOperations.has(key)) {
          putOperations.set(key, [])
        }
        putOperations.get(key)!.push(op)
      }
    }

    // Find keys with both get and put operations
    const readBeforeWritePatterns = new Map<string, number>()

    for (const [key, gets] of getOperations.entries()) {
      const puts = putOperations.get(key)
      if (!puts) continue

      // Check for get followed by put within time window
      for (const getOp of gets) {
        for (const putOp of puts) {
          const timeDiff = putOp.timestamp - getOp.timestamp
          if (timeDiff > 0 && timeDiff <= timeWindowMs) {
            readBeforeWritePatterns.set(key, (readBeforeWritePatterns.get(key) || 0) + 1)
            break // Only count once per get
          }
        }
      }
    }

    // Generate recommendations for patterns with multiple occurrences
    for (const [key, count] of readBeforeWritePatterns.entries()) {
      if (count >= minOccurrences) {
        recommendations.push({
          severity: 'info',
          category: 'performance',
          message: `Read-before-write pattern detected`,
          details: `Detected ${count} instances of get followed by put on key '${key}'. This pattern suggests reading an item to modify it, then writing it back.`,
          suggestedAction: 'Use update() instead of get() + put(). The update operation modifies items in place without requiring a read first, reducing latency and consumed capacity.',
          affectedOperations: ['get', 'put'],
          estimatedImpact: {
            performanceImprovement: 'Reduced latency by eliminating read operation',
            costReduction: '50% reduction in operations (eliminate get)',
          },
        })
      }
    }

    return recommendations
  }

  /**
   * Detect large item anti-pattern
   * Identifies items exceeding 100KB that should potentially use S3
   * 
   * @returns Array of recommendations for using S3
   */
  detectLargeItems(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const warningThreshold = 100 * 1024 // 100KB
    const errorThreshold = 300 * 1024 // 300KB (close to 400KB DynamoDB limit)

    // Track large items
    const largeItemOperations: OperationStats[] = []

    for (const op of this.operations) {
      if (
        (op.operation === 'put' || op.operation === 'update') &&
        op.itemSizeBytes !== undefined &&
        op.itemSizeBytes >= warningThreshold
      ) {
        largeItemOperations.push(op)
      }
    }

    if (largeItemOperations.length === 0) {
      return recommendations
    }

    // Group by severity
    const warningItems = largeItemOperations.filter(
      op => op.itemSizeBytes! < errorThreshold
    )
    const errorItems = largeItemOperations.filter(
      op => op.itemSizeBytes! >= errorThreshold
    )

    // Generate warning for items 100KB-300KB
    if (warningItems.length > 0) {
      const avgSize = warningItems.reduce((sum, op) => sum + op.itemSizeBytes!, 0) / warningItems.length
      const maxSize = Math.max(...warningItems.map(op => op.itemSizeBytes!))

      recommendations.push({
        severity: 'info',
        category: 'best-practice',
        message: `Large items detected (100KB-300KB)`,
        details: `Detected ${warningItems.length} write operations with items between 100KB and 300KB (avg: ${(avgSize / 1024).toFixed(1)}KB, max: ${(maxSize / 1024).toFixed(1)}KB). Large items increase costs and can impact performance.`,
        suggestedAction: 'Consider storing large attributes (documents, images, etc.) in S3 and keeping only references in DynamoDB. This reduces item size, lowers costs, and improves performance.',
        affectedOperations: ['put', 'update'],
        estimatedImpact: {
          costReduction: 'Significant reduction in storage and throughput costs',
          performanceImprovement: 'Faster read/write operations with smaller items',
        },
      })
    }

    // Generate error for items >300KB
    if (errorItems.length > 0) {
      const avgSize = errorItems.reduce((sum, op) => sum + op.itemSizeBytes!, 0) / errorItems.length
      const maxSize = Math.max(...errorItems.map(op => op.itemSizeBytes!))

      recommendations.push({
        severity: 'warning',
        category: 'best-practice',
        message: `Very large items detected (>300KB)`,
        details: `Detected ${errorItems.length} write operations with items exceeding 300KB (avg: ${(avgSize / 1024).toFixed(1)}KB, max: ${(maxSize / 1024).toFixed(1)}KB). DynamoDB has a 400KB item size limit.`,
        suggestedAction: 'URGENT: Move large attributes to S3. Items approaching the 400KB limit will cause write failures. Store only metadata and S3 references in DynamoDB.',
        affectedOperations: ['put', 'update'],
        estimatedImpact: {
          costReduction: 'Significant reduction in storage and throughput costs',
          performanceImprovement: 'Avoid write failures and improve operation speed',
        },
      })
    }

    return recommendations
  }

  /**
   * Detect uniform partition key anti-pattern
   * Identifies sequential or predictable partition key patterns
   * 
   * @returns Array of recommendations for better key distribution
   */
  detectUniformPartitionKeys(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const minSampleSize = 20 // Need enough samples to detect patterns

    // Collect partition keys from write operations
    const partitionKeys: string[] = []

    for (const op of this.operations) {
      if ((op.operation === 'put' || op.operation === 'update') && op.partitionKey) {
        partitionKeys.push(op.partitionKey)
      }
    }

    if (partitionKeys.length < minSampleSize) {
      return recommendations
    }

    // Check for sequential numeric patterns
    const numericKeys = partitionKeys
      .map(key => {
        // Try to extract numeric portion
        const match = key.match(/(\d+)/)
        return match ? parseInt(match[1], 10) : null
      })
      .filter((n): n is number => n !== null)

    if (numericKeys.length >= minSampleSize) {
      // Check if keys are sequential
      const sortedKeys = [...numericKeys].sort((a, b) => a - b)
      let sequentialCount = 0

      for (let i = 1; i < sortedKeys.length; i++) {
        if (sortedKeys[i] === sortedKeys[i - 1] + 1) {
          sequentialCount++
        }
      }

      const sequentialRatio = sequentialCount / (sortedKeys.length - 1)

      // If >50% of keys are sequential, warn about poor distribution
      if (sequentialRatio > 0.5) {
        recommendations.push({
          severity: 'warning',
          category: 'best-practice',
          message: `Sequential partition key pattern detected`,
          details: `Detected ${(sequentialRatio * 100).toFixed(0)}% of partition keys follow a sequential numeric pattern. Sequential keys can lead to hot partitions and uneven data distribution.`,
          suggestedAction: 'Use a hash-based or random component in partition keys to ensure even distribution across partitions. Consider using UUIDs, hashing user IDs, or adding random prefixes.',
          affectedOperations: ['put', 'update'],
          estimatedImpact: {
            performanceImprovement: 'Better partition distribution reduces throttling',
            costReduction: 'More efficient capacity utilization',
          },
        })
      }
    }

    // Check for timestamp-based keys (common anti-pattern)
    const timestampPattern = /^\d{4}-\d{2}-\d{2}|^\d{10,13}$/
    const timestampKeys = partitionKeys.filter(key => timestampPattern.test(key))

    if (timestampKeys.length >= minSampleSize && timestampKeys.length / partitionKeys.length > 0.5) {
      recommendations.push({
        severity: 'warning',
        category: 'best-practice',
        message: `Timestamp-based partition keys detected`,
        details: `Detected ${timestampKeys.length} partition keys that appear to be timestamps. Using timestamps as partition keys creates hot partitions as all writes go to the current time period.`,
        suggestedAction: 'Avoid using timestamps as partition keys. Instead, use timestamps in sort keys and add a distributed partition key (e.g., user ID, category, or hash). For time-series data, consider using a composite key with a category or shard prefix.',
        affectedOperations: ['put', 'update'],
        estimatedImpact: {
          performanceImprovement: 'Eliminate hot partition bottlenecks',
          costReduction: 'Better capacity utilization and reduced throttling',
        },
      })
    }

    return recommendations
  }

  /**
   * Generate all recommendations based on collected statistics
   * 
   * @returns Array of recommendations prioritized by severity
   */
  getRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Check for hot partitions
    const hotPartitions = this.detectHotPartitions()
    for (const hotPartition of hotPartitions) {
      const severity = hotPartition.percentageOfTotal > 0.5 ? 'error' :
        hotPartition.percentageOfTotal > 0.3 ? 'warning' : 'info'

      // Check if this is a GSI partition (candidate for multi-attribute keys)
      const isGSI = hotPartition.partitionKey.includes(':') &&
        !hotPartition.partitionKey.endsWith(':primary')

      let suggestedAction = 'Consider implementing write sharding or redesigning your partition key for better distribution.'

      if (isGSI) {
        suggestedAction += ' For GSI partition keys, consider using multi-attribute composite keys to add more attributes for better distribution (e.g., add tenantId, region, or category as additional partition key attributes).'
      }

      recommendations.push({
        severity,
        category: 'hot-partition',
        message: `Hot partition detected: ${hotPartition.partitionKey}`,
        details: `This partition receives ${(hotPartition.percentageOfTotal * 100).toFixed(1)}% of all traffic (${hotPartition.accessCount} operations).`,
        suggestedAction,
        estimatedImpact: {
          performanceImprovement: 'Reduced throttling and improved latency',
        },
      })
    }

    // Check for inefficient scans
    const inefficientScans = this.detectIneffientScans()
    for (const scan of inefficientScans) {
      const severity = scan.efficiency < 0.05 ? 'error' :
        scan.efficiency < 0.1 ? 'warning' : 'info'

      recommendations.push({
        severity,
        category: 'performance',
        message: `Inefficient scan operation detected`,
        details: `${scan.operation} has ${(scan.efficiency * 100).toFixed(1)}% efficiency (${scan.returnedCount} items returned out of ${scan.scannedCount} scanned).`,
        suggestedAction: 'Replace scan with a query using an appropriate index, or add a more selective filter expression.',
        affectedOperations: [scan.operation],
        estimatedImpact: {
          costReduction: 'Up to 95% reduction in consumed capacity',
          performanceImprovement: 'Significantly faster query times',
        },
      })
    }

    // Check for unused indexes
    const unusedIndexes = this.detectUnusedIndexes()
    for (const index of unusedIndexes) {
      recommendations.push({
        severity: 'info',
        category: 'cost',
        message: `Unused index detected: ${index.indexName}`,
        details: `This index has not been used in the last 7 days. Last used: ${index.lastUsed ? new Date(index.lastUsed).toISOString() : 'never'}.`,
        suggestedAction: 'Consider removing this index to reduce storage costs and write capacity consumption.',
        estimatedImpact: {
          costReduction: 'Reduced storage and write capacity costs',
        },
      })
    }

    // Check capacity mode
    const capacityRecommendation = this.suggestCapacityMode()
    if (this.operations.length > 0) {
      recommendations.push({
        severity: 'info',
        category: 'capacity',
        message: `Consider ${capacityRecommendation.recommendedMode} capacity mode`,
        details: capacityRecommendation.reasoning,
        suggestedAction: `Switch to ${capacityRecommendation.recommendedMode} mode for better cost efficiency.`,
        estimatedImpact: {
          costReduction: capacityRecommendation.estimatedMonthlyCost.savings > 0
            ? `Estimated savings: $${capacityRecommendation.estimatedMonthlyCost.savings.toFixed(2)}/month`
            : undefined,
        },
      })
    }

    // Check for batch opportunities
    const batchOpportunities = this.detectBatchOpportunities()
    recommendations.push(...batchOpportunities)

    // Check for multi-attribute key opportunities
    const multiAttributeKeyRecs = this.detectConcatenatedKeyPatterns()
    recommendations.push(...multiAttributeKeyRecs)

    // Check for projection opportunities
    const projectionOpportunities = this.detectProjectionOpportunities()
    recommendations.push(...projectionOpportunities)

    // Check for anti-patterns
    const fetchingToFilterRecs = this.detectFetchingToFilter()
    recommendations.push(...fetchingToFilterRecs)

    const sequentialWriteRecs = this.detectSequentialWrites()
    recommendations.push(...sequentialWriteRecs)

    const readBeforeWriteRecs = this.detectReadBeforeWrite()
    recommendations.push(...readBeforeWriteRecs)

    const largeItemRecs = this.detectLargeItems()
    recommendations.push(...largeItemRecs)

    const uniformPartitionKeyRecs = this.detectUniformPartitionKeys()
    recommendations.push(...uniformPartitionKeyRecs)

    // Sort by severity (error > warning > info)
    const severityOrder = { error: 0, warning: 1, info: 2 }
    recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return recommendations
  }
}
