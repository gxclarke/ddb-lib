/**
 * Validation utilities for multi-attribute composite keys
 */

import type { MultiAttributeKey } from './types'
import { DDBLibError } from './errors'

/**
 * Maximum number of attributes allowed in a multi-attribute key
 */
export const MAX_MULTI_ATTRIBUTE_KEY_LENGTH = 4

/**
 * Validate a multi-attribute key configuration
 * @param key - The multi-attribute key configuration to validate
 * @param keyType - Type of key ('partition' or 'sort') for error messages
 * @throws {DDBLibError} If validation fails
 */
export function validateMultiAttributeKeyConfig(
  key: MultiAttributeKey,
  keyType: 'partition' | 'sort'
): void {
  // Validate attribute count
  if (key.attributes.length === 0) {
    throw new DDBLibError(
      `Multi-attribute ${keyType} key must have at least one attribute`,
      'INVALID_MULTI_ATTRIBUTE_KEY',
      { keyType, attributeCount: 0 }
    )
  }

  if (key.attributes.length > MAX_MULTI_ATTRIBUTE_KEY_LENGTH) {
    throw new DDBLibError(
      `Multi-attribute ${keyType} key cannot have more than ${MAX_MULTI_ATTRIBUTE_KEY_LENGTH} attributes (got ${key.attributes.length})`,
      'INVALID_MULTI_ATTRIBUTE_KEY',
      { keyType, attributeCount: key.attributes.length, maxAllowed: MAX_MULTI_ATTRIBUTE_KEY_LENGTH }
    )
  }

  // Validate each attribute
  for (let i = 0; i < key.attributes.length; i++) {
    const attr = key.attributes[i]

    // Validate attribute name
    if (!attr.name || typeof attr.name !== 'string' || attr.name.trim() === '') {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute at index ${i} must have a non-empty name`,
        'INVALID_MULTI_ATTRIBUTE_KEY',
        { keyType, attributeIndex: i, attribute: attr }
      )
    }

    // Validate attribute type
    if (!attr.type || !['string', 'number', 'binary'].includes(attr.type)) {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute '${attr.name}' must have type 'string', 'number', or 'binary' (got '${attr.type}')`,
        'INVALID_MULTI_ATTRIBUTE_KEY',
        { keyType, attributeName: attr.name, attributeType: attr.type }
      )
    }
  }

  // Check for duplicate attribute names
  const names = key.attributes.map((attr) => attr.name)
  const uniqueNames = new Set(names)
  if (names.length !== uniqueNames.size) {
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
    throw new DDBLibError(
      `Multi-attribute ${keyType} key has duplicate attribute names: ${duplicates.join(', ')}`,
      'INVALID_MULTI_ATTRIBUTE_KEY',
      { keyType, duplicateNames: duplicates }
    )
  }
}

/**
 * Validate multi-attribute key values against configuration
 * @param values - Array of values for the multi-attribute key
 * @param config - Multi-attribute key configuration
 * @param keyType - Type of key ('partition' or 'sort') for error messages
 * @throws {DDBLibError} If validation fails
 */
export function validateMultiAttributeKeyValues(
  values: Array<string | number | Uint8Array>,
  config: MultiAttributeKey,
  keyType: 'partition' | 'sort'
): void {
  // Validate value count
  if (values.length === 0) {
    throw new DDBLibError(
      `Multi-attribute ${keyType} key must have at least one value`,
      'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
      { keyType, valueCount: 0 }
    )
  }

  if (values.length > config.attributes.length) {
    throw new DDBLibError(
      `Multi-attribute ${keyType} key has too many values: expected max ${config.attributes.length}, got ${values.length}`,
      'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
      { keyType, valueCount: values.length, maxAllowed: config.attributes.length }
    )
  }

  // Validate each value matches its configured type
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const expectedType = config.attributes[i].type
    const attributeName = config.attributes[i].name

    if (expectedType === 'string' && typeof value !== 'string') {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute '${attributeName}' at index ${i} must be a string (got ${typeof value})`,
        'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
        { keyType, attributeName, attributeIndex: i, expectedType: 'string', actualType: typeof value }
      )
    }

    if (expectedType === 'number' && typeof value !== 'number') {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute '${attributeName}' at index ${i} must be a number (got ${typeof value})`,
        'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
        { keyType, attributeName, attributeIndex: i, expectedType: 'number', actualType: typeof value }
      )
    }

    if (expectedType === 'binary' && !(value instanceof Uint8Array)) {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute '${attributeName}' at index ${i} must be a Uint8Array (got ${typeof value})`,
        'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
        { keyType, attributeName, attributeIndex: i, expectedType: 'binary', actualType: typeof value }
      )
    }

    // Validate string is not empty
    if (expectedType === 'string' && typeof value === 'string' && value.trim() === '') {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute '${attributeName}' at index ${i} cannot be an empty string`,
        'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
        { keyType, attributeName, attributeIndex: i }
      )
    }

    // Validate number is finite
    if (expectedType === 'number' && typeof value === 'number' && !Number.isFinite(value)) {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute '${attributeName}' at index ${i} must be a finite number`,
        'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
        { keyType, attributeName, attributeIndex: i, value }
      )
    }

    // Validate binary is not empty
    if (expectedType === 'binary' && value instanceof Uint8Array && value.length === 0) {
      throw new DDBLibError(
        `Multi-attribute ${keyType} key attribute '${attributeName}' at index ${i} cannot be an empty Uint8Array`,
        'INVALID_MULTI_ATTRIBUTE_KEY_VALUES',
        { keyType, attributeName, attributeIndex: i }
      )
    }
  }
}

/**
 * Validate that multi-attribute sort key values are provided in left-to-right order
 * (no gaps in the sequence)
 * @param values - Array of values for the multi-attribute sort key
 * @param config - Multi-attribute key configuration
 * @throws {DDBLibError} If validation fails
 */
export function validateMultiAttributeSortKeyOrder(
  values: Array<string | number | Uint8Array>,
  config: MultiAttributeKey
): void {
  // For sort keys, we need to ensure values are provided in order without gaps
  // This is because DynamoDB requires left-to-right matching for multi-attribute sort keys

  if (values.length === 0) {
    return // Empty is valid (no sort key condition)
  }

  // Check that we're not skipping attributes
  // For example, if we have attributes [country, state, city], we can't provide [country, city]
  // We must provide [country] or [country, state] or [country, state, city]

  // This is implicitly validated by the array structure - if values are in an array,
  // they must be contiguous from index 0

  // Additional validation: ensure we're not providing more values than configured attributes
  if (values.length > config.attributes.length) {
    const providedCount = values.length
    const configuredCount = config.attributes.length
    throw new DDBLibError(
      `Multi-attribute sort key has too many values: provided ${providedCount} values but only ${configuredCount} attributes are configured`,
      'INVALID_MULTI_ATTRIBUTE_KEY_ORDER',
      { providedCount, configuredCount }
    )
  }
}
