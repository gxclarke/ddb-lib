/**
 * Core type definitions for DynamoDB wrapper
 */

import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type { ConsumedCapacity } from '@aws-sdk/client-dynamodb'
import type { ValidationError } from './errors'

/**
 * Key representation for DynamoDB items
 */
export interface Key {
  pk: string
  sk?: string
}

/**
 * Multi-attribute key definition for GSI partition or sort keys
 * Supports up to 4 attributes per key with native type preservation
 */
export interface MultiAttributeKey {
  attributes: Array<{
    name: string
    type: 'string' | 'number' | 'binary'
  }>
}

/**
 * GSI configuration with multi-attribute key support
 */
export interface GSIConfig {
  indexName: string
  partitionKey: string | MultiAttributeKey
  sortKey?: string | MultiAttributeKey
}

/**
 * Key condition for query operations
 * Supports both traditional single-attribute keys and multi-attribute composite keys
 */
export interface KeyCondition {
  // Traditional single-attribute keys
  pk?: string | number | Uint8Array
  sk?:
  | string
  | number
  | Uint8Array
  | {
    eq?: string | number | Uint8Array
    lt?: string | number | Uint8Array
    lte?: string | number | Uint8Array
    gt?: string | number | Uint8Array
    gte?: string | number | Uint8Array
    between?: [string | number | Uint8Array, string | number | Uint8Array]
    beginsWith?: string
  }

  // Multi-attribute composite keys (for GSIs)
  // Each array element corresponds to one attribute in the multi-attribute key
  multiPk?: Array<string | number | Uint8Array>
  multiSk?:
  | Array<string | number | Uint8Array>
  | {
    eq?: Array<string | number | Uint8Array>
    lt?: Array<string | number | Uint8Array>
    lte?: Array<string | number | Uint8Array>
    gt?: Array<string | number | Uint8Array>
    gte?: Array<string | number | Uint8Array>
    between?: [
      Array<string | number | Uint8Array>,
      Array<string | number | Uint8Array>
    ]
    // Note: beginsWith not supported for multi-attribute sort keys
  }
}

/**
 * Filter expression for query and scan operations
 */
export interface FilterExpression {
  [field: string]:
  | any
  | {
    eq?: any
    ne?: any
    lt?: any
    lte?: any
    gt?: any
    gte?: any
    between?: [any, any]
    in?: any[]
    exists?: boolean
    contains?: any
    beginsWith?: string
  }
}

/**
 * Result from query operations
 */
export interface QueryResult<T> {
  items: T[]
  lastEvaluatedKey?: Key
  count: number
  scannedCount: number
  consumedCapacity?: ConsumedCapacity
}

/**
 * Result from scan operations
 */
export interface ScanResult<T> {
  items: T[]
  lastEvaluatedKey?: Key
  count: number
  scannedCount: number
  consumedCapacity?: ConsumedCapacity
}

/**
 * Condition expression for conditional operations
 */
export interface ConditionExpression {
  [field: string]:
  | any
  | {
    eq?: any
    ne?: any
    lt?: any
    lte?: any
    gt?: any
    gte?: any
    exists?: boolean
    contains?: any
    beginsWith?: string
  }
}

/**
 * Options for get operations
 */
export interface GetOptions {
  /** Use strongly consistent reads */
  consistentRead?: boolean
  /** Only fetch specific attributes */
  projectionExpression?: string[]
}

/**
 * Options for put operations
 */
export interface PutOptions {
  /** Conditional expression for the put operation */
  condition?: ConditionExpression
  /** What values to return after the operation */
  returnValues?: 'NONE' | 'ALL_OLD'
}

/**
 * Options for update operations
 */
export interface UpdateOptions {
  /** Conditional expression for the update operation */
  condition?: ConditionExpression
  /** What values to return after the operation */
  returnValues?: 'NONE' | 'ALL_OLD' | 'ALL_NEW' | 'UPDATED_OLD' | 'UPDATED_NEW'
}

/**
 * Options for delete operations
 */
export interface DeleteOptions {
  /** Conditional expression for the delete operation */
  condition?: ConditionExpression
  /** What values to return after the operation */
  returnValues?: 'NONE' | 'ALL_OLD'
}

/**
 * Options for batch get operations
 */
export interface BatchGetOptions {
  /** Use strongly consistent reads */
  consistentRead?: boolean
  /** Only fetch specific attributes */
  projectionExpression?: string[]
  /** Chunk size for batching (default 100, DynamoDB limit) */
  chunkSize?: number
}

/**
 * Batch write operation types
 */
export type BatchWriteOperation<T> =
  | { type: 'put'; item: T }
  | { type: 'delete'; key: Key }

/**
 * Options for batch write operations
 */
export interface BatchWriteOptions {
  /** Chunk size for batching (default 25, DynamoDB limit) */
  chunkSize?: number
}

/**
 * Transactional write operation types
 */
export type TransactWriteOperation<T> =
  | { type: 'put'; item: T; condition?: ConditionExpression }
  | { type: 'update'; key: Key; updates: Partial<T>; condition?: ConditionExpression }
  | { type: 'delete'; key: Key; condition?: ConditionExpression }
  | { type: 'conditionCheck'; key: Key; condition: ConditionExpression }

/**
 * Options for transactional write operations
 */
export interface TransactWriteOptions {
  /** Client request token for idempotency (optional) */
  clientRequestToken?: string
}

/**
 * Options for transactional get operations
 */
export interface TransactGetOptions {
  /** Only fetch specific attributes */
  projectionExpression?: string[]
}

/**
 * Schema interface for type validation
 */
export interface Schema<T> {
  /** Internal type marker for type inference */
  readonly _type: T
  parse(data: unknown): T
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: ValidationError }
  partial(): Schema<Partial<T>>
  pick<K extends keyof T>(keys: K[]): Schema<Pick<T, K>>
  omit<K extends keyof T>(keys: K[]): Schema<Omit<T, K>>
}

/**
 * Access pattern definition
 */
export interface AccessPatternDefinition<TItem, TParams, TResult = TItem> {
  /** Index name (undefined = primary index) */
  index?: string
  /** GSI configuration for multi-attribute key validation (optional) */
  gsiConfig?: GSIConfig
  /** Function to build key condition from parameters */
  keyCondition: (params: TParams) => KeyCondition
  /** Optional filter expression */
  filter?: (params: TParams) => FilterExpression
  /** Optional transform function for results */
  transform?: (items: TItem[]) => TResult[]
}

/**
 * Collection of access pattern definitions
 */
export interface AccessPatternDefinitions<TItem> {
  [patternName: string]: AccessPatternDefinition<TItem, any, any>
}

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
 * Statistics for a single operation
 */
export interface OperationStats {
  /** Operation type (get, put, update, delete, query, scan, etc.) */
  operation: string
  /** Table name */
  tableName: string
  /** Index name (for query/scan on GSI/LSI) */
  indexName?: string
  /** Access pattern name (if using named patterns) */
  accessPattern?: string
  /** Timestamp when operation was executed */
  timestamp: number
  /** Operation latency in milliseconds */
  latencyMs: number
  /** Consumed read capacity units */
  consumedRCU?: number
  /** Consumed write capacity units */
  consumedWCU?: number
  /** Number of items returned */
  itemCount: number
  /** Number of items scanned (for query/scan) */
  scannedCount?: number
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
 * Parameters for query operations
 */
export interface QueryParams {
  /** Key condition for the query */
  keyCondition: KeyCondition
  /** Optional filter expression */
  filter?: FilterExpression
  /** Index name (for GSI/LSI queries) */
  index?: string
  /** Limit the number of items returned */
  limit?: number
  /** Scan forward (true) or backward (false) */
  scanIndexForward?: boolean
  /** Exclusive start key for pagination */
  exclusiveStartKey?: Key
  /** Use consistent reads */
  consistentRead?: boolean
  /** Only fetch specific attributes */
  projectionExpression?: string[]
}

/**
 * Parameters for scan operations
 */
export interface ScanParams {
  /** Optional filter expression */
  filter?: FilterExpression
  /** Index name (for GSI/LSI scans) */
  index?: string
  /** Limit the number of items returned */
  limit?: number
  /** Exclusive start key for pagination */
  exclusiveStartKey?: Key
  /** Use consistent reads */
  consistentRead?: boolean
  /** Only fetch specific attributes */
  projectionExpression?: string[]
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

/**
 * Retry configuration for operations
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Base delay in milliseconds before first retry */
  baseDelayMs: number
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number
  /** List of error codes that should trigger a retry */
  retryableErrors: string[]
}

/**
 * Configuration for TableClient
 */
export interface TableClientConfig<TSchema = any> {
  /** DynamoDB table name */
  tableName: string
  /** DynamoDB client instance (optional, will create if not provided) */
  client?: DynamoDBClient
  /** Schema for validation (optional) */
  schema?: Schema<TSchema>
  /** Access pattern definitions (optional) */
  accessPatterns?: AccessPatternDefinitions<TSchema>
  /** Statistics configuration (optional) */
  statsConfig?: StatsConfig
  /** Retry configuration (optional) */
  retryConfig?: Partial<RetryConfig>
  /** AWS region (optional) */
  region?: string
  /** Custom endpoint (optional, for DynamoDB Local) */
  endpoint?: string
  /** Enable debug mode (optional) */
  debug?: boolean
}
