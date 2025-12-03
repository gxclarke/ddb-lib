/**
 * End-to-end integration tests for access patterns with DynamoDB Local
 */

import { describe, it, expect, beforeAll, afterAll } from '@rstest/core'
import { TableClient } from '../table-client'
import {
  setupTestTableWithData,
  type TestTableConfig,
} from '../test-utils/dynamodb-local'
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type { AccessPatternDefinitions } from '../types'
import { PatternHelpers } from '../pattern-helpers'

describe('Access Patterns Integration Tests', () => {
  let client: DynamoDBClient
  let cleanup: () => Promise<void>
  const tableName = 'integration-access-patterns-test'

  beforeAll(async () => {
    const config: TestTableConfig = {
      tableName,
      partitionKey: { name: 'pk', type: 'S' },
      sortKey: { name: 'sk', type: 'S' },
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1',
          partitionKey: { name: 'gsi1pk', type: 'S' },
          sortKey: { name: 'gsi1sk', type: 'S' },
        },
        {
          indexName: 'GSI2',
          partitionKey: { name: 'gsi2pk', type: 'S' },
          sortKey: { name: 'gsi2sk', type: 'N' },
        },
      ],
    }

    // Seed test data for single-table design
    const testData = [
      // Users
      {
        pk: PatternHelpers.entityKey('USER', '1'),
        sk: 'PROFILE',
        gsi1pk: 'USER',
        gsi1sk: PatternHelpers.entityKey('USER', '1'),
        name: 'Alice',
        email: 'alice@example.com',
        status: 'active',
      },
      {
        pk: PatternHelpers.entityKey('USER', '2'),
        sk: 'PROFILE',
        gsi1pk: 'USER',
        gsi1sk: PatternHelpers.entityKey('USER', '2'),
        name: 'Bob',
        email: 'bob@example.com',
        status: 'active',
      },
      {
        pk: PatternHelpers.entityKey('USER', '3'),
        sk: 'PROFILE',
        gsi1pk: 'USER',
        gsi1sk: PatternHelpers.entityKey('USER', '3'),
        name: 'Charlie',
        email: 'charlie@example.com',
        status: 'inactive',
      },
      // Orders for User 1
      {
        pk: PatternHelpers.entityKey('USER', '1'),
        sk: PatternHelpers.entityKey('ORDER', '101'),
        gsi1pk: PatternHelpers.entityKey('ORDER', '101'),
        gsi1sk: '2024-01-01',
        gsi2pk: 'STATUS#pending',
        gsi2sk: 100,
        orderId: '101',
        userId: '1',
        amount: 100,
        status: 'pending',
        createdAt: '2024-01-01',
      },
      {
        pk: PatternHelpers.entityKey('USER', '1'),
        sk: PatternHelpers.entityKey('ORDER', '102'),
        gsi1pk: PatternHelpers.entityKey('ORDER', '102'),
        gsi1sk: '2024-01-02',
        gsi2pk: 'STATUS#completed',
        gsi2sk: 200,
        orderId: '102',
        userId: '1',
        amount: 200,
        status: 'completed',
        createdAt: '2024-01-02',
      },
      {
        pk: PatternHelpers.entityKey('USER', '1'),
        sk: PatternHelpers.entityKey('ORDER', '103'),
        gsi1pk: PatternHelpers.entityKey('ORDER', '103'),
        gsi1sk: '2024-01-03',
        gsi2pk: 'STATUS#pending',
        gsi2sk: 150,
        orderId: '103',
        userId: '1',
        amount: 150,
        status: 'pending',
        createdAt: '2024-01-03',
      },
      // Orders for User 2
      {
        pk: PatternHelpers.entityKey('USER', '2'),
        sk: PatternHelpers.entityKey('ORDER', '201'),
        gsi1pk: PatternHelpers.entityKey('ORDER', '201'),
        gsi1sk: '2024-01-01',
        gsi2pk: 'STATUS#completed',
        gsi2sk: 300,
        orderId: '201',
        userId: '2',
        amount: 300,
        status: 'completed',
        createdAt: '2024-01-01',
      },
      // Products
      {
        pk: PatternHelpers.entityKey('PRODUCT', '1'),
        sk: 'DETAILS',
        gsi1pk: 'CATEGORY#electronics',
        gsi1sk: PatternHelpers.entityKey('PRODUCT', '1'),
        productId: '1',
        name: 'Laptop',
        category: 'electronics',
        price: 999,
      },
      {
        pk: PatternHelpers.entityKey('PRODUCT', '2'),
        sk: 'DETAILS',
        gsi1pk: 'CATEGORY#electronics',
        gsi1sk: PatternHelpers.entityKey('PRODUCT', '2'),
        productId: '2',
        name: 'Mouse',
        category: 'electronics',
        price: 29,
      },
      {
        pk: PatternHelpers.entityKey('PRODUCT', '3'),
        sk: 'DETAILS',
        gsi1pk: 'CATEGORY#books',
        gsi1sk: PatternHelpers.entityKey('PRODUCT', '3'),
        productId: '3',
        name: 'TypeScript Book',
        category: 'books',
        price: 49,
      },
    ]

    const setup = await setupTestTableWithData(config, testData)
    client = setup.client
    cleanup = setup.cleanup
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('Named access patterns', () => {
    it('should execute getUserById pattern', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserById: {
          keyCondition: (params: { userId: string }) => ({
            pk: PatternHelpers.entityKey('USER', params.userId),
            sk: { eq: 'PROFILE' },
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const results = await table.executePattern('getUserById', {
        userId: '1',
      })

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Alice')
    })

    it('should execute getUserOrders pattern', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserOrders: {
          keyCondition: (params: { userId: string }) => ({
            pk: PatternHelpers.entityKey('USER', params.userId),
            sk: { beginsWith: 'ORDER#' },
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const results = await table.executePattern('getUserOrders', {
        userId: '1',
      })

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.userId === '1')).toBe(true)
    })

    it('should execute getOrdersByStatus pattern with GSI', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getOrdersByStatus: {
          index: 'GSI2',
          keyCondition: (params: { status: string }) => ({
            pk: `STATUS#${params.status}`,
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const results = await table.executePattern('getOrdersByStatus', {
        status: 'pending',
      })

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.status === 'pending')).toBe(true)
    })

    it('should execute pattern with filter', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserOrdersAboveAmount: {
          keyCondition: (params: { userId: string }) => ({
            pk: PatternHelpers.entityKey('USER', params.userId),
            sk: { beginsWith: 'ORDER#' },
          }),
          filter: (params: { userId: string; minAmount: number }) => ({
            amount: { gte: params.minAmount },
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const results = await table.executePattern('getUserOrdersAboveAmount', {
        userId: '1',
        minAmount: 150,
      })

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.amount >= 150)).toBe(true)
    })

    it('should execute pattern with transform', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserOrderIds: {
          keyCondition: (params: { userId: string }) => ({
            pk: PatternHelpers.entityKey('USER', params.userId),
            sk: { beginsWith: 'ORDER#' },
          }),
          transform: (items: any[]) => items.map((item) => item.orderId),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const results = await table.executePattern('getUserOrderIds', {
        userId: '1',
      })

      expect(results).toEqual(['101', '102', '103'])
    })
  })

  describe('Single-table design patterns', () => {
    it('should query all users', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getAllUsers: {
          index: 'GSI1',
          keyCondition: () => ({
            pk: 'USER',
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const results = await table.executePattern('getAllUsers', {})

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.gsi1pk === 'USER')).toBe(true)
    })

    it('should query products by category', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getProductsByCategory: {
          index: 'GSI1',
          keyCondition: (params: { category: string }) => ({
            pk: `CATEGORY#${params.category}`,
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const electronics = await table.executePattern('getProductsByCategory', {
        category: 'electronics',
      })

      expect(electronics).toHaveLength(2)
      expect(electronics.every((p) => p.category === 'electronics')).toBe(true)

      const books = await table.executePattern('getProductsByCategory', {
        category: 'books',
      })

      expect(books).toHaveLength(1)
      expect(books[0].category).toBe('books')
    })

    it('should handle multiple entity types in same table', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Get a user
      const user = await table.get({
        pk: PatternHelpers.entityKey('USER', '1'),
        sk: 'PROFILE',
      })

      expect(user?.name).toBe('Alice')

      // Get a product
      const product = await table.get({
        pk: PatternHelpers.entityKey('PRODUCT', '1'),
        sk: 'DETAILS',
      })

      expect(product?.name).toBe('Laptop')

      // Get an order
      const order = await table.get({
        pk: PatternHelpers.entityKey('USER', '1'),
        sk: PatternHelpers.entityKey('ORDER', '101'),
      })

      expect(order?.orderId).toBe('101')
    })
  })

  describe('Composite key patterns', () => {
    beforeAll(async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Add items with composite keys
      await table.put({
        pk: PatternHelpers.compositeKey(['TENANT', 'tenant1']),
        sk: PatternHelpers.compositeKey(['USER', 'user1']),
        name: 'Tenant 1 User 1',
      })

      await table.put({
        pk: PatternHelpers.compositeKey(['TENANT', 'tenant1']),
        sk: PatternHelpers.compositeKey(['USER', 'user2']),
        name: 'Tenant 1 User 2',
      })

      await table.put({
        pk: PatternHelpers.compositeKey(['TENANT', 'tenant2']),
        sk: PatternHelpers.compositeKey(['USER', 'user1']),
        name: 'Tenant 2 User 1',
      })
    })

    it('should query with composite keys', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getTenantUsers: {
          keyCondition: (params: { tenantId: string }) => ({
            pk: PatternHelpers.compositeKey(['TENANT', params.tenantId]),
            sk: { beginsWith: 'USER#' },
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      const results = await table.executePattern('getTenantUsers', {
        tenantId: 'tenant1',
      })

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.name).sort()).toEqual([
        'Tenant 1 User 1',
        'Tenant 1 User 2',
      ])
    })

    it('should parse composite keys', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const item = await table.get({
        pk: PatternHelpers.compositeKey(['TENANT', 'tenant1']),
        sk: PatternHelpers.compositeKey(['USER', 'user1']),
      })

      const [pkType, tenantId] = PatternHelpers.parseCompositeKey(item!.pk)
      const [skType, userId] = PatternHelpers.parseCompositeKey(item!.sk)

      expect(pkType).toBe('TENANT')
      expect(tenantId).toBe('tenant1')
      expect(skType).toBe('USER')
      expect(userId).toBe('user1')
    })
  })

  describe('Hierarchical data patterns', () => {
    beforeAll(async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Add hierarchical data
      await table.put({
        pk: 'ORG#1',
        sk: PatternHelpers.hierarchicalKey(['USA']),
        name: 'USA Office',
      })

      await table.put({
        pk: 'ORG#1',
        sk: PatternHelpers.hierarchicalKey(['USA', 'CA']),
        name: 'California Office',
      })

      await table.put({
        pk: 'ORG#1',
        sk: PatternHelpers.hierarchicalKey(['USA', 'CA', 'SF']),
        name: 'San Francisco Office',
      })

      await table.put({
        pk: 'ORG#1',
        sk: PatternHelpers.hierarchicalKey(['USA', 'NY']),
        name: 'New York Office',
      })
    })

    it('should query hierarchical data at different levels', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Get all USA offices
      const usaOffices = await table.query({
        keyCondition: {
          pk: 'ORG#1',
          sk: { beginsWith: PatternHelpers.hierarchicalKey(['USA']) },
        },
      })

      expect(usaOffices.items).toHaveLength(4)

      // Get all California offices
      const caOffices = await table.query({
        keyCondition: {
          pk: 'ORG#1',
          sk: { beginsWith: PatternHelpers.hierarchicalKey(['USA', 'CA']) },
        },
      })

      expect(caOffices.items).toHaveLength(2)
    })

    it('should parse hierarchical keys', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const item = await table.get({
        pk: 'ORG#1',
        sk: PatternHelpers.hierarchicalKey(['USA', 'CA', 'SF']),
      })

      const path = PatternHelpers.parseHierarchicalKey(item!.sk)

      expect(path).toEqual(['USA', 'CA', 'SF'])
    })
  })

  describe('Time-series patterns', () => {
    beforeAll(async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Add time-series data
      const dates = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T14:00:00Z'),
        new Date('2024-01-16T10:00:00Z'),
        new Date('2024-02-01T10:00:00Z'),
      ]

      for (const date of dates) {
        await table.put({
          pk: 'SENSOR#1',
          sk: PatternHelpers.timeSeriesKey(date, 'hour'),
          gsi1pk: PatternHelpers.timeSeriesKey(date, 'day'),
          gsi1sk: date.toISOString(),
          temperature: Math.random() * 100,
          timestamp: date.toISOString(),
        })
      }
    })

    it('should query time-series data by hour', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'SENSOR#1',
          sk: { beginsWith: '2024-01-15' },
        },
      })

      expect(result.items).toHaveLength(2)
    })

    it('should query time-series data by day using GSI', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const date = new Date('2024-01-15')
      const dayKey = PatternHelpers.timeSeriesKey(date, 'day')

      const result = await table.query({
        indexName: 'GSI1',
        keyCondition: {
          pk: dayKey,
        },
      })

      expect(result.items).toHaveLength(2)
    })
  })

  describe('Pattern with pagination', () => {
    it('should paginate pattern results', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserOrders: {
          keyCondition: (params: { userId: string }) => ({
            pk: PatternHelpers.entityKey('USER', params.userId),
            sk: { beginsWith: 'ORDER#' },
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      // Get first page
      const page1 = await table.executePattern(
        'getUserOrders',
        { userId: '1' },
        { limit: 2 },
      )

      expect(page1).toHaveLength(2)
    })
  })

  describe('Complex access patterns', () => {
    it('should combine multiple patterns for complex queries', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserProfile: {
          keyCondition: (params: { userId: string }) => ({
            pk: PatternHelpers.entityKey('USER', params.userId),
            sk: { eq: 'PROFILE' },
          }),
        },
        getUserOrders: {
          keyCondition: (params: { userId: string }) => ({
            pk: PatternHelpers.entityKey('USER', params.userId),
            sk: { beginsWith: 'ORDER#' },
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
      })

      // Get user profile and orders
      const [profile] = await table.executePattern('getUserProfile', {
        userId: '1',
      })
      const orders = await table.executePattern('getUserOrders', {
        userId: '1',
      })

      expect(profile.name).toBe('Alice')
      expect(orders).toHaveLength(3)

      // Combine data
      const userWithOrders = {
        ...profile,
        orders,
      }

      expect(userWithOrders.name).toBe('Alice')
      expect(userWithOrders.orders).toHaveLength(3)
    })
  })
})
