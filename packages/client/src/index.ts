/**
 * @ddb-lib/client - DynamoDB TableClient with integrated stats and monitoring
 */

// Export main TableClient
export { TableClient } from './table-client'

// Export error classes
export { DynamoDBWrapperError, ValidationError, ConditionalCheckError } from './errors'

// Export retry handler
export { RetryHandler, DEFAULT_RETRY_CONFIG } from './retry-handler'

// Export types
export type {
  TableClientConfig,
  Schema,
  AccessPatternDefinition,
  AccessPatternDefinitions,
  RetryConfig,
  ConditionExpression,
  GetOptions,
  PutOptions,
  UpdateOptions,
  DeleteOptions,
  BatchGetOptions,
  BatchWriteOperation,
  BatchWriteOptions,
  TransactWriteOperation,
  TransactWriteOptions,
  TransactGetOptions,
  QueryResult,
  ScanResult,
  QueryParams,
  ScanParams,
} from './types'

// Re-export commonly used types from dependencies
export type {
  Key,
  KeyCondition,
  FilterExpression,
  GSIConfig,
  MultiAttributeKey,
} from '@ddb-lib/core'

export type {
  StatsConfig,
  TableStats,
  OperationRecord,
  Recommendation,
} from '@ddb-lib/stats'
