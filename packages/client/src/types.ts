/**
 * Type definitions for TableClient
 */

import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type { ConsumedCapacity } from '@aws-sdk/client-dynamodb'
import type { Key, KeyCondition, FilterExpression, GSIConfig } from '@ddb-lib/core'
import type { StatsConfig } from '@ddb-lib/stats'

// Import for re-export only
export type { TableStats } from '@ddb-lib/stats'

/**
 * Schema interface for type validation
 */
export interface Schema<T> {
  /** Internal type marker for type inference */
  readonly _type: T
  parse(data: unknown): T
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: any }
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

// Re-export commonly used types from dependencies
export type { Key, KeyCondition, FilterExpression, GSIConfig } from '@ddb-lib/core'
export type { StatsConfig } from '@ddb-lib/stats'
