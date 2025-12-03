/**
 * Tests for multi-attribute key helper functions
 */

import { describe, test, expect } from '@rstest/core'
import {
  multiAttributeKey,
  multiTenantKey,
  hierarchicalMultiKey,
  timeSeriesMultiKey,
  locationMultiKey,
  productCategoryMultiKey,
  statusPriorityMultiKey,
  versionMultiKey,
} from './multi-attribute-key-helpers'

describe('Multi-Attribute Key Helpers', () => {
  describe('multiAttributeKey', () => {
    test('should create key with string values', () => {
      const key = multiAttributeKey('value1', 'value2', 'value3')
      expect(key).toEqual(['value1', 'value2', 'value3'])
    })

    test('should create key with mixed types', () => {
      const key = multiAttributeKey('string', 123, 'another')
      expect(key).toEqual(['string', 123, 'another'])
    })

    test('should create key with binary data', () => {
      const binary = new Uint8Array([1, 2, 3])
      const key = multiAttributeKey('id', binary)
      expect(key).toEqual(['id', binary])
    })

    test('should create key with single value', () => {
      const key = multiAttributeKey('single')
      expect(key).toEqual(['single'])
    })
  })

  describe('multiTenantKey', () => {
    test('should create two-level tenant key', () => {
      const key = multiTenantKey('TENANT-123', 'CUSTOMER-456')
      expect(key).toEqual(['TENANT-123', 'CUSTOMER-456'])
    })

    test('should create three-level tenant key with department', () => {
      const key = multiTenantKey('TENANT-123', 'CUSTOMER-456', 'DEPT-A')
      expect(key).toEqual(['TENANT-123', 'CUSTOMER-456', 'DEPT-A'])
    })

    test('should handle undefined department', () => {
      const key = multiTenantKey('TENANT-123', 'CUSTOMER-456', undefined)
      expect(key).toEqual(['TENANT-123', 'CUSTOMER-456'])
    })
  })

  describe('hierarchicalMultiKey', () => {
    test('should create full four-level hierarchy', () => {
      const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco', 'Downtown')
      expect(key).toEqual(['USA', 'CA', 'San Francisco', 'Downtown'])
    })

    test('should create three-level hierarchy', () => {
      const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco')
      expect(key).toEqual(['USA', 'CA', 'San Francisco'])
    })

    test('should create two-level hierarchy', () => {
      const key = hierarchicalMultiKey('USA', 'CA')
      expect(key).toEqual(['USA', 'CA'])
    })

    test('should create single-level hierarchy', () => {
      const key = hierarchicalMultiKey('USA')
      expect(key).toEqual(['USA'])
    })

    test('should handle undefined levels', () => {
      const key = hierarchicalMultiKey('USA', 'CA', undefined, undefined)
      expect(key).toEqual(['USA', 'CA'])
    })
  })

  describe('timeSeriesMultiKey', () => {
    test('should create key with Date object', () => {
      const date = new Date('2025-12-02T00:00:00.000Z')
      const key = timeSeriesMultiKey('ERROR', date)

      expect(key).toHaveLength(2)
      expect(key[0]).toBe('ERROR')
      expect(typeof key[1]).toBe('number')
      expect(key[1]).toBe(date.getTime())
    })

    test('should create key with timestamp number', () => {
      const timestamp = 1733097600000
      const key = timeSeriesMultiKey('INFO', timestamp)

      expect(key).toEqual(['INFO', 1733097600000])
    })

    test('should create key with subcategory', () => {
      const timestamp = 1733097600000
      const key = timeSeriesMultiKey('ERROR', timestamp, 'DATABASE')

      expect(key).toEqual(['ERROR', 1733097600000, 'DATABASE'])
    })

    test('should handle undefined subcategory', () => {
      const timestamp = 1733097600000
      const key = timeSeriesMultiKey('WARNING', timestamp, undefined)

      expect(key).toEqual(['WARNING', 1733097600000])
    })
  })

  describe('locationMultiKey', () => {
    test('should create full location key', () => {
      const key = locationMultiKey('USA', 'CA', 'San Francisco', 'SOMA')
      expect(key).toEqual(['USA', 'CA', 'San Francisco', 'SOMA'])
    })

    test('should create country and state key', () => {
      const key = locationMultiKey('USA', 'CA')
      expect(key).toEqual(['USA', 'CA'])
    })

    test('should create country-only key', () => {
      const key = locationMultiKey('USA')
      expect(key).toEqual(['USA'])
    })

    test('should handle undefined values', () => {
      const key = locationMultiKey('USA', 'CA', undefined, undefined)
      expect(key).toEqual(['USA', 'CA'])
    })
  })

  describe('productCategoryMultiKey', () => {
    test('should create full product category key', () => {
      const key = productCategoryMultiKey('Electronics', 'Laptops', 'Apple', 'MacBook Pro')
      expect(key).toEqual(['Electronics', 'Laptops', 'Apple', 'MacBook Pro'])
    })

    test('should create category and subcategory key', () => {
      const key = productCategoryMultiKey('Electronics', 'Laptops')
      expect(key).toEqual(['Electronics', 'Laptops'])
    })

    test('should create category-only key', () => {
      const key = productCategoryMultiKey('Electronics')
      expect(key).toEqual(['Electronics'])
    })

    test('should handle undefined values', () => {
      const key = productCategoryMultiKey('Electronics', 'Laptops', undefined, undefined)
      expect(key).toEqual(['Electronics', 'Laptops'])
    })
  })

  describe('statusPriorityMultiKey', () => {
    test('should create key with numeric priority', () => {
      const key = statusPriorityMultiKey('PENDING', 1)
      expect(key).toEqual(['PENDING', 1])
    })

    test('should create key with string priority', () => {
      const key = statusPriorityMultiKey('ACTIVE', 'HIGH')
      expect(key).toEqual(['ACTIVE', 'HIGH'])
    })

    test('should create key with assignee', () => {
      const key = statusPriorityMultiKey('IN_PROGRESS', 2, 'USER-123')
      expect(key).toEqual(['IN_PROGRESS', 2, 'USER-123'])
    })

    test('should handle undefined assignee', () => {
      const key = statusPriorityMultiKey('COMPLETED', 3, undefined)
      expect(key).toEqual(['COMPLETED', 3])
    })
  })

  describe('versionMultiKey', () => {
    test('should create semantic version key', () => {
      const key = versionMultiKey(2, 1, 5)
      expect(key).toEqual([2, 1, 5])
    })

    test('should create version with build number', () => {
      const key = versionMultiKey(2, 1, 5, 'beta-3')
      expect(key).toEqual([2, 1, 5, 'beta-3'])
    })

    test('should create version with numeric build', () => {
      const key = versionMultiKey(2, 1, 5, 1234)
      expect(key).toEqual([2, 1, 5, 1234])
    })

    test('should create major version only', () => {
      const key = versionMultiKey(2)
      expect(key).toEqual([2])
    })

    test('should create major and minor version', () => {
      const key = versionMultiKey(2, 1)
      expect(key).toEqual([2, 1])
    })

    test('should handle undefined values', () => {
      const key = versionMultiKey(2, 1, undefined, undefined)
      expect(key).toEqual([2, 1])
    })
  })

  describe('Real-world usage examples', () => {
    test('should support multi-tenant SaaS application', () => {
      // Partition key: tenant + customer
      const pk = multiTenantKey('ACME-CORP', 'CUSTOMER-001')

      // Sort key: location hierarchy
      const sk = hierarchicalMultiKey('USA', 'CA', 'San Francisco')

      expect(pk).toEqual(['ACME-CORP', 'CUSTOMER-001'])
      expect(sk).toEqual(['USA', 'CA', 'San Francisco'])
    })

    test('should support event logging system', () => {
      // Partition key: category
      const pk = multiAttributeKey('ERROR')

      // Sort key: timestamp + priority
      const timestamp = new Date('2025-12-02').getTime()
      const sk = timeSeriesMultiKey('DATABASE', timestamp)

      expect(pk).toEqual(['ERROR'])
      expect(sk[0]).toBe('DATABASE')
      expect(sk[1]).toBe(timestamp)
    })

    test('should support e-commerce product catalog', () => {
      // Partition key: category hierarchy
      const pk = productCategoryMultiKey('Electronics', 'Laptops')

      // Sort key: brand + price range
      const sk = multiAttributeKey('Apple', 2000)

      expect(pk).toEqual(['Electronics', 'Laptops'])
      expect(sk).toEqual(['Apple', 2000])
    })

    test('should support task management system', () => {
      // Partition key: project + team
      const pk = multiTenantKey('PROJECT-A', 'TEAM-BACKEND')

      // Sort key: status + priority + assignee
      const sk = statusPriorityMultiKey('IN_PROGRESS', 1, 'USER-123')

      expect(pk).toEqual(['PROJECT-A', 'TEAM-BACKEND'])
      expect(sk).toEqual(['IN_PROGRESS', 1, 'USER-123'])
    })

    test('should support API versioning', () => {
      // Partition key: API name
      const pk = multiAttributeKey('users-api')

      // Sort key: version
      const sk = versionMultiKey(2, 1, 0)

      expect(pk).toEqual(['users-api'])
      expect(sk).toEqual([2, 1, 0])
    })
  })
})
