/**
 * End-to-end integration tests for query operations with DynamoDB Local
 */

import { describe, it, expect, beforeAll, afterAll } from '@rstest/core'
import { TableClient } from '../table-client'
import {
  setupTestTableWithData,
  type TestTableConfig,
} from '../test-utils/dynamodb-local'
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'

describe('Query Integration Tests', () => {
  let client: DynamoDBClient
  let cleanup: () => Promise<void>
  const tableName = 'integration-query-test'

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
      localSecondaryIndexes: [
        {
          indexName: 'LSI1',
          sortKey: { name: 'lsi1sk', type: 'S' },
        },
      ],
    }

    // Seed test data
    const testData = [
      // User orders
      {
        pk: 'USER#1',
        sk: 'ORDER#2024-01-01',
        gsi1pk: 'STATUS#pending',
        gsi1sk: '2024-01-01',
        gsi2pk: 'CATEGORY#electronics',
        gsi2sk: 100,
        lsi1sk: 'PRIORITY#high',
        amount: 100,
        status: 'pending',
      },
      {
        pk: 'USER#1',
        sk: 'ORDER#2024-01-02',
        gsi1pk: 'STATUS#completed',
        gsi1sk: '2024-01-02',
        gsi2pk: 'CATEGORY#electronics',
        gsi2sk: 200,
        lsi1sk: 'PRIORITY#low',
        amount: 200,
        status: 'completed',
      },
      {
        pk: 'USER#1',
        sk: 'ORDER#2024-01-03',
        gsi1pk: 'STATUS#pending',
        gsi1sk: '2024-01-03',
        gsi2pk: 'CATEGORY#books',
        gsi2sk: 50,
        lsi1sk: 'PRIORITY#medium',
        amount: 50,
        status: 'pending',
      },
      {
        pk: 'USER#2',
        sk: 'ORDER#2024-01-01',
        gsi1pk: 'STATUS#completed',
        gsi1sk: '2024-01-01',
        gsi2pk: 'CATEGORY#books',
        gsi2sk: 75,
        lsi1sk: 'PRIORITY#high',
        amount: 75,
        status: 'completed',
      },
      {
        pk: 'USER#2',
        sk: 'ORDER#2024-01-04',
        gsi1pk: 'STATUS#pending',
        gsi1sk: '2024-01-04',
        gsi2pk: 'CATEGORY#electronics',
        gsi2sk: 150,
        lsi1sk: 'PRIORITY#low',
        amount: 150,
        status: 'pending',
      },
      // Products
      {
        pk: 'PRODUCT#1',
        sk: 'DETAILS',
        gsi1pk: 'CATEGORY#electronics',
        gsi1sk: 'PRODUCT#1',
        name: 'Laptop',
        price: 999,
      },
      {
        pk: 'PRODUCT#2',
        sk: 'DETAILS',
        gsi1pk: 'CATEGORY#electronics',
        gsi1sk: 'PRODUCT#2',
        name: 'Mouse',
        price: 29,
      },
      {
        pk: 'PRODUCT#3',
        sk: 'DETAILS',
        gsi1pk: 'CATEGORY#books',
        gsi1sk: 'PRODUCT#3',
        name: 'TypeScript Book',
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

  describe('Basic query operations', () => {
    it('should query by partition key only', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
      })

      expect(result.items).toHaveLength(3)
      expect(result.items.every((item) => item.pk === 'USER#1')).toBe(true)
    })

    it('should query with exact sort key match', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
          sk: { eq: 'ORDER#2024-01-01' },
        },
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].sk).toBe('ORDER#2024-01-01')
    })

    it('should query with beginsWith on sort key', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
          sk: { beginsWith: 'ORDER#' },
        },
      })

      expect(result.items).toHaveLength(3)
      expect(result.items.every((item) => item.sk.startsWith('ORDER#'))).toBe(
        true,
      )
    })

    it('should query with less than on sort key', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
          sk: { lt: 'ORDER#2024-01-02' },
        },
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].sk).toBe('ORDER#2024-01-01')
    })

    it('should query with greater than or equal on sort key', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
          sk: { gte: 'ORDER#2024-01-02' },
        },
      })

      expect(result.items).toHaveLength(2)
      expect(result.items.map((i) => i.sk).sort()).toEqual([
        'ORDER#2024-01-02',
        'ORDER#2024-01-03',
      ])
    })

    it('should query with between on sort key', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
          sk: { between: ['ORDER#2024-01-01', 'ORDER#2024-01-02'] },
        },
      })

      expect(result.items).toHaveLength(2)
      expect(result.items.map((i) => i.sk).sort()).toEqual([
        'ORDER#2024-01-01',
        'ORDER#2024-01-02',
      ])
    })
  })

  describe('GSI queries', () => {
    it('should query GSI with string sort key', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        indexName: 'GSI1',
        keyCondition: {
          pk: 'STATUS#pending',
        },
      })

      expect(result.items).toHaveLength(3)
      expect(result.items.every((item) => item.status === 'pending')).toBe(
        true,
      )
    })

    it('should query GSI with sort key condition', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        indexName: 'GSI1',
        keyCondition: {
          pk: 'STATUS#pending',
          sk: { gte: '2024-01-02' },
        },
      })

      expect(result.items).toHaveLength(2)
      expect(result.items.map((i) => i.gsi1sk).sort()).toEqual([
        '2024-01-03',
        '2024-01-04',
      ])
    })

    it('should query GSI with number sort key', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        indexName: 'GSI2',
        keyCondition: {
          pk: 'CATEGORY#electronics',
          sk: { gte: 100 },
        },
      })

      expect(result.items).toHaveLength(3)
      expect(result.items.every((item) => item.gsi2sk >= 100)).toBe(true)
    })

    it('should query GSI by category', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        indexName: 'GSI1',
        keyCondition: {
          pk: 'CATEGORY#electronics',
        },
      })

      expect(result.items.length).toBeGreaterThan(0)
    })
  })

  describe('LSI queries', () => {
    it('should query LSI', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        indexName: 'LSI1',
        keyCondition: {
          pk: 'USER#1',
          sk: { beginsWith: 'PRIORITY#' },
        },
      })

      expect(result.items).toHaveLength(3)
    })

    it('should query LSI with exact match', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        indexName: 'LSI1',
        keyCondition: {
          pk: 'USER#1',
          sk: { eq: 'PRIORITY#high' },
        },
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].lsi1sk).toBe('PRIORITY#high')
    })
  })

  describe('Filter expressions', () => {
    it('should apply filter expression', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        filter: {
          amount: { gt: 75 },
        },
      })

      expect(result.items).toHaveLength(2)
      expect(result.items.every((item) => item.amount > 75)).toBe(true)
    })

    it('should apply multiple filter conditions', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        filter: {
          amount: { gte: 50 },
          status: { eq: 'pending' },
        },
      })

      expect(result.items).toHaveLength(2)
      expect(
        result.items.every(
          (item) => item.amount >= 50 && item.status === 'pending',
        ),
      ).toBe(true)
    })

    it('should filter with beginsWith', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        filter: {
          sk: { beginsWith: 'ORDER#2024-01-0' },
        },
      })

      expect(result.items).toHaveLength(3)
    })
  })

  describe('Pagination', () => {
    it('should paginate query results', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // First page
      const page1 = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        limit: 2,
      })

      expect(page1.items).toHaveLength(2)
      expect(page1.lastEvaluatedKey).toBeDefined()

      // Second page
      const page2 = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        limit: 2,
        exclusiveStartKey: page1.lastEvaluatedKey,
      })

      expect(page2.items).toHaveLength(1)
      expect(page2.lastEvaluatedKey).toBeUndefined()
    })

    it('should iterate through all pages', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const allItems: any[] = []

      for await (const item of table.queryPaginated({
        keyCondition: {
          pk: 'USER#1',
        },
      })) {
        allItems.push(item)
      }

      expect(allItems).toHaveLength(3)
    })

    it('should paginate with limit', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const allItems: any[] = []

      for await (const item of table.queryPaginated({
        keyCondition: {
          pk: 'USER#1',
        },
        limit: 1,
      })) {
        allItems.push(item)
      }

      expect(allItems).toHaveLength(3)
    })
  })

  describe('Projection expressions', () => {
    it('should project specific attributes', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        projectionExpression: ['pk', 'sk', 'amount'],
      })

      expect(result.items).toHaveLength(3)
      expect(result.items[0].amount).toBeDefined()
      expect(result.items[0].status).toBeUndefined()
    })

    it('should project nested attributes', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // First add an item with nested data
      await table.put({
        pk: 'USER#3',
        sk: 'PROFILE',
        name: 'Test User',
        address: {
          street: '123 Main St',
          city: 'Boston',
        },
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#3',
        },
        projectionExpression: ['pk', 'sk', 'address.city'],
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].address?.city).toBe('Boston')
    })
  })

  describe('Scan operations', () => {
    it('should scan entire table', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.scan()

      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should scan with filter', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.scan({
        filter: {
          status: { eq: 'pending' },
        },
      })

      expect(result.items.every((item) => item.status === 'pending')).toBe(
        true,
      )
    })

    it('should paginate scan results', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const page1 = await table.scan({
        limit: 3,
      })

      expect(page1.items).toHaveLength(3)

      if (page1.lastEvaluatedKey) {
        const page2 = await table.scan({
          limit: 3,
          exclusiveStartKey: page1.lastEvaluatedKey,
        })

        expect(page2.items.length).toBeGreaterThan(0)
      }
    })

    it('should iterate scan results', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const allItems: any[] = []

      for await (const item of table.scanPaginated()) {
        allItems.push(item)
      }

      expect(allItems.length).toBeGreaterThan(0)
    })
  })

  describe('Query result metadata', () => {
    it('should return count and scannedCount', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        filter: {
          amount: { gt: 75 },
        },
      })

      expect(result.count).toBe(2)
      expect(result.scannedCount).toBe(3)
    })

    it('should return consumed capacity when requested', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        returnConsumedCapacity: 'TOTAL',
      })

      expect(result.consumedCapacity).toBeDefined()
    })
  })

  describe('Sort order', () => {
    it('should return results in ascending order by default', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
      })

      const sortKeys = result.items.map((item) => item.sk)
      const sortedKeys = [...sortKeys].sort()

      expect(sortKeys).toEqual(sortedKeys)
    })

    it('should return results in descending order when specified', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.query({
        keyCondition: {
          pk: 'USER#1',
        },
        scanIndexForward: false,
      })

      const sortKeys = result.items.map((item) => item.sk)
      const sortedKeys = [...sortKeys].sort().reverse()

      expect(sortKeys).toEqual(sortedKeys)
    })
  })
})
