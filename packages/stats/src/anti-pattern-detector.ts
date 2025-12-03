/**
 * AntiPatternDetector - Detects DynamoDB anti-patterns and inefficiencies
 */

import type { StatsCollector } from './stats-collector'
import type {
  Recommendation,
  HotPartitionReport,
  ScanReport,
  IndexReport,
} from './types'

/**
 * AntiPatternDetector class for detecting DynamoDB anti-patterns
 */
export class AntiPatternDetector {
  constructor(private readonly statsCollector: StatsCollector) { }

  /**
   * Detect hot partitions (partitions receiving >10% of traffic)
   */
  detectHotPartitions(): HotPartitionReport[] {
    const operations = this.statsCollector.export()
    const partitionCounts = new Map<string, number>()
    let totalOperations = 0

    for (const op of operations) {
      if (op.partitionKey) {
        const key = op.partitionKey
        partitionCounts.set(key, (partitionCounts.get(key) || 0) + 1)
        totalOperations++
      } else if (op.indexName) {
        // Track by index if no partition key available
        const key = `${op.tableName}:${op.indexName}`
        partitionCounts.set(key, (partitionCounts.get(key) || 0) + 1)
        totalOperations++
      }
    }

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

    hotPartitions.sort((a, b) => b.percentageOfTotal - a.percentageOfTotal)
    return hotPartitions
  }

  /**
   * Detect inefficient scan operations (efficiency <20%)
   */
  detectInefficientScans(): ScanReport[] {
    const operations = this.statsCollector.getOperationsByType('scan')
    const scanReports: ScanReport[] = []
    const efficiencyThreshold = 0.2 // 20%

    for (const op of operations) {
      if (op.scannedCount !== undefined && op.scannedCount > 0 && op.itemCount !== undefined) {
        const efficiency = op.itemCount / op.scannedCount

        if (efficiency < efficiencyThreshold) {
          const operationId = `scan on ${op.tableName}${op.indexName ? `:${op.indexName}` : ''}`

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

    scanReports.sort((a, b) => a.efficiency - b.efficiency)
    return scanReports
  }

  /**
   * Detect unused indexes (not used in 7 days)
   */
  detectUnusedIndexes(): IndexReport[] {
    const operations = this.statsCollector.export()
    const indexUsage = new Map<string, { count: number; lastUsed: number }>()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    for (const op of operations) {
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

    const indexReports: IndexReport[] = []

    for (const [indexKey, usage] of indexUsage.entries()) {
      if (usage.lastUsed < sevenDaysAgo) {
        indexReports.push({
          indexName: indexKey,
          usageCount: usage.count,
          lastUsed: usage.lastUsed,
          recommendation: `Index '${indexKey}' has not been used in the last 7 days (last used: ${new Date(usage.lastUsed).toISOString()}). Consider removing this index to reduce storage costs.`,
        })
      }
    }

    indexReports.sort((a, b) => (a.lastUsed ?? 0) - (b.lastUsed ?? 0))
    return indexReports
  }

  /**
   * Detect string concatenation patterns that could use multi-attribute keys
   */
  detectStringConcatenation(): Recommendation[] {
    const operations = this.statsCollector.export()
    const recommendations: Recommendation[] = []
    const concatenationPatterns = new Map<string, number>()

    for (const op of operations) {
      if (op.indexName) {
        const key = `${op.tableName}:${op.indexName}`
        concatenationPatterns.set(key, (concatenationPatterns.get(key) || 0) + 1)
      }
    }

    for (const [indexKey, count] of concatenationPatterns.entries()) {
      if (count > 10) {
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
   * Detect large item scans (items exceeding size thresholds)
   */
  detectLargeItemScans(): Recommendation[] {
    const operations = this.statsCollector.export()
    const recommendations: Recommendation[] = []
    const warningThreshold = 100 * 1024 // 100KB
    const errorThreshold = 300 * 1024 // 300KB

    const largeItems = operations.filter(
      op => op.itemSizeBytes && op.itemSizeBytes > warningThreshold
    )

    if (largeItems.length > 0) {
      const veryLargeItems = largeItems.filter(
        op => op.itemSizeBytes && op.itemSizeBytes > errorThreshold
      )

      const severity = veryLargeItems.length > 0 ? 'warning' : 'info'
      const avgSize = largeItems.reduce((sum, op) => sum + (op.itemSizeBytes ?? 0), 0) / largeItems.length

      recommendations.push({
        severity,
        category: 'best-practice',
        message: `${largeItems.length} operations with large items detected`,
        details: `Found ${largeItems.length} operations with items exceeding ${warningThreshold / 1024}KB (avg: ${(avgSize / 1024).toFixed(1)}KB). ${veryLargeItems.length} exceed ${errorThreshold / 1024}KB.`,
        suggestedAction: 'Consider storing large attributes in S3 and keeping only references in DynamoDB. This reduces costs and improves performance.',
        estimatedImpact: {
          costReduction: 'Lower storage and capacity costs',
          performanceImprovement: 'Faster operations with smaller items',
        },
      })
    }

    return recommendations
  }

  /**
   * Detect missing GSIs (frequent scans that could use an index)
   */
  detectMissingGSIs(): Recommendation[] {
    const scanOps = this.statsCollector.getOperationsByType('scan')
    const recommendations: Recommendation[] = []

    if (scanOps.length > 10) {
      const scansByTable = new Map<string, number>()

      for (const op of scanOps) {
        scansByTable.set(op.tableName, (scansByTable.get(op.tableName) || 0) + 1)
      }

      for (const [tableName, count] of scansByTable.entries()) {
        if (count > 5) {
          recommendations.push({
            severity: 'warning',
            category: 'performance',
            message: `Frequent scans detected on ${tableName}`,
            details: `Found ${count} scan operations on ${tableName}. Scans are inefficient and expensive for large tables.`,
            suggestedAction: 'Consider adding a GSI to support your query patterns. Analyze your access patterns and create appropriate indexes.',
            estimatedImpact: {
              performanceImprovement: 'Significantly faster queries',
              costReduction: 'Lower capacity consumption',
            },
          })
        }
      }
    }

    return recommendations
  }

  /**
   * Detect read-before-write pattern (get followed by put)
   */
  detectReadBeforeWrite(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const timeWindowMs = 5000
    const minOccurrences = 3

    const getOps = this.statsCollector.getOperationsByType('get')
    const putOps = this.statsCollector.getOperationsByType('put')

    const getByKey = new Map<string, typeof getOps>()
    const putByKey = new Map<string, typeof putOps>()

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
          details: `Detected ${count} instances of get followed by put on key '${key}'. This suggests reading an item to modify it, then writing it back.`,
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
   * Generate all anti-pattern recommendations
   */
  generateRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = []

    recommendations.push(...this.detectStringConcatenation())
    recommendations.push(...this.detectLargeItemScans())
    recommendations.push(...this.detectMissingGSIs())
    recommendations.push(...this.detectReadBeforeWrite())

    return recommendations
  }
}
