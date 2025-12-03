/**
 * Tests for type guards
 */

import { describe, test, expect } from '@rstest/core'
import {
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
import type { KeyCondition, MultiAttributeKey, GSIConfig } from './types'

describe('Type Guards', () => {
  describe('isMultiAttributeKey', () => {
    test('should return true for valid MultiAttributeKey', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'tenantId', type: 'string' },
          { name: 'customerId', type: 'string' },
        ],
      }

      expect(isMultiAttributeKey(key)).toBe(true)
    })

    test('should return true for MultiAttributeKey with different types', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'id', type: 'string' },
          { name: 'timestamp', type: 'number' },
          { name: 'data', type: 'binary' },
        ],
      }

      expect(isMultiAttributeKey(key)).toBe(true)
    })

    test('should return false for string', () => {
      expect(isMultiAttributeKey('pk')).toBe(false)
    })

    test('should return false for null', () => {
      expect(isMultiAttributeKey(null)).toBe(false)
    })

    test('should return false for object without attributes', () => {
      expect(isMultiAttributeKey({ name: 'test' })).toBe(false)
    })

    test('should return false for object with non-array attributes', () => {
      expect(isMultiAttributeKey({ attributes: 'not-array' })).toBe(false)
    })

    test('should return false for object with invalid attribute type', () => {
      const key = {
        attributes: [{ name: 'id', type: 'invalid' }],
      }

      expect(isMultiAttributeKey(key)).toBe(false)
    })

    test('should return false for object with missing attribute name', () => {
      const key = {
        attributes: [{ type: 'string' }],
      }

      expect(isMultiAttributeKey(key)).toBe(false)
    })
  })

  describe('hasMultiAttributePartitionKey', () => {
    test('should return true for KeyCondition with multiPk', () => {
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT-123', 'CUSTOMER-456'],
      }

      expect(hasMultiAttributePartitionKey(keyCondition)).toBe(true)
    })

    test('should return false for KeyCondition with single pk', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
      }

      expect(hasMultiAttributePartitionKey(keyCondition)).toBe(false)
    })

    test('should return false for empty KeyCondition', () => {
      const keyCondition: KeyCondition = {}

      expect(hasMultiAttributePartitionKey(keyCondition)).toBe(false)
    })
  })

  describe('hasMultiAttributeSortKey', () => {
    test('should return true for KeyCondition with multiSk array', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        multiSk: ['USA', 'CA', 'San Francisco'],
      }

      expect(hasMultiAttributeSortKey(keyCondition)).toBe(true)
    })

    test('should return true for KeyCondition with multiSk condition', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        multiSk: { eq: ['USA', 'CA'] },
      }

      expect(hasMultiAttributeSortKey(keyCondition)).toBe(true)
    })

    test('should return false for KeyCondition with single sk', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: 'PROFILE',
      }

      expect(hasMultiAttributeSortKey(keyCondition)).toBe(false)
    })

    test('should return false for KeyCondition without sort key', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
      }

      expect(hasMultiAttributeSortKey(keyCondition)).toBe(false)
    })
  })

  describe('hasSingleAttributeKeys', () => {
    test('should return true for KeyCondition with pk', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
      }

      expect(hasSingleAttributeKeys(keyCondition)).toBe(true)
    })

    test('should return true for KeyCondition with pk and sk', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: 'PROFILE',
      }

      expect(hasSingleAttributeKeys(keyCondition)).toBe(true)
    })

    test('should return true for KeyCondition with only sk', () => {
      const keyCondition: KeyCondition = {
        sk: 'PROFILE',
      }

      expect(hasSingleAttributeKeys(keyCondition)).toBe(true)
    })

    test('should return false for KeyCondition with only multiPk', () => {
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT-123', 'CUSTOMER-456'],
      }

      expect(hasSingleAttributeKeys(keyCondition)).toBe(false)
    })
  })

  describe('isMultiAttributePartitionKey', () => {
    test('should return true for MultiAttributeKey', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'tenantId', type: 'string' },
          { name: 'customerId', type: 'string' },
        ],
      }

      expect(isMultiAttributePartitionKey(key)).toBe(true)
    })

    test('should return false for string', () => {
      expect(isMultiAttributePartitionKey('pk')).toBe(false)
    })
  })

  describe('isMultiAttributeSortKey', () => {
    test('should return true for MultiAttributeKey', () => {
      const key: MultiAttributeKey = {
        attributes: [
          { name: 'country', type: 'string' },
          { name: 'state', type: 'string' },
        ],
      }

      expect(isMultiAttributeSortKey(key)).toBe(true)
    })

    test('should return false for string', () => {
      expect(isMultiAttributeSortKey('sk')).toBe(false)
    })

    test('should return false for undefined', () => {
      expect(isMultiAttributeSortKey(undefined)).toBe(false)
    })
  })

  describe('gsiHasMultiAttributePartitionKey', () => {
    test('should return true for GSIConfig with multi-attribute partition key', () => {
      const gsiConfig: GSIConfig = {
        indexName: 'GSI1',
        partitionKey: {
          attributes: [
            { name: 'tenantId', type: 'string' },
            { name: 'customerId', type: 'string' },
          ],
        },
      }

      expect(gsiHasMultiAttributePartitionKey(gsiConfig)).toBe(true)
    })

    test('should return false for GSIConfig with single-attribute partition key', () => {
      const gsiConfig: GSIConfig = {
        indexName: 'GSI1',
        partitionKey: 'gsi1pk',
      }

      expect(gsiHasMultiAttributePartitionKey(gsiConfig)).toBe(false)
    })
  })

  describe('gsiHasMultiAttributeSortKey', () => {
    test('should return true for GSIConfig with multi-attribute sort key', () => {
      const gsiConfig: GSIConfig = {
        indexName: 'GSI1',
        partitionKey: 'gsi1pk',
        sortKey: {
          attributes: [
            { name: 'country', type: 'string' },
            { name: 'state', type: 'string' },
          ],
        },
      }

      expect(gsiHasMultiAttributeSortKey(gsiConfig)).toBe(true)
    })

    test('should return false for GSIConfig with single-attribute sort key', () => {
      const gsiConfig: GSIConfig = {
        indexName: 'GSI1',
        partitionKey: 'gsi1pk',
        sortKey: 'gsi1sk',
      }

      expect(gsiHasMultiAttributeSortKey(gsiConfig)).toBe(false)
    })

    test('should return false for GSIConfig without sort key', () => {
      const gsiConfig: GSIConfig = {
        indexName: 'GSI1',
        partitionKey: 'gsi1pk',
      }

      expect(gsiHasMultiAttributeSortKey(gsiConfig)).toBe(false)
    })
  })

  describe('isMultiAttributeSortKeyArray', () => {
    test('should return true for array', () => {
      const multiSk = ['USA', 'CA', 'San Francisco']

      expect(isMultiAttributeSortKeyArray(multiSk)).toBe(true)
    })

    test('should return false for object', () => {
      const multiSk = { eq: ['USA', 'CA'] }

      expect(isMultiAttributeSortKeyArray(multiSk)).toBe(false)
    })
  })

  describe('isMultiAttributeSortKeyCondition', () => {
    test('should return true for object with operators', () => {
      const multiSk = { eq: ['USA', 'CA'] }

      expect(isMultiAttributeSortKeyCondition(multiSk)).toBe(true)
    })

    test('should return true for object with comparison operators', () => {
      const multiSk = { gte: ['USA', 'CA'] }

      expect(isMultiAttributeSortKeyCondition(multiSk)).toBe(true)
    })

    test('should return false for array', () => {
      const multiSk = ['USA', 'CA']

      expect(isMultiAttributeSortKeyCondition(multiSk)).toBe(false)
    })

    test('should return false for null', () => {
      expect(isMultiAttributeSortKeyCondition(null as any)).toBe(false)
    })
  })
})
