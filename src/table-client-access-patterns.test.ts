/**
 * Tests for access pattern execution in TableClient
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { AccessPatternDefinitions } from './types'

describe('TableClient - Access Patterns', () => {
  test('should throw error if access patterns not configured', async () => {
    const client = new TableClient({
      tableName: 'test-table',
    })

    try {
      await client.executePattern('somePattern', {})
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Access patterns not configured')
    }
  })

  test('should throw error if pattern not found', async () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUserById: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    try {
      await client.executePattern('nonExistentPattern', {})
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain("Access pattern 'nonExistentPattern' not found")
      expect(error.message).toContain('getUserById')
    }
  })

  test('should define access pattern with partition key only', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUserById: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    expect(client).toBeDefined()

    // Test that the pattern function works correctly
    const pattern = accessPatterns.getUserById
    const keyCondition = pattern.keyCondition({ userId: '123' })
    expect(keyCondition.pk).toBe('USER#123')
  })

  test('should define access pattern with sort key condition', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUserOrders: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { beginsWith: 'ORDER#' },
        }),
      },
    }

    const pattern = accessPatterns.getUserOrders
    const keyCondition = pattern.keyCondition({ userId: '123' })

    expect(keyCondition.pk).toBe('USER#123')
    expect(keyCondition.sk).toEqual({ beginsWith: 'ORDER#' })
  })

  test('should define access pattern with GSI index', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getOrdersByStatus: {
        index: 'GSI1',
        keyCondition: (params: { status: string }) => ({
          pk: `STATUS#${params.status}`,
        }),
      },
    }

    const pattern = accessPatterns.getOrdersByStatus
    expect(pattern.index).toBe('GSI1')

    const keyCondition = pattern.keyCondition({ status: 'PENDING' })
    expect(keyCondition.pk).toBe('STATUS#PENDING')
  })

  test('should define access pattern with filter expression', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getHighValueOrders: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { beginsWith: 'ORDER#' },
        }),
        filter: (params: { minAmount: number }) => ({
          amount: { gte: params.minAmount },
        }),
      },
    }

    const pattern = accessPatterns.getHighValueOrders
    expect(pattern.filter).toBeDefined()

    const filter = pattern.filter!({ minAmount: 300 })
    expect(filter.amount).toEqual({ gte: 300 })
  })

  test('should define access pattern with transform function', () => {
    interface Order {
      pk: string
      sk: string
      amount: number
    }

    interface OrderSummary {
      orderId: string
      amount: number
    }

    const accessPatterns: AccessPatternDefinitions<Order> = {
      getUserOrderSummaries: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { beginsWith: 'ORDER#' },
        }),
        transform: (items: Order[]): OrderSummary[] => {
          return items.map((item) => ({
            orderId: item.sk.replace('ORDER#', ''),
            amount: item.amount,
          }))
        },
      },
    }

    const pattern = accessPatterns.getUserOrderSummaries
    expect(pattern.transform).toBeDefined()

    const mockItems: Order[] = [
      { pk: 'USER#123', sk: 'ORDER#001', amount: 100 },
      { pk: 'USER#123', sk: 'ORDER#002', amount: 200 },
    ]

    const transformed = pattern.transform!(mockItems)
    expect(transformed).toEqual([
      { orderId: '001', amount: 100 },
      { orderId: '002', amount: 200 },
    ])
  })

  test('should define access pattern with date-based sort key', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getRecentOrders: {
        keyCondition: (params: { userId: string; dateFrom: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { gte: params.dateFrom },
        }),
      },
    }

    const pattern = accessPatterns.getRecentOrders
    const keyCondition = pattern.keyCondition({
      userId: '123',
      dateFrom: '2025-12-01',
    })

    expect(keyCondition.pk).toBe('USER#123')
    expect(keyCondition.sk).toEqual({ gte: '2025-12-01' })
  })

  test('should define access pattern with between condition', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getOrdersInRange: {
        keyCondition: (params: { userId: string; startDate: string; endDate: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { between: [params.startDate, params.endDate] },
        }),
      },
    }

    const pattern = accessPatterns.getOrdersInRange
    const keyCondition = pattern.keyCondition({
      userId: '123',
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    })

    expect(keyCondition.pk).toBe('USER#123')
    expect(keyCondition.sk).toEqual({ between: ['2025-12-01', '2025-12-31'] })
  })

  test('should define multiple patterns on same client', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUserById: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
        }),
      },
      getUserOrders: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { beginsWith: 'ORDER#' },
        }),
      },
      getOrdersByStatus: {
        index: 'GSI1',
        keyCondition: (params: { status: string }) => ({
          pk: `STATUS#${params.status}`,
        }),
      },
    }

    const client = new TableClient({
      tableName: 'test-table',
      accessPatterns,
    })

    expect(client).toBeDefined()
    expect(Object.keys(accessPatterns)).toHaveLength(3)
  })

  test('should define access pattern with GSI config for multi-attribute keys', () => {
    const accessPatterns: AccessPatternDefinitions<any> = {
      getUsersByLocation: {
        index: 'LocationIndex',
        gsiConfig: {
          indexName: 'LocationIndex',
          partitionKey: {
            attributes: [
              { name: 'tenantId', type: 'string' },
              { name: 'customerId', type: 'string' },
            ],
          },
          sortKey: {
            attributes: [
              { name: 'country', type: 'string' },
              { name: 'state', type: 'string' },
            ],
          },
        },
        keyCondition: (params: { tenantId: string; customerId: string }) => ({
          multiPk: [params.tenantId, params.customerId],
        }),
      },
    }

    const pattern = accessPatterns.getUsersByLocation
    expect(pattern.gsiConfig).toBeDefined()
    expect(pattern.gsiConfig?.indexName).toBe('LocationIndex')

    const keyCondition = pattern.keyCondition({
      tenantId: 'TENANT-123',
      customerId: 'CUST-456',
    })

    expect(keyCondition.multiPk).toEqual(['TENANT-123', 'CUST-456'])
  })
})
