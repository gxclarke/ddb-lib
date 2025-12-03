/**
 * RecommendationEngine - Generates optimization recommendations based on collected statistics
 */

import type { StatsCollector } from './stats-collector'
import type {
  Recommendation,
  CapacityRecommendation,
  OperationStats,
} from './types'

/**
 * RecommendationEngine class for generating optimization recommendations
 */
export class RecommendationEngine {
  constructor(private readonly statsCollector: StatsCollector) { }

  /**
   * Generate all recommendations based on collected statistics
   */
  generateRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Detect various anti-patterns and opportunities
    recommendations.push(...this.detectBatchOpportunities())
    recommendations.push(...this.detectProjectionOpportunities())
    recommendations.push(...this.detectFetchingToFilter())
    recommendations.push(...this.detectSequentialWrites())
    recommendations.push(...this.detectReadBeforeWrite())
    recommendations.push(...this.detectSlowOperations())
    recommendations.push(...this.detectHighCapacityUsage())

    return recommendations
  }

  /**
   * Detect batch opportunities (multiple individual operations within time windows)
   */
  detectBatchOpportunities(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const timeWindowMs = 1000 // 1 second window
    const minOperationsForBatch = 5

    const getOperations = this.statsCollector.getOperationsByType('get')
    const putOperations = this.statsCollector.getOperationsByType('put')
    const deleteOperations = this.statsCollector.getOperationsByType('delete')

    // Analyze get operations for batchGet opportunities
    if (getOperations.length >= minOperationsForBatch) {
      const sorted = [...getOperations].sort((a, b) => a.timestamp - b.timestamp)
      const cluster = this.findOperationCluster(sorted, timeWindowMs, minOperationsForBatch)

      if (cluster) {
        recommendations.push({
          severity: 'info',
          category: 'performance',
          message: 'Batch get opportunity detected',
          details: `Detected ${cluster} individual get operations within a ${timeWindowMs}ms window. These could be combined into a single batchGet operation.`,
          suggestedAction: 'Use batchGet() to retrieve multiple items in a single request. This reduces network overhead and can improve throughput.',
          affectedOperations: ['get'],
          estimatedImpact: {
            performanceImprovement: `Reduce ${cluster} requests to ${Math.ceil(cluster / 100)} batch requests`,
            costReduction: 'Lower network overhead and improved latency',
          },
        })
      }
    }

    // Analyze put/delete operations for batchWrite opportunities
    const writeOperations = [...putOperations, ...deleteOperations]
    if (writeOperations.length >= minOperationsForBatch) {
      const sorted = [...writeOperations].sort((a, b) => a.timestamp - b.timestamp)
      const cluster = this.findOperationCluster(sorted, timeWindowMs, minOperationsForBatch)

      if (cluster) {
        const putCount = writeOperations.filter(op => op.operation === 'put').length
        const deleteCount = writeOperations.filter(op => op.operation === 'delete').length

        recommendations.push({
          severity: 'info',
          category: 'performance',
          message: 'Batch write opportunity detected',
          details: `Detected ${cluster} individual write operations (${putCount} puts, ${deleteCount} deletes) within a ${timeWindowMs}ms window.`,
          suggestedAction: 'Use batchWrite() to write multiple items in a single request. This reduces network overhead and can improve throughput.',
          affectedOperations: ['put', 'delete'],
          estimatedImpact: {
            performanceImprovement: `Reduce ${cluster} requests to ${Math.ceil(cluster / 25)} batch requests`,
            costReduction: 'Lower network overhead and improved latency',
          },
        })
      }
    }

    return recommendations
  }

  /**
   * Detect operations that could benefit from projection expressions
   */
  detectProjectionOpportunities(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const readOperations = ['get', 'query', 'scan', 'batchGet']

    for (const opType of readOperations) {
      const ops = this.statsCollector.getOperationsByType(opType)
      if (ops.length === 0) continue

      const opsWithoutProjection = ops.filter(op => !op.usedProjection)
      const projectionUsageRate = 1 - opsWithoutProjection.length / ops.length

      if (projectionUsageRate < 0.5 && opsWithoutProjection.length > 10) {
        recommendations.push({
          severity: 'info',
          category: 'performance',
          message: `Consider using projection expressions for ${opType} operations`,
          details: `Only ${(projectionUsageRate * 100).toFixed(1)}% of ${opType} operations use projection expressions. ${opsWithoutProjection.length} operations fetch full items.`,
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
   */
  detectFetchingToFilter(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const efficiencyThreshold = 0.5

    const queryOps = this.statsCollector.getOperationsByType('query')
    const patternGroups = new Map<string, OperationStats[]>()

    for (const op of queryOps) {
      if (op.scannedCount !== undefined && op.scannedCount > 0) {
        const key = op.accessPattern || 'default'
        if (!patternGroups.has(key)) {
          patternGroups.set(key, [])
        }
        patternGroups.get(key)!.push(op)
      }
    }

    for (const [groupKey, operations] of patternGroups.entries()) {
      let totalEfficiency = 0
      let lowEfficiencyCount = 0

      for (const op of operations) {
        const efficiency = op.scannedCount! > 0 && op.itemCount !== undefined ? op.itemCount / op.scannedCount! : 1
        totalEfficiency += efficiency

        if (efficiency < efficiencyThreshold) {
          lowEfficiencyCount++
        }
      }

      const avgEfficiency = totalEfficiency / operations.length

      if (avgEfficiency < efficiencyThreshold && operations.length >= 3) {
        const severity = avgEfficiency < 0.2 ? 'warning' : 'info'

        recommendations.push({
          severity,
          category: 'performance',
          message: `Potential client-side filtering detected in ${groupKey}`,
          details: `Query operations have ${(avgEfficiency * 100).toFixed(1)}% efficiency (${operations.length} operations, ${lowEfficiencyCount} with low efficiency).`,
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
   */
  detectSequentialWrites(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const timeWindowMs = 1000
    const minOperationsForBatch = 3

    const writeOperations = [
      ...this.statsCollector.getOperationsByType('put'),
      ...this.statsCollector.getOperationsByType('delete'),
    ]

    if (writeOperations.length < minOperationsForBatch) {
      return recommendations
    }

    const sorted = [...writeOperations].sort((a, b) => a.timestamp - b.timestamp)
    const clusters = this.findAllOperationClusters(sorted, timeWindowMs, minOperationsForBatch)

    for (const cluster of clusters) {
      const putCount = cluster.filter(op => op.operation === 'put').length
      const deleteCount = cluster.filter(op => op.operation === 'delete').length

      recommendations.push({
        severity: 'info',
        category: 'performance',
        message: 'Sequential write operations detected',
        details: `Detected ${cluster.length} sequential write operations (${putCount} puts, ${deleteCount} deletes) within a ${timeWindowMs}ms window.`,
        suggestedAction: 'Use batchWrite() to combine multiple put and delete operations into a single request.',
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
   */
  detectReadBeforeWrite(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const timeWindowMs = 5000
    const minOccurrences = 3

    const getOps = this.statsCollector.getOperationsByType('get')
    const putOps = this.statsCollector.getOperationsByType('put')

    const getByKey = new Map<string, OperationStats[]>()
    const putByKey = new Map<string, OperationStats[]>()

    for (const op of getOps) {
      if (op.partitionKey) {
        const key = `${op.partitionKey}${op.sortKey ? `#${op.sortKey}` : ''}`
        if (!getByKey.has(key)) {
          getByKey.set(key, [])
        }
        getByKey.get(key)!.push(op)
      }
    }

    for (const op of putOps) {
      if (op.partitionKey) {
        const key = `${op.partitionKey}${op.sortKey ? `#${op.sortKey}` : ''}`
        if (!putByKey.has(key)) {
          putByKey.set(key, [])
        }
        putByKey.get(key)!.push(op)
      }
    }

    const readBeforeWritePatterns = new Map<string, number>()

    for (const [key, gets] of getByKey.entries()) {
      const puts = putByKey.get(key)
      if (!puts) continue

      for (const getOp of gets) {
        for (const putOp of puts) {
          const timeDiff = putOp.timestamp - getOp.timestamp
          if (timeDiff > 0 && timeDiff <= timeWindowMs) {
            readBeforeWritePatterns.set(key, (readBeforeWritePatterns.get(key) || 0) + 1)
            break
          }
        }
      }
    }

    for (const [key, count] of readBeforeWritePatterns.entries()) {
      if (count >= minOccurrences) {
        recommendations.push({
          severity: 'info',
          category: 'performance',
          message: 'Read-before-write pattern detected',
          details: `Detected ${count} instances of get followed by put on key '${key}'.`,
          suggestedAction: 'Use update() instead of get() + put(). The update operation modifies items in place without requiring a read first.',
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
   * Detect slow operations
   */
  detectSlowOperations(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const thresholds = this.statsCollector.getThresholds()
    const operations = this.statsCollector.export()

    const slowOps = operations.filter(op => op.latencyMs > (thresholds.slowQueryMs ?? 1000))

    if (slowOps.length > 0) {
      const avgLatency = slowOps.reduce((sum, op) => sum + op.latencyMs, 0) / slowOps.length

      recommendations.push({
        severity: 'warning',
        category: 'performance',
        message: `${slowOps.length} slow operations detected`,
        details: `Found ${slowOps.length} operations exceeding ${thresholds.slowQueryMs}ms threshold (avg: ${avgLatency.toFixed(0)}ms).`,
        suggestedAction: 'Review slow operations for optimization opportunities: add indexes, use projections, or optimize key conditions.',
        estimatedImpact: {
          performanceImprovement: 'Improved response times',
        },
      })
    }

    return recommendations
  }

  /**
   * Detect high capacity usage
   */
  detectHighCapacityUsage(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const thresholds = this.statsCollector.getThresholds()
    const operations = this.statsCollector.export()

    const highRCUOps = operations.filter(op => (op.consumedRCU ?? 0) > (thresholds.highRCU ?? 100))
    const highWCUOps = operations.filter(op => (op.consumedWCU ?? 0) > (thresholds.highWCU ?? 100))

    if (highRCUOps.length > 0) {
      recommendations.push({
        severity: 'warning',
        category: 'cost',
        message: `${highRCUOps.length} operations with high RCU consumption`,
        details: `Found ${highRCUOps.length} operations exceeding ${thresholds.highRCU} RCU threshold.`,
        suggestedAction: 'Use projection expressions to reduce data transfer, or consider caching frequently accessed items.',
        estimatedImpact: {
          costReduction: 'Lower read capacity costs',
        },
      })
    }

    if (highWCUOps.length > 0) {
      recommendations.push({
        severity: 'warning',
        category: 'cost',
        message: `${highWCUOps.length} operations with high WCU consumption`,
        details: `Found ${highWCUOps.length} operations exceeding ${thresholds.highWCU} WCU threshold.`,
        suggestedAction: 'Review item sizes and consider breaking large items into smaller ones, or use batch operations.',
        estimatedImpact: {
          costReduction: 'Lower write capacity costs',
        },
      })
    }

    return recommendations
  }

  /**
   * Suggest capacity mode based on usage patterns
   */
  suggestCapacityMode(): CapacityRecommendation {
    const operations = this.statsCollector.export()

    if (operations.length === 0) {
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

    // Track operations per hour
    const operationsByHour = new Map<number, number>()
    let totalRCU = 0
    let totalWCU = 0

    for (const op of operations) {
      totalRCU += op.consumedRCU ?? 0
      totalWCU += op.consumedWCU ?? 0
      const hour = Math.floor(op.timestamp / (60 * 60 * 1000))
      operationsByHour.set(hour, (operationsByHour.get(hour) || 0) + 1)
    }

    // Calculate traffic variability
    const hourCounts = Array.from(operationsByHour.values())
    const avgOpsPerHour = hourCounts.reduce((sum, count) => sum + count, 0) / hourCounts.length
    const minOpsPerHour = Math.min(...hourCounts)

    const variance = hourCounts.reduce((sum, count) => sum + Math.pow(count - avgOpsPerHour, 2), 0) / hourCounts.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = avgOpsPerHour > 0 ? stdDev / avgOpsPerHour : 0

    // Determine recommendation
    let recommendedMode: 'provisioned' | 'on-demand'
    let reasoning: string

    if (coefficientOfVariation > 0.5) {
      recommendedMode = 'on-demand'
      reasoning = `Traffic is highly variable (CV: ${coefficientOfVariation.toFixed(2)}). On-demand mode handles spiky workloads more cost-effectively.`
    } else if (minOpsPerHour < avgOpsPerHour * 0.2) {
      recommendedMode = 'on-demand'
      reasoning = 'Traffic has significant idle periods. On-demand mode avoids paying for unused provisioned capacity.'
    } else if (coefficientOfVariation < 0.3 && avgOpsPerHour > 10) {
      recommendedMode = 'provisioned'
      reasoning = `Traffic is steady and predictable (CV: ${coefficientOfVariation.toFixed(2)}). Provisioned mode offers better cost efficiency.`
    } else {
      recommendedMode = 'on-demand'
      reasoning = 'Traffic patterns are moderate. On-demand mode provides flexibility without capacity planning.'
    }

    return {
      currentMode: 'unknown',
      recommendedMode,
      reasoning,
      estimatedMonthlyCost: {
        current: 0,
        recommended: 0,
        savings: 0,
      },
    }
  }

  /**
   * Helper: Find the first cluster of operations within a time window
   */
  private findOperationCluster(
    sortedOps: OperationStats[],
    timeWindowMs: number,
    minSize: number
  ): number | null {
    for (let windowStart = 0; windowStart < sortedOps.length; windowStart++) {
      let windowEnd = windowStart

      while (
        windowEnd < sortedOps.length - 1 &&
        sortedOps[windowEnd + 1].timestamp - sortedOps[windowStart].timestamp <= timeWindowMs
      ) {
        windowEnd++
      }

      const opsInWindow = windowEnd - windowStart + 1
      if (opsInWindow >= minSize) {
        return opsInWindow
      }
    }

    return null
  }

  /**
   * Helper: Find all clusters of operations within a time window
   */
  private findAllOperationClusters(
    sortedOps: OperationStats[],
    timeWindowMs: number,
    minSize: number
  ): OperationStats[][] {
    const clusters: OperationStats[][] = []
    let currentCluster: OperationStats[] = []

    for (const op of sortedOps) {
      if (currentCluster.length === 0) {
        currentCluster.push(op)
      } else {
        const timeSinceFirst = op.timestamp - currentCluster[0].timestamp

        if (timeSinceFirst <= timeWindowMs) {
          currentCluster.push(op)
        } else {
          if (currentCluster.length >= minSize) {
            clusters.push([...currentCluster])
          }
          currentCluster = [op]
        }
      }
    }

    if (currentCluster.length >= minSize) {
      clusters.push(currentCluster)
    }

    return clusters
  }
}
