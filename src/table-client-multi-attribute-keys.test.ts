/**
 * Integration tests for multi-attribute composite keys in query operations
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import { KeyConditionBuilder } from './expression-builders'
import type { KeyCondition, AccessPatternDefinitions } from './types'

describe('TableClient - Multi-Attribute Keys Integration', () => {
  describe('KeyConditionBuilder with multi-attribute keys', () => {
    test('should build query with multi-attribute partition key', () => {
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT-123', 'CUSTOMER-456'],
      }

      const builder = new KeyConditionBuilder()
      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk0',
        '#k1': 'pk1',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT-123',
        ':k1': 'CUSTOMER-456',
      })
    })

    test('should build query with multi-attribute partition and sort keys', () => {
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT-123', 'CUSTOMER-456'],
        multiSk: ['USA', 'CA'],
      }

      const builder = new KeyConditionBuilder()
      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1 AND #k2 = :k2 AND #k3 = :k3')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk0',
        '#k1': 'pk1',
        '#k2': 'sk0',
        '#k3': 'sk1',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT-123',
        ':k1': 'CUSTOMER-456',
        ':k2': 'USA',
        ':k3': 'CA',
      })
    })

    test('should build query with multi-attribute sort key comparison', () => {
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT-123'],
        multiSk: { gte: ['USA', 'CA'] },
      }

      const builder = new KeyConditionBuilder()
      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1 AND #k2 >= :k2')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk0',
        '#k1': 'sk0',
        '#k2': 'sk1',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT-123',
        ':k1': 'USA',
        ':k2': 'CA',
      })
    })

    test('should support partial multi-attribute sort key matching', () => {
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT-123'],
        multiSk: ['USA'], // Only first attribute
      }

      const builder = new KeyConditionBuilder()
      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk0',
        '#k1': 'sk0',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT-123',
        ':k1': 'USA',
      })
    })

    test('should support all comparison operators on multi-attribute sort keys', () => {
      const operators = ['lt', 'lte', 'gt', 'gte'] as const

      for (const operator of operators) {
        const keyCondition: KeyCondition = {
          multiPk: ['TENANT-123'],
          multiSk: { [operator]: ['USA', 'CA'] },
        }

        const builder = new KeyConditionBuilder()
        const result = builder.build(keyCondition)

        expect(result.expression).toContain(operator === 'lt' ? '<' : operator === 'lte' ? '<=' : operator === 'gt' ? '>' : '>=')
        expect(result.attributeNames).toEqual({
          '#k0': 'pk0',
          '#k1': 'sk0',
          '#k2': 'sk1',
        })
      }
    })

    test('should support between operator on multi-attribute sort keys', () => {
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT-123'],
        multiSk: {
          between: [
            ['USA', 'CA'],
            ['USA', 'NY'],
          ],
        },
      }

      const builder = new KeyConditionBuilder()
      const result = builder.build(keyCondition)

      expect(result.expression).toContain('BETWEEN')
      expect(result.attributeNames['#k0']).toBe('pk0')
      expect(result.attributeNames['#k1']).toBe('sk0')
    })
  })

  describe('Access patterns with multi-attribute keys', () => {
    test('should define access pattern with multi-attribute partition key', () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUsersByTenant: {
          index: 'TenantIndex',
          gsiConfig: {
            indexName: 'TenantIndex',
            partitionKey: {
              attributes: [
                { name: 'tenantId', type: 'string' },
                { name: 'customerId', type: 'string' },
              ],
            },
          },
          keyCondition: (params: { tenantId: string; customerId: string }) => ({
            multiPk: [params.tenantId, params.customerId],
          }),
        },
      }

      const client = new TableClient({
        tableName: 'test-table',
        accessPatterns,
      })

      expect(client).toBeDefined()

      const pattern = accessPatterns.getUsersByTenant
      const keyCondition = pattern.keyCondition({
        tenantId: 'TENANT-123',
        customerId: 'CUSTOMER-456',
      })

      expect(keyCondition.multiPk).toEqual(['TENANT-123', 'CUSTOMER-456'])
    })

    test('should define access pattern with multi-attribute sort key', () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUsersByLocation: {
          index: 'LocationIndex',
          gsiConfig: {
            indexName: 'LocationIndex',
            partitionKey: {
              attributes: [
                { name: 'tenantId', type: 'string' },
              ],
            },
            sortKey: {
              attributes: [
                { name: 'country', type: 'string' },
                { name: 'state', type: 'string' },
                { name: 'city', type: 'string' },
              ],
            },
          },
          keyCondition: (params: {
            tenantId: string
            country?: string
            state?: string
            city?: string
          }) => {
            const multiSk: Array<string> = []
            if (params.country) multiSk.push(params.country)
            if (params.state) multiSk.push(params.state)
            if (params.city) multiSk.push(params.city)

            return {
              multiPk: [params.tenantId],
              multiSk: multiSk.length > 0 ? multiSk : undefined,
            }
          },
        },
      }

      const pattern = accessPatterns.getUsersByLocation

      // Test with all location attributes
      const fullLocation = pattern.keyCondition({
        tenantId: 'TENANT-123',
        country: 'USA',
        state: 'CA',
        city: 'San Francisco',
      })

      expect(fullLocation.multiPk).toEqual(['TENANT-123'])
      expect(fullLocation.multiSk).toEqual(['USA', 'CA', 'San Francisco'])

      // Test with partial location (country only)
      const partialLocation = pattern.keyCondition({
        tenantId: 'TENANT-123',
        country: 'USA',
      })

      expect(partialLocation.multiPk).toEqual(['TENANT-123'])
      expect(partialLocation.multiSk).toEqual(['USA'])

      // Test with no location
      const noLocation = pattern.keyCondition({
        tenantId: 'TENANT-123',
      })

      expect(noLocation.multiPk).toEqual(['TENANT-123'])
      expect(noLocation.multiSk).toBeUndefined()
    })

    test('should support mixed single and multi-attribute keys', () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        // Traditional single-attribute pattern
        getUserById: {
          keyCondition: (params: { userId: string }) => ({
            pk: `USER#${params.userId}`,
          }),
        },
        // Multi-attribute pattern
        getUsersByTenant: {
          index: 'TenantIndex',
          keyCondition: (params: { tenantId: string; customerId: string }) => ({
            multiPk: [params.tenantId, params.customerId],
          }),
        },
      }

      const client = new TableClient({
        tableName: 'test-table',
        accessPatterns,
      })

      expect(client).toBeDefined()

      // Both patterns should work
      const singleKeyPattern = accessPatterns.getUserById
      const singleKeyCondition = singleKeyPattern.keyCondition({ userId: '123' })
      expect(singleKeyCondition.pk).toBe('USER#123')

      const multiKeyPattern = accessPatterns.getUsersByTenant
      const multiKeyCondition = multiKeyPattern.keyCondition({
        tenantId: 'TENANT-123',
        customerId: 'CUSTOMER-456',
      })
      expect(multiKeyCondition.multiPk).toEqual(['TENANT-123', 'CUSTOMER-456'])
    })

    test('should support time-series pattern with multi-attribute keys', () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getEventsByCategory: {
          index: 'EventIndex',
          gsiConfig: {
            indexName: 'EventIndex',
            partitionKey: {
              attributes: [
                { name: 'category', type: 'string' },
              ],
            },
            sortKey: {
              attributes: [
                { name: 'timestamp', type: 'number' },
                { name: 'priority', type: 'number' },
              ],
            },
          },
          keyCondition: (params: {
            category: string
            timestampFrom?: number
            priority?: number
          }) => {
            const result: KeyCondition = {
              multiPk: [params.category],
            }

            if (params.timestampFrom !== undefined) {
              if (params.priority !== undefined) {
                result.multiSk = { gte: [params.timestampFrom, params.priority] }
              } else {
                result.multiSk = { gte: [params.timestampFrom] }
              }
            }

            return result
          },
        },
      }

      const pattern = accessPatterns.getEventsByCategory

      // Query with timestamp and priority
      const withBoth = pattern.keyCondition({
        category: 'ERROR',
        timestampFrom: 1234567890,
        priority: 1,
      })

      expect(withBoth.multiPk).toEqual(['ERROR'])
      expect(withBoth.multiSk).toEqual({ gte: [1234567890, 1] })

      // Query with timestamp only
      const withTimestamp = pattern.keyCondition({
        category: 'ERROR',
        timestampFrom: 1234567890,
      })

      expect(withTimestamp.multiPk).toEqual(['ERROR'])
      expect(withTimestamp.multiSk).toEqual({ gte: [1234567890] })

      // Query with category only
      const categoryOnly = pattern.keyCondition({
        category: 'ERROR',
      })

      expect(categoryOnly.multiPk).toEqual(['ERROR'])
      expect(categoryOnly.multiSk).toBeUndefined()
    })
  })

  describe('Backward compatibility', () => {
    test('should support traditional single-attribute keys', () => {
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: { beginsWith: 'ORDER#' },
      }

      const builder = new KeyConditionBuilder()
      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND begins_with(#k1, :k1)')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk',
        '#k1': 'sk',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'USER#123',
        ':k1': 'ORDER#',
      })
    })

    test('should not interfere with existing single-attribute patterns', () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserOrders: {
          keyCondition: (params: { userId: string }) => ({
            pk: `USER#${params.userId}`,
            sk: { beginsWith: 'ORDER#' },
          }),
        },
      }

      const client = new TableClient({
        tableName: 'test-table',
        accessPatterns,
      })

      expect(client).toBeDefined()

      const pattern = accessPatterns.getUserOrders
      const keyCondition = pattern.keyCondition({ userId: '123' })

      expect(keyCondition.pk).toBe('USER#123')
      expect(keyCondition.sk).toEqual({ beginsWith: 'ORDER#' })
    })
  })
})
