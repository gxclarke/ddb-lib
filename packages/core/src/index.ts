/**
 * @ddb-lib/core - Core utilities for DynamoDB patterns and best practices
 * 
 * This package provides pure utility functions with no external dependencies
 * for implementing DynamoDB best practices and patterns.
 */

// Pattern helpers
export { PatternHelpers } from './pattern-helpers'

// Multi-attribute key helpers
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

// Multi-attribute key validators
export {
  validateMultiAttributeKeyConfig,
  validateMultiAttributeKeyValues,
  validateMultiAttributeSortKeyOrder,
  MAX_MULTI_ATTRIBUTE_KEY_LENGTH,
} from './multi-attribute-key-validator'

// Expression builders
export {
  KeyConditionBuilder,
  FilterExpressionBuilder,
  ConditionExpressionBuilder,
  ProjectionExpressionBuilder,
} from './expression-builders'

export type { ExpressionResult } from './expression-builders'

// Type guards
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

// Types
export type {
  Key,
  MultiAttributeKey,
  GSIConfig,
  KeyCondition,
  FilterExpression,
  ConditionExpression,
  AccessPatternDefinition,
  AccessPatternDefinitions,
} from './types'

// Errors
export { DDBLibError, ValidationError } from './errors'
