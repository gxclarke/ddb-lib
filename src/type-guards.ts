/**
 * Type guards for multi-attribute keys and related types
 */

import type { KeyCondition, MultiAttributeKey, GSIConfig } from './types'

/**
 * Type guard to check if a value is a MultiAttributeKey
 */
export function isMultiAttributeKey(value: any): value is MultiAttributeKey {
  return (
    value !== null &&
    typeof value === 'object' &&
    'attributes' in value &&
    Array.isArray(value.attributes) &&
    value.attributes.every(
      (attr: any) =>
        attr !== null &&
        typeof attr === 'object' &&
        'name' in attr &&
        'type' in attr &&
        typeof attr.name === 'string' &&
        (attr.type === 'string' || attr.type === 'number' || attr.type === 'binary')
    )
  )
}

/**
 * Type guard to check if a KeyCondition uses multi-attribute partition key
 */
export function hasMultiAttributePartitionKey(
  keyCondition: KeyCondition
): keyCondition is KeyCondition & { multiPk: Array<string | number | Uint8Array> } {
  return 'multiPk' in keyCondition && Array.isArray(keyCondition.multiPk)
}

/**
 * Type guard to check if a KeyCondition uses multi-attribute sort key
 */
export function hasMultiAttributeSortKey(
  keyCondition: KeyCondition
): keyCondition is KeyCondition & {
  multiSk: Array<string | number | Uint8Array> | Record<string, any>
} {
  return 'multiSk' in keyCondition && keyCondition.multiSk !== undefined
}

/**
 * Type guard to check if a KeyCondition uses single-attribute keys
 */
export function hasSingleAttributeKeys(
  keyCondition: KeyCondition
): keyCondition is KeyCondition & {
  pk?: string | number | Uint8Array
  sk?: string | number | Uint8Array | Record<string, any>
} {
  return 'pk' in keyCondition || 'sk' in keyCondition
}

/**
 * Type guard to check if a partition key is multi-attribute
 */
export function isMultiAttributePartitionKey(
  partitionKey: string | MultiAttributeKey
): partitionKey is MultiAttributeKey {
  return isMultiAttributeKey(partitionKey)
}

/**
 * Type guard to check if a sort key is multi-attribute
 */
export function isMultiAttributeSortKey(
  sortKey: string | MultiAttributeKey | undefined
): sortKey is MultiAttributeKey {
  return sortKey !== undefined && isMultiAttributeKey(sortKey)
}

/**
 * Type guard to check if a GSIConfig has multi-attribute partition key
 */
export function gsiHasMultiAttributePartitionKey(
  gsiConfig: GSIConfig
): gsiConfig is GSIConfig & { partitionKey: MultiAttributeKey } {
  return isMultiAttributePartitionKey(gsiConfig.partitionKey)
}

/**
 * Type guard to check if a GSIConfig has multi-attribute sort key
 */
export function gsiHasMultiAttributeSortKey(
  gsiConfig: GSIConfig
): gsiConfig is GSIConfig & { sortKey: MultiAttributeKey } {
  return isMultiAttributeSortKey(gsiConfig.sortKey)
}

/**
 * Type guard to check if multi-attribute sort key is an array (simple equality)
 */
export function isMultiAttributeSortKeyArray(
  multiSk: Array<string | number | Uint8Array> | Record<string, any>
): multiSk is Array<string | number | Uint8Array> {
  return Array.isArray(multiSk)
}

/**
 * Type guard to check if multi-attribute sort key is an object (with operators)
 */
export function isMultiAttributeSortKeyCondition(
  multiSk: Array<string | number | Uint8Array> | Record<string, any>
): multiSk is Record<string, any> {
  return !Array.isArray(multiSk) && typeof multiSk === 'object' && multiSk !== null
}
