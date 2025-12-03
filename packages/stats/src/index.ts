/**
 * @ddb-lib/stats - Statistics collection and monitoring for DynamoDB operations
 * 
 * This package provides statistics collection, recommendation generation, and
 * anti-pattern detection for DynamoDB operations. It works independently of
 * the data access layer and can be used with TableClient, Amplify, or any
 * other DynamoDB client.
 */

export { StatsCollector } from './stats-collector'
export { RecommendationEngine } from './recommendation-engine'
export { AntiPatternDetector } from './anti-pattern-detector'

export type {
  StatsConfig,
  OperationRecord,
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
