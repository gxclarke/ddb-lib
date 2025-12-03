/**
 * Tests for multi-attribute key validation
 */

import { describe, test, expect } from '@rstest/core'
import {
  validateMultiAttributeKeyConfig,
  validateMultiAttributeKeyValues,
  validateMultiAttributeSortKeyOrder,
  MAX_MULTI_ATTRIBUTE_KEY_LENGTH,
} from './multi-attribute-key-validator'
import type { MultiAttributeKey } from './types'

describe('Multi-Attribute Key Validator', () => {
  describe('validateMultiAttributeKeyConfig', () => {
    test('should validate valid multi-attribute key config', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'tenantId', type: 'string' },
          { name: 'customerId', type: 'string' },
        ],
      }

      expect(() => validateMultiAttributeKeyConfig(key, 'partition')).not.toThrow()
    })

    test('should validate config with all supported types', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'id', type: 'string' },
          { name: 'timestamp', type: 'number' },
          { name: 'data', type: 'binary' },
        ],
      }

      expect(() => validateMultiAttributeKeyConfig(key, 'sort')).not.toThrow()
    })

    test('should validate config with maximum attributes', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'attr1', type: 'string' },
          { name: 'attr2', type: 'string' },
          { name: 'attr3', type: 'string' },
          { name: 'attr4', type: 'string' },
        ],
      }

      expect(() => validateMultiAttributeKeyConfig(key, 'partition')).not.toThrow()
    })

    test('should throw error for empty attributes array', () => {
      const key: MultiAttributeKey = {
        attributes: [],
      }

      try {
        validateMultiAttributeKeyConfig(key, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must have at least one attribute')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY')
      }
    })

    test('should throw error for too many attributes', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'attr1', type: 'string' },
          { name: 'attr2', type: 'string' },
          { name: 'attr3', type: 'string' },
          { name: 'attr4', type: 'string' },
          { name: 'attr5', type: 'string' },
        ],
      }

      try {
        validateMultiAttributeKeyConfig(key, 'sort')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain(`cannot have more than ${MAX_MULTI_ATTRIBUTE_KEY_LENGTH}`)
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY')
      }
    })

    test('should throw error for empty attribute name', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: '', type: 'string' },
        ],
      }

      try {
        validateMultiAttributeKeyConfig(key, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must have a non-empty name')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY')
      }
    })

    test('should throw error for whitespace-only attribute name', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: '   ', type: 'string' },
        ],
      }

      try {
        validateMultiAttributeKeyConfig(key, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must have a non-empty name')
      }
    })

    test('should throw error for invalid attribute type', () => {
      const key: any = {
        attributes: [
          { name: 'id', type: 'invalid' },
        ],
      }

      try {
        validateMultiAttributeKeyConfig(key, 'sort')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("must have type 'string', 'number', or 'binary'")
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY')
      }
    })

    test('should throw error for duplicate attribute names', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'id', type: 'string' },
          { name: 'id', type: 'number' },
        ],
      }

      try {
        validateMultiAttributeKeyConfig(key, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('duplicate attribute names')
        expect(error.message).toContain('id')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY')
      }
    })
  })

  describe('validateMultiAttributeKeyValues', () => {
    const config: MultiAttributeKey = {
      attributes: [
        { name: 'tenantId', type: 'string' },
        { name: 'customerId', type: 'string' },
        { name: 'timestamp', type: 'number' },
      ],
    }

    test('should validate correct values', () => {
      const values = ['TENANT-123', 'CUSTOMER-456', 1234567890]

      expect(() => validateMultiAttributeKeyValues(values, config, 'partition')).not.toThrow()
    })

    test('should validate partial values (for sort keys)', () => {
      const values = ['TENANT-123', 'CUSTOMER-456']

      expect(() => validateMultiAttributeKeyValues(values, config, 'sort')).not.toThrow()
    })

    test('should validate single value', () => {
      const values = ['TENANT-123']

      expect(() => validateMultiAttributeKeyValues(values, config, 'partition')).not.toThrow()
    })

    test('should throw error for empty values array', () => {
      const values: any[] = []

      try {
        validateMultiAttributeKeyValues(values, config, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must have at least one value')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })

    test('should throw error for too many values', () => {
      const values = ['TENANT-123', 'CUSTOMER-456', 1234567890, 'EXTRA']

      try {
        validateMultiAttributeKeyValues(values, config, 'sort')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('too many values')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })

    test('should throw error for wrong type (string instead of number)', () => {
      const values = ['TENANT-123', 'CUSTOMER-456', 'not-a-number']

      try {
        validateMultiAttributeKeyValues(values as any, config, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must be a number')
        expect(error.message).toContain('timestamp')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })

    test('should throw error for wrong type (number instead of string)', () => {
      const values = [123, 'CUSTOMER-456', 1234567890]

      try {
        validateMultiAttributeKeyValues(values as any, config, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must be a string')
        expect(error.message).toContain('tenantId')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })

    test('should throw error for empty string', () => {
      const values = ['', 'CUSTOMER-456', 1234567890]

      try {
        validateMultiAttributeKeyValues(values, config, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('cannot be an empty string')
        expect(error.message).toContain('tenantId')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })

    test('should throw error for whitespace-only string', () => {
      const values = ['   ', 'CUSTOMER-456', 1234567890]

      try {
        validateMultiAttributeKeyValues(values, config, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('cannot be an empty string')
      }
    })

    test('should throw error for non-finite number', () => {
      const values = ['TENANT-123', 'CUSTOMER-456', Number.POSITIVE_INFINITY]

      try {
        validateMultiAttributeKeyValues(values, config, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must be a finite number')
        expect(error.message).toContain('timestamp')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })

    test('should throw error for NaN', () => {
      const values = ['TENANT-123', 'CUSTOMER-456', Number.NaN]

      try {
        validateMultiAttributeKeyValues(values, config, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must be a finite number')
      }
    })

    test('should validate binary type', () => {
      const binaryConfig: MultiAttributeKey = {
        attributes: [
          { name: 'id', type: 'string' },
          { name: 'data', type: 'binary' },
        ],
      }

      const values = ['ID-123', new Uint8Array([1, 2, 3, 4])]

      expect(() => validateMultiAttributeKeyValues(values, binaryConfig, 'partition')).not.toThrow()
    })

    test('should throw error for wrong binary type', () => {
      const binaryConfig: MultiAttributeKey = {
        attributes: [
          { name: 'id', type: 'string' },
          { name: 'data', type: 'binary' },
        ],
      }

      const values = ['ID-123', 'not-binary']

      try {
        validateMultiAttributeKeyValues(values as any, binaryConfig, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('must be a Uint8Array')
        expect(error.message).toContain('data')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })

    test('should throw error for empty Uint8Array', () => {
      const binaryConfig: MultiAttributeKey = {
        attributes: [
          { name: 'id', type: 'string' },
          { name: 'data', type: 'binary' },
        ],
      }

      const values = ['ID-123', new Uint8Array([])]

      try {
        validateMultiAttributeKeyValues(values, binaryConfig, 'partition')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('cannot be an empty Uint8Array')
        expect(error.message).toContain('data')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_VALUES')
      }
    })
  })

  describe('validateMultiAttributeSortKeyOrder', () => {
    const config: MultiAttributeKey = {
      attributes: [
        { name: 'country', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'city', type: 'string' },
      ],
    }

    test('should validate empty values (no sort key condition)', () => {
      const values: any[] = []

      expect(() => validateMultiAttributeSortKeyOrder(values, config)).not.toThrow()
    })

    test('should validate single value', () => {
      const values = ['USA']

      expect(() => validateMultiAttributeSortKeyOrder(values, config)).not.toThrow()
    })

    test('should validate two values', () => {
      const values = ['USA', 'CA']

      expect(() => validateMultiAttributeSortKeyOrder(values, config)).not.toThrow()
    })

    test('should validate all values', () => {
      const values = ['USA', 'CA', 'San Francisco']

      expect(() => validateMultiAttributeSortKeyOrder(values, config)).not.toThrow()
    })

    test('should throw error for too many values', () => {
      const values = ['USA', 'CA', 'San Francisco', 'Extra']

      try {
        validateMultiAttributeSortKeyOrder(values, config)
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('too many values')
        expect(error.code).toBe('INVALID_MULTI_ATTRIBUTE_KEY_ORDER')
      }
    })
  })
})
