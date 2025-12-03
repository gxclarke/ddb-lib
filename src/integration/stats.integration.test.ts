/**
 * End-to-end integration tests for stats collection with DynamoDB Local
 */

import { describe, it, expect, beforeAll, afterAll } from '@rstest/core'
import { TableClient } from '../table-client'
import {
  setupTestTable,
  seedTestData,
  type TestTableConfig,
} from '../test-utils/dynamodb-local'
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type { AccessPatternDefinitions } from '../types'
import { PatternHelpers } from '../pattern-helpers'

describe('Stats Collection Integration Tests', () => {
  let client: DynamoDBClient
  let cleanup: () => Promise<void>
  const tableName = 'integration-stats-test'

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
      ],
    }

    const setup = await setupTestTable(config)
    client = setup.client
    cleanup = setup.cleanup
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('Basic stats collection', () => {
    it('should collect stats for CRUD operations', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Perform various operations
      await table.put({ pk: 'STATS#1', sk: 'ITEM', value: 1 })
      await table.get({ pk: 'STATS#1', sk: 'ITEM' })
      await table.update({ pk: 'STATS#1', sk: 'ITEM' }, { value: 2 })
      await table.delete({ pk: 'STATS#1', sk: 'ITEM' })

      const stats = table.getStats()

      expect(stats.operations.put).toBeDefined()
      expect(stats.operations.put.count).toBe(1)
      expect(stats.operations.get).toBeDefined()
      expect(stats.operations.get.count).toBe(1)
      expect(stats.operations.update).toBeDefined()
      expect(stats.operations.update.count).toBe(1)
      expect(stats.operations.delete).toBeDefined()
      expect(stats.operations.delete.count).toBe(1)
    })

    it('should collect stats for query operations', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Seed data
      await table.put({ pk: 'QUERY#1', sk: 'ITEM#1', value: 1 })
      await table.put({ pk: 'QUERY#1', sk: 'ITEM#2', value: 2 })
      await table.put({ pk: 'QUERY#1', sk: 'ITEM#3', value: 3 })

      // Reset stats to focus on query
      table.resetStats()

      // Perform query
      await table.query({
        keyCondition: {
          pk: 'QUERY#1',
        },
      })

      const stats = table.getStats()

      expect(stats.operations.query).toBeDefined()
      expect(stats.operations.query.count).toBe(1)
      expect(stats.operations.query.avgLatencyMs).toBeGreaterThan(0)
    })

    it('should collect stats for scan operations', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Reset stats
      table.resetStats()

      // Perform scan
      await table.scan({ limit: 10 })

      const stats = table.getStats()

      expect(stats.operations.scan).toBeDefined()
      expect(stats.operations.scan.count).toBe(1)
    })

    it('should collect stats for batch operations', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Reset stats
      table.resetStats()

      // Batch write
      await table.batchWrite([
        { type: 'put', item: { pk: 'BATCH#1', sk: 'ITEM', value: 1 } },
        { type: 'put', item: { pk: 'BATCH#2', sk: 'ITEM', value: 2 } },
      ])

      // Batch get
      await table.batchGet([
        { pk: 'BATCH#1', sk: 'ITEM' },
        { pk: 'BATCH#2', sk: 'ITEM' },
      ])

      const stats = table.getStats()

      expect(stats.operations.batchWrite).toBeDefined()
      expect(stats.operations.batchWrite.count).toBe(1)
      expect(stats.operations.batchGet).toBeDefined()
      expect(stats.operations.batchGet.count).toBe(1)
    })
  })

  describe('Access pattern stats', () => {
    it('should track stats by access pattern', async () => {
      const accessPatterns: AccessPatternDefinitions<any> = {
        getUserById: {
          keyCondition: (params: { userId: string }) => ({
            pk: `USER#${params.userId}`,
            sk: { eq: 'PROFILE' },
          }),
        },
        getUserOrders: {
          keyCondition: (params: { userId: string }) => ({
            pk: `USER#${params.userId}`,
            sk: { beginsWith: 'ORDER#' },
          }),
        },
      }

      const table = new TableClient({
        tableName,
        client,
        accessPatterns,
        statsConfig: {
          enabled: true,
        },
      })

      // Seed data
      await table.put({ pk: 'USER#1', sk: 'PROFILE', name: 'Alice' })
      await table.put({ pk: 'USER#1', sk: 'ORDER#1', amount: 100 })
      await table.put({ pk: 'USER#1', sk: 'ORDER#2', amount: 200 })

      // Reset stats
      table.resetStats()

      // Execute patterns
      await table.executePattern('getUserById', { userId: '1' })
      await table.executePattern('getUserOrders', { userId: '1' })
      await table.executePattern('getUserOrders', { userId: '1' })

      const stats = table.getStats()

      expect(stats.accessPatterns.getUserById).toBeDefined()
      expect(stats.accessPatterns.getUserById.count).toBe(1)
      expect(stats.accessPatterns.getUserOrders).toBeDefined()
      expect(stats.accessPatterns.getUserOrders.count).toBe(2)
    })
  })

  describe('Stats aggregation', () => {
    it('should aggregate latency metrics', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        await table.put({ pk: `AGG#${i}`, sk: 'ITEM', value: i })
      }

      const stats = table.getStats()

      expect(stats.operations.put.count).toBe(5)
      expect(stats.operations.put.avgLatencyMs).toBeGreaterThan(0)
      expect(stats.operations.put.totalLatencyMs).toBeGreaterThan(0)
    })

    it('should track item counts', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Seed data
      await table.put({ pk: 'COUNT#1', sk: 'ITEM#1', value: 1 })
      await table.put({ pk: 'COUNT#1', sk: 'ITEM#2', value: 2 })
      await table.put({ pk: 'COUNT#1', sk: 'ITEM#3', value: 3 })

      // Reset stats
      table.resetStats()

      // Query
      await table.query({
        keyCondition: {
          pk: 'COUNT#1',
        },
      })

      const stats = table.getStats()

      expect(stats.operations.query.avgItemsReturned).toBe(3)
    })
  })

  describe('Recommendation generation', () => {
    it('should detect scan operations', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Perform scan
      await table.scan()

      const recommendations = table.getRecommendations()

      const scanRecommendation = recommendations.find(
        (r) => r.category === 'performance' && r.message.includes('scan'),
      )

      expect(scanRecommendation).toBeDefined()
    })

    it('should detect inefficient scans', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Seed data with many items
      const items = Array.from({ length: 20 }, (_, i) => ({
        pk: `INEFFICIENT#${i}`,
        sk: 'ITEM',
        status: i < 2 ? 'active' : 'inactive',
      }))

      await seedTestData(client, tableName, items)

      // Reset stats
      table.resetStats()

      // Scan with filter that returns few items
      await table.scan({
        filter: {
          status: { eq: 'active' },
        },
      })

      const recommendations = table.getRecommendations()

      const inefficientScanRec = recommendations.find(
        (r) => r.category === 'performance' && r.message.includes('inefficient'),
      )

      expect(inefficientScanRec).toBeDefined()
    })

    it('should detect hot partitions', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Seed data
      await table.put({ pk: 'HOT#1', sk: 'ITEM', value: 1 })
      await table.put({ pk: 'COLD#1', sk: 'ITEM', value: 1 })

      // Reset stats
      table.resetStats()

      // Access hot partition many times
      for (let i = 0; i < 20; i++) {
        await table.get({ pk: 'HOT#1', sk: 'ITEM' })
      }

      // Access cold partition once
      await table.get({ pk: 'COLD#1', sk: 'ITEM' })

      const recommendations = table.getRecommendations()

      const hotPartitionRec = recommendations.find(
        (r) => r.category === 'hot-partition',
      )

      expect(hotPartitionRec).toBeDefined()
      expect(hotPartitionRec?.message).toContain('HOT#1')
    })

    it('should detect sequential writes pattern', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Reset stats
      table.resetStats()

      // Perform many sequential writes
      for (let i = 0; i < 10; i++) {
        await table.put({ pk: `SEQ#${i}`, sk: 'ITEM', value: i })
      }

      const recommendations = table.getRecommendations()

      const batchRecommendation = recommendations.find(
        (r) =>
          r.category === 'performance' && r.message.includes('batchWrite'),
      )

      expect(batchRecommendation).toBeDefined()
    })

    it('should detect large items', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Reset stats
      table.resetStats()

      // Create a large item (> 100KB)
      const largeData = 'x'.repeat(150 * 1024) // 150KB

      await table.put({
        pk: 'LARGE#1',
        sk: 'ITEM',
        data: largeData,
      })

      const recommendations = table.getRecommendations()

      const largeItemRec = recommendations.find(
        (r) => r.category === 'best-practice' && r.message.includes('large'),
      )

      expect(largeItemRec).toBeDefined()
    })

    it('should detect concatenated keys', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Reset stats
      table.resetStats()

      // Use concatenated keys
      await table.put({
        pk: 'TENANT#123#CUSTOMER#456',
        sk: 'PROFILE',
        gsi1pk: 'STATUS#active#PRIORITY#high',
        gsi1sk: 'ITEM',
      })

      await table.query({
        keyCondition: {
          pk: 'TENANT#123#CUSTOMER#456',
        },
      })

      const recommendations = table.getRecommendations()

      const concatenatedKeyRec = recommendations.find(
        (r) =>
          r.category === 'best-practice' &&
          r.message.includes('multi-attribute'),
      )

      expect(concatenatedKeyRec).toBeDefined()
    })
  })

  describe('Stats sampling', () => {
    it('should respect sample rate', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
          sampleRate: 0.5, // 50% sampling
        },
      })

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await table.put({ pk: `SAMPLE#${i}`, sk: 'ITEM', value: i })
      }

      const stats = table.getStats()

      // With 50% sampling, we should have roughly 50 samples
      // Allow some variance due to randomness
      expect(stats.operations.put.count).toBeGreaterThan(30)
      expect(stats.operations.put.count).toBeLessThan(70)
    })

    it('should allow disabling stats', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: false,
        },
      })

      // Perform operations
      await table.put({ pk: 'DISABLED#1', sk: 'ITEM', value: 1 })
      await table.get({ pk: 'DISABLED#1', sk: 'ITEM' })

      const stats = table.getStats()

      // Stats should be empty or minimal
      expect(Object.keys(stats.operations)).toHaveLength(0)
    })
  })

  describe('Stats reset', () => {
    it('should reset stats', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Perform operations
      await table.put({ pk: 'RESET#1', sk: 'ITEM', value: 1 })
      await table.get({ pk: 'RESET#1', sk: 'ITEM' })

      let stats = table.getStats()
      expect(stats.operations.put.count).toBe(1)

      // Reset
      table.resetStats()

      stats = table.getStats()
      expect(Object.keys(stats.operations)).toHaveLength(0)
    })
  })

  describe('Stats export', () => {
    it('should export raw stats data', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Perform operations
      await table.put({ pk: 'EXPORT#1', sk: 'ITEM', value: 1 })
      await table.get({ pk: 'EXPORT#1', sk: 'ITEM' })

      const rawStats = table.exportStats()

      expect(Array.isArray(rawStats)).toBe(true)
      expect(rawStats.length).toBeGreaterThan(0)
      expect(rawStats[0]).toHaveProperty('operation')
      expect(rawStats[0]).toHaveProperty('timestamp')
      expect(rawStats[0]).toHaveProperty('latencyMs')
    })
  })

  describe('Performance overhead', () => {
    it('should have minimal overhead with stats enabled', async () => {
      // Without stats
      const tableNoStats = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: false,
        },
      })

      const startNoStats = Date.now()
      for (let i = 0; i < 50; i++) {
        await tableNoStats.put({ pk: `PERF#NO#${i}`, sk: 'ITEM', value: i })
      }
      const timeNoStats = Date.now() - startNoStats

      // With stats
      const tableWithStats = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      const startWithStats = Date.now()
      for (let i = 0; i < 50; i++) {
        await tableWithStats.put({
          pk: `PERF#WITH#${i}`,
          sk: 'ITEM',
          value: i,
        })
      }
      const timeWithStats = Date.now() - startWithStats

      console.log(
        `No stats: ${timeNoStats}ms, With stats: ${timeWithStats}ms`,
      )

      // Stats overhead should be less than 20%
      const overhead = (timeWithStats - timeNoStats) / timeNoStats
      expect(overhead).toBeLessThan(0.2)
    })
  })

  describe('Consumed capacity tracking', () => {
    it('should track consumed capacity when available', async () => {
      const table = new TableClient({
        tableName,
        client,
        statsConfig: {
          enabled: true,
        },
      })

      // Reset stats
      table.resetStats()

      // Perform operation with consumed capacity
      await table.query({
        keyCondition: {
          pk: 'CAPACITY#1',
        },
        returnConsumedCapacity: 'TOTAL',
      })

      const stats = table.getStats()

      // Note: DynamoDB Local might not return consumed capacity
      // This test verifies the tracking mechanism exists
      expect(stats.operations.query).toBeDefined()
    })
  })
})
