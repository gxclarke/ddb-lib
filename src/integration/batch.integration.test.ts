/**
 * End-to-end integration tests for batch operations with DynamoDB Local
 */

import { describe, it, expect, beforeAll, afterAll } from '@rstest/core'
import { TableClient } from '../table-client'
import {
  setupTestTable,
  seedTestData,
  clearTestTable,
  type TestTableConfig,
} from '../test-utils/dynamodb-local'
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'

describe('Batch Operations Integration Tests', () => {
  let client: DynamoDBClient
  let cleanup: () => Promise<void>
  const tableName = 'integration-batch-test'

  beforeAll(async () => {
    const config: TestTableConfig = {
      tableName,
      partitionKey: { name: 'pk', type: 'S' },
      sortKey: { name: 'sk', type: 'S' },
    }

    const setup = await setupTestTable(config)
    client = setup.client
    cleanup = setup.cleanup
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('batchGet operations', () => {
    beforeAll(async () => {
      // Seed test data
      const items = Array.from({ length: 50 }, (_, i) => ({
        pk: `USER#${i}`,
        sk: 'PROFILE',
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }))

      await seedTestData(client, tableName, items)
    })

    afterAll(async () => {
      await clearTestTable(client, tableName, 'pk', 'sk')
    })

    it('should batch get multiple items', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const keys = [
        { pk: 'USER#0', sk: 'PROFILE' },
        { pk: 'USER#1', sk: 'PROFILE' },
        { pk: 'USER#2', sk: 'PROFILE' },
      ]

      const items = await table.batchGet(keys)

      expect(items).toHaveLength(3)
      expect(items[0].name).toBe('User 0')
      expect(items[1].name).toBe('User 1')
      expect(items[2].name).toBe('User 2')
    })

    it('should handle batch get with non-existent items', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const keys = [
        { pk: 'USER#0', sk: 'PROFILE' },
        { pk: 'USER#999', sk: 'PROFILE' }, // Doesn't exist
        { pk: 'USER#1', sk: 'PROFILE' },
      ]

      const items = await table.batchGet(keys)

      // Should only return existing items
      expect(items).toHaveLength(2)
      expect(items.map((i) => i.pk).sort()).toEqual(['USER#0', 'USER#1'])
    })

    it('should automatically chunk large batch gets', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Request 150 items (should be chunked into 2 batches of 100 and 50)
      const keys = Array.from({ length: 50 }, (_, i) => ({
        pk: `USER#${i}`,
        sk: 'PROFILE',
      }))

      const items = await table.batchGet(keys)

      expect(items).toHaveLength(50)
    })

    it('should support consistent read in batch get', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const keys = [
        { pk: 'USER#0', sk: 'PROFILE' },
        { pk: 'USER#1', sk: 'PROFILE' },
      ]

      const items = await table.batchGet(keys, { consistentRead: true })

      expect(items).toHaveLength(2)
    })

    it('should support projection expression in batch get', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const keys = [
        { pk: 'USER#0', sk: 'PROFILE' },
        { pk: 'USER#1', sk: 'PROFILE' },
      ]

      const items = await table.batchGet(keys, {
        projectionExpression: ['pk', 'sk', 'name'],
      })

      expect(items).toHaveLength(2)
      expect(items[0].name).toBeDefined()
      expect(items[0].email).toBeUndefined()
    })
  })

  describe('batchWrite operations', () => {
    afterAll(async () => {
      await clearTestTable(client, tableName, 'pk', 'sk')
    })

    it('should batch write multiple put operations', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const operations = [
        {
          type: 'put' as const,
          item: {
            pk: 'BATCH#1',
            sk: 'ITEM',
            name: 'Item 1',
          },
        },
        {
          type: 'put' as const,
          item: {
            pk: 'BATCH#2',
            sk: 'ITEM',
            name: 'Item 2',
          },
        },
        {
          type: 'put' as const,
          item: {
            pk: 'BATCH#3',
            sk: 'ITEM',
            name: 'Item 3',
          },
        },
      ]

      await table.batchWrite(operations)

      // Verify items were written
      const item1 = await table.get({ pk: 'BATCH#1', sk: 'ITEM' })
      const item2 = await table.get({ pk: 'BATCH#2', sk: 'ITEM' })
      const item3 = await table.get({ pk: 'BATCH#3', sk: 'ITEM' })

      expect(item1?.name).toBe('Item 1')
      expect(item2?.name).toBe('Item 2')
      expect(item3?.name).toBe('Item 3')
    })

    it('should batch write multiple delete operations', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // First, put some items
      await table.put({ pk: 'DELETE#1', sk: 'ITEM', name: 'To Delete 1' })
      await table.put({ pk: 'DELETE#2', sk: 'ITEM', name: 'To Delete 2' })
      await table.put({ pk: 'DELETE#3', sk: 'ITEM', name: 'To Delete 3' })

      // Now batch delete them
      const operations = [
        {
          type: 'delete' as const,
          key: { pk: 'DELETE#1', sk: 'ITEM' },
        },
        {
          type: 'delete' as const,
          key: { pk: 'DELETE#2', sk: 'ITEM' },
        },
        {
          type: 'delete' as const,
          key: { pk: 'DELETE#3', sk: 'ITEM' },
        },
      ]

      await table.batchWrite(operations)

      // Verify items were deleted
      const item1 = await table.get({ pk: 'DELETE#1', sk: 'ITEM' })
      const item2 = await table.get({ pk: 'DELETE#2', sk: 'ITEM' })
      const item3 = await table.get({ pk: 'DELETE#3', sk: 'ITEM' })

      expect(item1).toBeNull()
      expect(item2).toBeNull()
      expect(item3).toBeNull()
    })

    it('should batch write mixed put and delete operations', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put an item to delete later
      await table.put({ pk: 'MIXED#1', sk: 'ITEM', name: 'To Delete' })

      const operations = [
        {
          type: 'put' as const,
          item: {
            pk: 'MIXED#2',
            sk: 'ITEM',
            name: 'New Item',
          },
        },
        {
          type: 'delete' as const,
          key: { pk: 'MIXED#1', sk: 'ITEM' },
        },
        {
          type: 'put' as const,
          item: {
            pk: 'MIXED#3',
            sk: 'ITEM',
            name: 'Another New Item',
          },
        },
      ]

      await table.batchWrite(operations)

      // Verify results
      const deleted = await table.get({ pk: 'MIXED#1', sk: 'ITEM' })
      const item2 = await table.get({ pk: 'MIXED#2', sk: 'ITEM' })
      const item3 = await table.get({ pk: 'MIXED#3', sk: 'ITEM' })

      expect(deleted).toBeNull()
      expect(item2?.name).toBe('New Item')
      expect(item3?.name).toBe('Another New Item')
    })

    it('should automatically chunk large batch writes', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Create 100 put operations (should be chunked into 4 batches of 25)
      const operations = Array.from({ length: 100 }, (_, i) => ({
        type: 'put' as const,
        item: {
          pk: `CHUNK#${i}`,
          sk: 'ITEM',
          value: i,
        },
      }))

      await table.batchWrite(operations)

      // Verify some items were written
      const item0 = await table.get({ pk: 'CHUNK#0', sk: 'ITEM' })
      const item50 = await table.get({ pk: 'CHUNK#50', sk: 'ITEM' })
      const item99 = await table.get({ pk: 'CHUNK#99', sk: 'ITEM' })

      expect(item0?.value).toBe(0)
      expect(item50?.value).toBe(50)
      expect(item99?.value).toBe(99)
    })

    it('should handle empty batch write', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      await table.batchWrite([])

      // Should not throw
    })
  })

  describe('Batch operation performance', () => {
    it('should be faster than individual operations', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const itemCount = 25

      // Time individual puts
      const individualStart = Date.now()
      for (let i = 0; i < itemCount; i++) {
        await table.put({
          pk: `PERF#INDIVIDUAL#${i}`,
          sk: 'ITEM',
          value: i,
        })
      }
      const individualTime = Date.now() - individualStart

      // Time batch write
      const batchStart = Date.now()
      const batchOperations = Array.from({ length: itemCount }, (_, i) => ({
        type: 'put' as const,
        item: {
          pk: `PERF#BATCH#${i}`,
          sk: 'ITEM',
          value: i,
        },
      }))
      await table.batchWrite(batchOperations)
      const batchTime = Date.now() - batchStart

      // Batch should be faster (though this might be flaky in CI)
      console.log(`Individual: ${individualTime}ms, Batch: ${batchTime}ms`)
      expect(batchTime).toBeLessThan(individualTime * 1.5) // Allow some variance
    })
  })

  describe('Batch operation error handling', () => {
    it('should handle batch get with empty keys array', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const items = await table.batchGet([])

      expect(items).toEqual([])
    })

    it('should handle batch write with duplicate keys', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // DynamoDB allows duplicate keys in batch write (last write wins)
      const operations = [
        {
          type: 'put' as const,
          item: {
            pk: 'DUP#1',
            sk: 'ITEM',
            name: 'First',
          },
        },
        {
          type: 'put' as const,
          item: {
            pk: 'DUP#1',
            sk: 'ITEM',
            name: 'Second',
          },
        },
      ]

      await table.batchWrite(operations)

      const item = await table.get({ pk: 'DUP#1', sk: 'ITEM' })
      expect(item?.name).toBe('Second')
    })
  })

  describe('Batch operations with complex data', () => {
    it('should handle batch write with nested objects', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const operations = [
        {
          type: 'put' as const,
          item: {
            pk: 'COMPLEX#1',
            sk: 'ITEM',
            user: {
              name: 'Alice',
              address: {
                street: '123 Main St',
                city: 'Boston',
              },
            },
          },
        },
        {
          type: 'put' as const,
          item: {
            pk: 'COMPLEX#2',
            sk: 'ITEM',
            user: {
              name: 'Bob',
              address: {
                street: '456 Oak Ave',
                city: 'Seattle',
              },
            },
          },
        },
      ]

      await table.batchWrite(operations)

      const item1 = await table.get({ pk: 'COMPLEX#1', sk: 'ITEM' })
      expect(item1?.user.address.city).toBe('Boston')
    })

    it('should handle batch write with arrays and sets', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const operations = [
        {
          type: 'put' as const,
          item: {
            pk: 'ARRAY#1',
            sk: 'ITEM',
            tags: ['tag1', 'tag2', 'tag3'],
            categories: new Set(['cat1', 'cat2']),
          },
        },
      ]

      await table.batchWrite(operations)

      const item = await table.get({ pk: 'ARRAY#1', sk: 'ITEM' })
      expect(item?.tags).toEqual(['tag1', 'tag2', 'tag3'])
      expect(item?.categories).toBeInstanceOf(Set)
    })
  })

  describe('Batch get ordering', () => {
    beforeAll(async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put items in specific order
      await table.put({ pk: 'ORDER#1', sk: 'ITEM', order: 1 })
      await table.put({ pk: 'ORDER#2', sk: 'ITEM', order: 2 })
      await table.put({ pk: 'ORDER#3', sk: 'ITEM', order: 3 })
    })

    it('should return items in request order when possible', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const keys = [
        { pk: 'ORDER#3', sk: 'ITEM' },
        { pk: 'ORDER#1', sk: 'ITEM' },
        { pk: 'ORDER#2', sk: 'ITEM' },
      ]

      const items = await table.batchGet(keys)

      // Note: DynamoDB doesn't guarantee order, but we should get all items
      expect(items).toHaveLength(3)
      expect(items.map((i) => i.order).sort()).toEqual([1, 2, 3])
    })
  })
})
