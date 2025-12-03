/**
 * DynamoDB TypeScript Wrapper
 *
 * A lightweight wrapper for AWS DynamoDB that provides:
 * - Simplified API interface
 * - Optional schema validation with strong typing
 * - First-class support for DynamoDB patterns
 * - Access pattern definitions
 * - Performance statistics and recommendations
 */

// Export core types
export type {
  Key,
  KeyCondition,
  FilterExpression,
  QueryParams,
  QueryResult,
  ScanParams,
  ScanResult,
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
  Schema,
  AccessPatternDefinition,
  AccessPatternDefinitions,
  StatsConfig,
  RetryConfig,
  TableClientConfig,
  MultiAttributeKey,
  GSIConfig,
  OperationStats,
  OperationTypeStats,
  AccessPatternStats,
  TableStats,
} from './types'

// Export error classes
export {
  DynamoDBWrapperError,
  ValidationError,
  ConditionalCheckError,
} from './errors'

// Export TableClient
export { TableClient } from './table-client'

// Export expression builders
export { KeyConditionBuilder, FilterExpressionBuilder } from './expression-builders'

// Export multi-attribute key helpers
export {
  multiAttributeKey,
  multiTenantKey,
  hierarchicalMultiKey,
  timeSeriesMultiKey,
  locationMultiKey,
  productCategoryMultiKey,
  statusPriorityMultiKey,
  versionMultiKey,
} from './multi-attribute-key-helpers'

// Export multi-attribute key validation
export {
  validateMultiAttributeKeyConfig,
  validateMultiAttributeKeyValues,
  validateMultiAttributeSortKeyOrder,
  MAX_MULTI_ATTRIBUTE_KEY_LENGTH,
} from './multi-attribute-key-validator'

// Export type guards
export {
  isMultiAttributeKey,
  hasMultiAttributePartitionKey,
  hasMultiAttributeSortKey,
  hasSingleAttributeKeys,
  isMultiAttributePartitionKey,
  isMultiAttributeSortKey,
  gsiHasMultiAttributePartitionKey,
  gsiHasMultiAttributeSortKey,
  isMultiAttributeSortKeyArray,
  isMultiAttributeSortKeyCondition,
} from './type-guards'

// Export pattern helpers
export { PatternHelpers } from './pattern-helpers'

// Export stats collector
export { StatsCollector } from './stats-collector'

// Export retry handler
export { RetryHandler, DEFAULT_RETRY_CONFIG } from './retry-handler'

// Core exports will be added as components are implemented
export const version = '0.1.0'
