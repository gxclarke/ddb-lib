/**
 * Core type definitions for DynamoDB patterns and utilities
 * This module contains types with no external dependencies
 */

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
