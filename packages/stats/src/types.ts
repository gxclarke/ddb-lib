/**
 * Type definitions for statistics collection and monitoring
 */

/**
 * Statistics configuration
 */
export interface StatsConfig {
  /** Enable statistics collection */
  enabled: boolean
  /** Sample rate (0-1, default 1 = 100%) */
  sampleRate?: number
  /** Thresholds for warnings */
  thresholds?: {
    slowQueryMs?: number
    highRCU?: number
    highWCU?: number
  }
}

/**
 * Record of a single operation for statistics tracking
 * This is the interface that consumers use to record operations
 */
export interface OperationRecord {
  /** Operation type */
  operation: 'get' | 'put' | 'update' | 'delete' | 'query' | 'scan' | 'batchGet' | 'batchWrite' | 'transactWrite' | 'transactGet'
  /** Timestamp when operation was executed */
  timestamp: number
  /** Operation latency in milliseconds */
  latencyMs: number
  /** Consumed read capacity units */
  rcu?: number
  /** Consumed write capacity units */
  wcu?: number
  /** Number of items returned */
  itemCount?: number
  /** Number of items scanned (for query/scan) */
  scannedCount?: number
  /** Index name (for query/scan on GSI/LSI) */
  indexName?: string
  /** Key condition (for pattern analysis) */
  keyCondition?: any
  /** Filter expression (for pattern analysis) */
  filter?: any
  /** Access pattern name (if using named patterns) */
  patternName?: string
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Internal statistics for a single operation (extends OperationRecord with additional tracking)
 */
export interface OperationStats extends OperationRecord {
  /** Table name */
  tableName: string
  /** Consumed read capacity units (normalized name) */
  consumedRCU?: number
  /** Consumed write capacity units (normalized name) */
  consumedWCU?: number
  /** Whether projection expression was used */
  usedProjection?: boolean
  /** Number of attributes projected (if projection was used) */
  projectedAttributeCount?: number
  /** Partition key value (for tracking hot partitions and patterns) */
  partitionKey?: string
  /** Sort key value (for tracking patterns) */
  sortKey?: string
  /** Item size in bytes (for large item detection) */
  itemSizeBytes?: number
  /** Access pattern name (if using named patterns) */
  accessPattern?: string
}

/**
 * Aggregated statistics by operation type
 */
export interface OperationTypeStats {
  /** Number of operations */
  count: number
  /** Total latency across all operations */
  totalLatencyMs: number
  /** Average latency per operation */
  avgLatencyMs: number
  /** Total read capacity units consumed */
  totalRCU: number
  /** Total write capacity units consumed */
  totalWCU: number
}

/**
 * Aggregated statistics by access pattern
 */
export interface AccessPatternStats {
  /** Number of times pattern was executed */
  count: number
  /** Average latency */
  avgLatencyMs: number
  /** Average items returned */
  avgItemsReturned: number
}

/**
 * Complete table statistics
 */
export interface TableStats {
  /** Statistics by operation type */
  operations: {
    [operationType: string]: OperationTypeStats
  }
  /** Statistics by access pattern */
  accessPatterns: {
    [patternName: string]: AccessPatternStats
  }
}

/**
 * Hot partition report
 */
export interface HotPartitionReport {
  /** Partition key value */
  partitionKey: string
  /** Number of accesses to this partition */
  accessCount: number
  /** Percentage of total traffic */
  percentageOfTotal: number
  /** Recommendation for addressing the hot partition */
  recommendation: string
}

/**
 * Scan inefficiency report
 */
export interface ScanReport {
  /** Operation identifier */
  operation: string
  /** Number of items scanned */
  scannedCount: number
  /** Number of items returned */
  returnedCount: number
  /** Efficiency ratio (returnedCount / scannedCount) */
  efficiency: number
  /** Recommendation for improving efficiency */
  recommendation: string
}

/**
 * Unused index report
 */
export interface IndexReport {
  /** Index name */
  indexName: string
  /** Number of times the index was used */
  usageCount: number
  /** Timestamp of last usage (undefined if never used) */
  lastUsed?: number
  /** Recommendation regarding the index */
  recommendation: string
}

/**
 * Capacity mode recommendation
 */
export interface CapacityRecommendation {
  /** Current capacity mode */
  currentMode: 'provisioned' | 'on-demand' | 'unknown'
  /** Recommended capacity mode */
  recommendedMode: 'provisioned' | 'on-demand'
  /** Reasoning for the recommendation */
  reasoning: string
  /** Estimated monthly costs */
  estimatedMonthlyCost: {
    current: number
    recommended: number
    savings: number
  }
}

/**
 * Recommendation for optimization
 */
export interface Recommendation {
  /** Severity level */
  severity: 'info' | 'warning' | 'error'
  /** Category of recommendation */
  category: 'performance' | 'cost' | 'best-practice' | 'hot-partition' | 'capacity'
  /** Short message describing the issue */
  message: string
  /** Detailed explanation */
  details: string
  /** Suggested action to take */
  suggestedAction?: string
  /** Operations affected by this issue */
  affectedOperations?: string[]
  /** Estimated impact of implementing the recommendation */
  estimatedImpact?: {
    costReduction?: string
    performanceImprovement?: string
  }
}
