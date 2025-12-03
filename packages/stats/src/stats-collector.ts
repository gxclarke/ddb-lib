/**
 * StatsCollector - Collects and aggregates DynamoDB operation statistics
 * Decoupled from any specific data access layer (works with TableClient, Amplify, etc.)
 */

import type {
  StatsConfig,
  OperationRecord,
  OperationStats,
  OperationTypeStats,
  AccessPatternStats,
  TableStats,
} from './types'

/**
 * StatsCollector class for collecting and aggregating operation statistics
 * Works independently of the data access layer
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
   * @param record - Operation record to track
   * @param tableName - Optional table name for internal tracking
   */
  record(record: OperationRecord, tableName = 'default'): void {
    // Skip if stats collection is disabled
    if (!this.config.enabled) {
      return
    }

    // Apply sampling - only record if random value is below sample rate
    if (Math.random() > this.config.sampleRate) {
      return
    }

    // Convert OperationRecord to internal OperationStats format
    const stats: OperationStats = {
      ...record,
      tableName,
      consumedRCU: record.rcu,
      consumedWCU: record.wcu,
      itemCount: record.itemCount ?? 0,
      accessPattern: record.patternName,
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
        const itemCount = op.itemCount ?? 0
        stats.avgItemsReturned =
          (stats.avgItemsReturned * prevCount + itemCount) / stats.count
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
   * Get the number of recorded operations
   */
  getOperationCount(): number {
    return this.operations.length
  }

  /**
   * Get operations within a time range
   */
  getOperationsInRange(startTime: number, endTime: number): OperationStats[] {
    return this.operations.filter(
      op => op.timestamp >= startTime && op.timestamp <= endTime
    )
  }

  /**
   * Get operations by type
   */
  getOperationsByType(operationType: string): OperationStats[] {
    return this.operations.filter(op => op.operation === operationType)
  }

  /**
   * Get operations by pattern name
   */
  getOperationsByPattern(patternName: string): OperationStats[] {
    return this.operations.filter(op => op.accessPattern === patternName)
  }
}
