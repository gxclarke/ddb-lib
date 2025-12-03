/**
 * Tests for StatsCollector
 */

import { describe, test, expect } from '@rstest/core'
import { StatsCollector } from './stats-collector'
import type { StatsConfig, OperationStats } from './types'

describe('StatsCollector', () => {
  describe('constructor', () => {
    test('should create collector with default values', () => {
      const config: StatsConfig = { enabled: true }
      const collector = new StatsCollector(config)

      expect(collector.isEnabled()).toBe(true)
      expect(collector.getThresholds()).toEqual({
        slowQueryMs: 1000,
        highRCU: 100,
        highWCU: 100,
      })
    })

    test('should create collector with custom thresholds', () => {
      const config: StatsConfig = {
        enabled: true,
        thresholds: {
          slowQueryMs: 500,
          highRCU: 50,
          highWCU: 75,
        },
      }
      const collector = new StatsCollector(config)

      expect(collector.getThresholds()).toEqual({
        slowQueryMs: 500,
        highRCU: 50,
        highWCU: 75,
      })
    })

    test('should create collector with custom sample rate', () => {
      const config: StatsConfig = {
        enabled: true,
        sampleRate: 0.5,
      }
      const collector = new StatsCollector(config)

      expect(collector.isEnabled()).toBe(true)
    })

    test('should throw error for invalid sample rate below 0', () => {
      const config: StatsConfig = {
        enabled: true,
        sampleRate: -0.1,
      }

      expect(() => new StatsCollector(config)).toThrow(
        'sampleRate must be between 0 and 1'
      )
    })

    test('should throw error for invalid sample rate above 1', () => {
      const config: StatsConfig = {
        enabled: true,
        sampleRate: 1.5,
      }

      expect(() => new StatsCollector(config)).toThrow(
        'sampleRate must be between 0 and 1'
      )
    })

    test('should allow sample rate of 0', () => {
      const config: StatsConfig = {
        enabled: true,
        sampleRate: 0,
      }

      expect(() => new StatsCollector(config)).not.toThrow()
    })

    test('should allow sample rate of 1', () => {
      const config: StatsConfig = {
        enabled: true,
        sampleRate: 1,
      }

      expect(() => new StatsCollector(config)).not.toThrow()
    })
  })

  describe('recordOperation', () => {
    test('should record operation when enabled', () => {
      const collector = new StatsCollector({ enabled: true })

      const stats: OperationStats = {
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      }

      collector.recordOperation(stats)

      const exported = collector.export()
      expect(exported).toHaveLength(1)
      expect(exported[0]).toEqual(stats)
    })

    test('should not record operation when disabled', () => {
      const collector = new StatsCollector({ enabled: false })

      const stats: OperationStats = {
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      }

      collector.recordOperation(stats)

      const exported = collector.export()
      expect(exported).toHaveLength(0)
    })

    test('should record operation with all fields', () => {
      const collector = new StatsCollector({ enabled: true })

      const stats: OperationStats = {
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        accessPattern: 'getUserOrders',
        timestamp: Date.now(),
        latencyMs: 150,
        consumedRCU: 5,
        consumedWCU: 0,
        itemCount: 10,
        scannedCount: 12,
      }

      collector.recordOperation(stats)

      const exported = collector.export()
      expect(exported).toHaveLength(1)
      expect(exported[0]).toEqual(stats)
    })

    test('should record multiple operations', () => {
      const collector = new StatsCollector({ enabled: true })

      const stats1: OperationStats = {
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      }

      const stats2: OperationStats = {
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 75,
        consumedWCU: 1,
        itemCount: 1,
      }

      collector.recordOperation(stats1)
      collector.recordOperation(stats2)

      const exported = collector.export()
      expect(exported).toHaveLength(2)
      expect(exported[0]).toEqual(stats1)
      expect(exported[1]).toEqual(stats2)
    })

    test('should apply sampling with sampleRate 0', () => {
      const collector = new StatsCollector({ enabled: true, sampleRate: 0 })

      // Record 100 operations
      for (let i = 0; i < 100; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      // With sampleRate 0, no operations should be recorded
      const exported = collector.export()
      expect(exported).toHaveLength(0)
    })

    test('should record all operations with sampleRate 1', () => {
      const collector = new StatsCollector({ enabled: true, sampleRate: 1 })

      // Record 10 operations
      for (let i = 0; i < 10; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      // With sampleRate 1, all operations should be recorded
      const exported = collector.export()
      expect(exported).toHaveLength(10)
    })
  })

  describe('getStats', () => {
    test('should return empty stats when no operations recorded', () => {
      const collector = new StatsCollector({ enabled: true })

      const stats = collector.getStats()

      expect(stats.operations).toEqual({})
      expect(stats.accessPatterns).toEqual({})
    })

    test('should aggregate stats by operation type', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record multiple get operations
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })

      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 100,
        consumedRCU: 1,
        itemCount: 1,
      })

      const stats = collector.getStats()

      expect(stats.operations.get).toEqual({
        count: 2,
        totalLatencyMs: 150,
        avgLatencyMs: 75,
        totalRCU: 2,
        totalWCU: 0,
      })
    })

    test('should aggregate stats for multiple operation types', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })

      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 75,
        consumedWCU: 1,
        itemCount: 1,
      })

      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 200,
        consumedRCU: 5,
        itemCount: 10,
        scannedCount: 12,
      })

      const stats = collector.getStats()

      expect(stats.operations.get).toEqual({
        count: 1,
        totalLatencyMs: 50,
        avgLatencyMs: 50,
        totalRCU: 1,
        totalWCU: 0,
      })

      expect(stats.operations.put).toEqual({
        count: 1,
        totalLatencyMs: 75,
        avgLatencyMs: 75,
        totalRCU: 0,
        totalWCU: 1,
      })

      expect(stats.operations.query).toEqual({
        count: 1,
        totalLatencyMs: 200,
        avgLatencyMs: 200,
        totalRCU: 5,
        totalWCU: 0,
      })
    })

    test('should handle operations without consumed capacity', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      })

      const stats = collector.getStats()

      expect(stats.operations.get).toEqual({
        count: 1,
        totalLatencyMs: 50,
        avgLatencyMs: 50,
        totalRCU: 0,
        totalWCU: 0,
      })
    })

    test('should aggregate stats by access pattern', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        accessPattern: 'getUserOrders',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 5,
      })

      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        accessPattern: 'getUserOrders',
        timestamp: Date.now(),
        latencyMs: 200,
        itemCount: 10,
      })

      const stats = collector.getStats()

      expect(stats.accessPatterns.getUserOrders).toEqual({
        count: 2,
        avgLatencyMs: 150,
        avgItemsReturned: 7.5,
      })
    })

    test('should aggregate stats for multiple access patterns', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        accessPattern: 'getUserOrders',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 5,
      })

      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        accessPattern: 'getOrdersByStatus',
        timestamp: Date.now(),
        latencyMs: 150,
        itemCount: 20,
      })

      const stats = collector.getStats()

      expect(stats.accessPatterns.getUserOrders).toEqual({
        count: 1,
        avgLatencyMs: 100,
        avgItemsReturned: 5,
      })

      expect(stats.accessPatterns.getOrdersByStatus).toEqual({
        count: 1,
        avgLatencyMs: 150,
        avgItemsReturned: 20,
      })
    })

    test('should not include access pattern stats for operations without pattern', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      })

      const stats = collector.getStats()

      expect(stats.accessPatterns).toEqual({})
    })

    test('should calculate running averages correctly', () => {
      const collector = new StatsCollector({ enabled: true })

      // First operation: latency 100, items 10
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        accessPattern: 'testPattern',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 10,
      })

      // Second operation: latency 200, items 20
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        accessPattern: 'testPattern',
        timestamp: Date.now(),
        latencyMs: 200,
        itemCount: 20,
      })

      // Third operation: latency 300, items 30
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        accessPattern: 'testPattern',
        timestamp: Date.now(),
        latencyMs: 300,
        itemCount: 30,
      })

      const stats = collector.getStats()

      // Average latency: (100 + 200 + 300) / 3 = 200
      // Average items: (10 + 20 + 30) / 3 = 20
      expect(stats.accessPatterns.testPattern).toEqual({
        count: 3,
        avgLatencyMs: 200,
        avgItemsReturned: 20,
      })
    })
  })

  describe('export', () => {
    test('should return empty array when no operations recorded', () => {
      const collector = new StatsCollector({ enabled: true })

      const exported = collector.export()

      expect(exported).toEqual([])
    })

    test('should return copy of operations array', () => {
      const collector = new StatsCollector({ enabled: true })

      const stats: OperationStats = {
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      }

      collector.recordOperation(stats)

      const exported = collector.export()

      // Modifying exported array should not affect internal state
      exported.push({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 75,
        itemCount: 1,
      })

      expect(collector.export()).toHaveLength(1)
    })

    test('should export all recorded operations', () => {
      const collector = new StatsCollector({ enabled: true })

      const operations: OperationStats[] = [
        {
          operation: 'get',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        },
        {
          operation: 'put',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 75,
          itemCount: 1,
        },
        {
          operation: 'query',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 200,
          itemCount: 10,
        },
      ]

      for (const op of operations) {
        collector.recordOperation(op)
      }

      const exported = collector.export()

      expect(exported).toHaveLength(3)
      expect(exported).toEqual(operations)
    })
  })

  describe('reset', () => {
    test('should clear all recorded operations', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      })

      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 75,
        itemCount: 1,
      })

      expect(collector.export()).toHaveLength(2)

      collector.reset()

      expect(collector.export()).toHaveLength(0)
    })

    test('should clear aggregated stats', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      })

      expect(collector.getStats().operations.get).toBeDefined()

      collector.reset()

      const stats = collector.getStats()
      expect(stats.operations).toEqual({})
      expect(stats.accessPatterns).toEqual({})
    })

    test('should allow recording after reset', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      })

      collector.reset()

      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 75,
        itemCount: 1,
      })

      const exported = collector.export()
      expect(exported).toHaveLength(1)
      expect(exported[0].operation).toBe('put')
    })
  })

  describe('isEnabled', () => {
    test('should return true when enabled', () => {
      const collector = new StatsCollector({ enabled: true })

      expect(collector.isEnabled()).toBe(true)
    })

    test('should return false when disabled', () => {
      const collector = new StatsCollector({ enabled: false })

      expect(collector.isEnabled()).toBe(false)
    })
  })
})

describe('StatsCollector - Hot Partition Detection', () => {
  test('should detect hot partitions with >10% of traffic', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record 100 operations: 50 to one partition, 30 to another, 20 to a third
    for (let i = 0; i < 50; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 30; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 20; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI3',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const hotPartitions = collector.detectHotPartitions()

    // Should detect 3 hot partitions (all >10%)
    expect(hotPartitions).toHaveLength(3)

    // First should be the hottest (50%)
    expect(hotPartitions[0].partitionKey).toBe('TestTable:GSI1')
    expect(hotPartitions[0].accessCount).toBe(50)
    expect(hotPartitions[0].percentageOfTotal).toBeCloseTo(0.5, 2)
    expect(hotPartitions[0].recommendation).toContain('50.0%')

    // Second should be 30%
    expect(hotPartitions[1].partitionKey).toBe('TestTable:GSI2')
    expect(hotPartitions[1].accessCount).toBe(30)
    expect(hotPartitions[1].percentageOfTotal).toBeCloseTo(0.3, 2)

    // Third should be 20%
    expect(hotPartitions[2].partitionKey).toBe('TestTable:GSI3')
    expect(hotPartitions[2].accessCount).toBe(20)
    expect(hotPartitions[2].percentageOfTotal).toBeCloseTo(0.2, 2)
  })

  test('should not detect partitions with <=10% of traffic', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record 100 operations evenly distributed across 10 partitions (10% each)
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          indexName: `GSI${i}`,
          timestamp: Date.now(),
          latencyMs: 10,
          itemCount: 1,
        })
      }
    }

    const hotPartitions = collector.detectHotPartitions()

    // Should not detect any hot partitions (all exactly 10%)
    expect(hotPartitions).toHaveLength(0)
  })

  test('should return empty array when no operations recorded', () => {
    const collector = new StatsCollector({ enabled: true })

    const hotPartitions = collector.detectHotPartitions()

    expect(hotPartitions).toHaveLength(0)
  })

  test('should handle single partition with 100% traffic', () => {
    const collector = new StatsCollector({ enabled: true })

    for (let i = 0; i < 100; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const hotPartitions = collector.detectHotPartitions()

    expect(hotPartitions).toHaveLength(1)
    expect(hotPartitions[0].percentageOfTotal).toBe(1.0)
    expect(hotPartitions[0].recommendation).toContain('100.0%')
  })

  test('should sort hot partitions by percentage descending', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create partitions with different traffic levels
    for (let i = 0; i < 15; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 50; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 35; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI3',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const hotPartitions = collector.detectHotPartitions()

    expect(hotPartitions).toHaveLength(3)
    expect(hotPartitions[0].accessCount).toBe(50) // Highest
    expect(hotPartitions[1].accessCount).toBe(35) // Middle
    expect(hotPartitions[2].accessCount).toBe(15) // Lowest
  })

  test('should track primary index operations separately', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record operations on primary index (no indexName)
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    // Record operations on GSI
    for (let i = 0; i < 40; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const hotPartitions = collector.detectHotPartitions()

    expect(hotPartitions).toHaveLength(2)
    expect(hotPartitions[0].partitionKey).toBe('TestTable:primary')
    expect(hotPartitions[0].percentageOfTotal).toBeCloseTo(0.6, 2)
    expect(hotPartitions[1].partitionKey).toBe('TestTable:GSI1')
    expect(hotPartitions[1].percentageOfTotal).toBeCloseTo(0.4, 2)
  })
})

describe('StatsCollector - Scan Inefficiency Detection', () => {
  test('should detect scans with <20% efficiency', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record a very inefficient scan (5% efficiency)
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 500,
      itemCount: 5,
      scannedCount: 100,
    })

    // Record a moderately inefficient scan (15% efficiency)
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 15,
      scannedCount: 100,
    })

    const scanReports = collector.detectIneffientScans()

    expect(scanReports).toHaveLength(2)

    // Should be sorted by efficiency ascending (worst first)
    expect(scanReports[0].efficiency).toBeCloseTo(0.05, 2)
    expect(scanReports[0].scannedCount).toBe(100)
    expect(scanReports[0].returnedCount).toBe(5)
    expect(scanReports[0].recommendation).toContain('5.0%')

    expect(scanReports[1].efficiency).toBeCloseTo(0.15, 2)
    expect(scanReports[1].scannedCount).toBe(100)
    expect(scanReports[1].returnedCount).toBe(15)
  })

  test('should not detect scans with >=20% efficiency', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record efficient scans (>=20% efficiency)
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 200,
      itemCount: 20,
      scannedCount: 100,
    })

    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 200,
      itemCount: 50,
      scannedCount: 100,
    })

    const scanReports = collector.detectIneffientScans()

    expect(scanReports).toHaveLength(0)
  })

  test('should return empty array when no scans recorded', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record non-scan operations
    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 100,
      itemCount: 10,
      scannedCount: 10,
    })

    const scanReports = collector.detectIneffientScans()

    expect(scanReports).toHaveLength(0)
  })

  test('should handle scans without scannedCount', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record scan without scannedCount
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 200,
      itemCount: 10,
    })

    const scanReports = collector.detectIneffientScans()

    // Should not crash, should return empty array
    expect(scanReports).toHaveLength(0)
  })

  test('should handle scans with zero scannedCount', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record scan with zero scannedCount
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 200,
      itemCount: 0,
      scannedCount: 0,
    })

    const scanReports = collector.detectIneffientScans()

    // Should not crash, should return empty array
    expect(scanReports).toHaveLength(0)
  })

  test('should include index name in operation identifier', () => {
    const collector = new StatsCollector({ enabled: true })

    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 10,
      scannedCount: 100,
    })

    const scanReports = collector.detectIneffientScans()

    expect(scanReports).toHaveLength(1)
    expect(scanReports[0].operation).toBe('scan on TestTable:GSI1')
  })

  test('should not include index name when not present', () => {
    const collector = new StatsCollector({ enabled: true })

    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 10,
      scannedCount: 100,
    })

    const scanReports = collector.detectIneffientScans()

    expect(scanReports).toHaveLength(1)
    expect(scanReports[0].operation).toBe('scan on TestTable')
  })

  test('should sort scans by efficiency ascending', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record scans with different efficiencies
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 15,
      scannedCount: 100,
    })

    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 5,
      scannedCount: 100,
    })

    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 10,
      scannedCount: 100,
    })

    const scanReports = collector.detectIneffientScans()

    expect(scanReports).toHaveLength(3)
    expect(scanReports[0].efficiency).toBeCloseTo(0.05, 2) // Worst
    expect(scanReports[1].efficiency).toBeCloseTo(0.10, 2) // Middle
    expect(scanReports[2].efficiency).toBeCloseTo(0.15, 2) // Best (but still <20%)
  })

  test('should handle 0% efficiency (no items returned)', () => {
    const collector = new StatsCollector({ enabled: true })

    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 0,
      scannedCount: 100,
    })

    const scanReports = collector.detectIneffientScans()

    expect(scanReports).toHaveLength(1)
    expect(scanReports[0].efficiency).toBe(0)
    expect(scanReports[0].recommendation).toContain('0.0%')
  })
})

describe('StatsCollector - Unused Index Detection', () => {
  test('should detect indexes not used in 7 days', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000

    // Record operations on old indexes
    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI2',
      timestamp: tenDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const indexReports = collector.detectUnusedIndexes()

    expect(indexReports).toHaveLength(2)

    // Should be sorted by last used ascending (oldest first)
    expect(indexReports[0].indexName).toBe('TestTable:GSI2')
    expect(indexReports[0].lastUsed).toBe(tenDaysAgo)
    expect(indexReports[0].recommendation).toContain('not been used in the last 7 days')

    expect(indexReports[1].indexName).toBe('TestTable:GSI1')
    expect(indexReports[1].lastUsed).toBe(eightDaysAgo)
  })

  test('should not detect indexes used within 7 days', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const sixDaysAgo = now - 6 * 24 * 60 * 60 * 1000
    const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000

    // Record recent operations
    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: sixDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI2',
      timestamp: oneDayAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const indexReports = collector.detectUnusedIndexes()

    expect(indexReports).toHaveLength(0)
  })

  test('should return empty array when no indexes used', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record operations without indexes
    collector.recordOperation({
      operation: 'get',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 50,
      itemCount: 1,
    })

    const indexReports = collector.detectUnusedIndexes()

    expect(indexReports).toHaveLength(0)
  })

  test('should track multiple uses of same index', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000
    const nineDaysAgo = now - 9 * 24 * 60 * 60 * 1000

    // Record multiple operations on same index
    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: nineDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const indexReports = collector.detectUnusedIndexes()

    expect(indexReports).toHaveLength(1)
    expect(indexReports[0].indexName).toBe('TestTable:GSI1')
    expect(indexReports[0].usageCount).toBe(2)
    // Should use the most recent timestamp
    expect(indexReports[0].lastUsed).toBe(eightDaysAgo)
  })

  test('should handle mix of recent and old index usage', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000

    // Old index
    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    // Recent index
    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI2',
      timestamp: twoDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const indexReports = collector.detectUnusedIndexes()

    // Should only report the old index
    expect(indexReports).toHaveLength(1)
    expect(indexReports[0].indexName).toBe('TestTable:GSI1')
  })

  test('should sort indexes by last used ascending', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000
    const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000

    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: tenDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI2',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI3',
      timestamp: fifteenDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const indexReports = collector.detectUnusedIndexes()

    expect(indexReports).toHaveLength(3)
    expect(indexReports[0].lastUsed).toBe(fifteenDaysAgo) // Oldest
    expect(indexReports[1].lastUsed).toBe(tenDaysAgo) // Middle
    expect(indexReports[2].lastUsed).toBe(eightDaysAgo) // Most recent (but still >7 days)
  })

  test('should handle indexes on different tables', () => {
    const collector = new StatsCollector({ enabled: true })

    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000

    collector.recordOperation({
      operation: 'query',
      tableName: 'Table1',
      indexName: 'GSI1',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    collector.recordOperation({
      operation: 'query',
      tableName: 'Table2',
      indexName: 'GSI1',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const indexReports = collector.detectUnusedIndexes()

    expect(indexReports).toHaveLength(2)
    expect(indexReports[0].indexName).toBe('Table1:GSI1')
    expect(indexReports[1].indexName).toBe('Table2:GSI1')
  })
})

describe('StatsCollector - Capacity Mode Recommendations', () => {
  test('should recommend on-demand for no operations', () => {
    const collector = new StatsCollector({ enabled: true })

    const recommendation = collector.suggestCapacityMode()

    expect(recommendation.currentMode).toBe('unknown')
    expect(recommendation.recommendedMode).toBe('on-demand')
    expect(recommendation.reasoning).toContain('No operations recorded')
  })

  test('should recommend on-demand for highly variable traffic', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    // Create spiky traffic: 100 ops in hour 1, 10 ops in hour 2, 5 ops in hour 3
    for (let i = 0; i < 100; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now,
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 10; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now + oneHour,
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 5; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now + 2 * oneHour,
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })
    }

    const recommendation = collector.suggestCapacityMode()

    expect(recommendation.recommendedMode).toBe('on-demand')
    expect(recommendation.reasoning).toContain('variable')
  })

  test('should recommend provisioned for steady traffic', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    // Create steady traffic: 50 ops per hour for 5 hours
    for (let hour = 0; hour < 5; hour++) {
      for (let i = 0; i < 50; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: now + hour * oneHour,
          latencyMs: 50,
          consumedRCU: 1,
          itemCount: 1,
        })
      }
    }

    const recommendation = collector.suggestCapacityMode()

    expect(recommendation.recommendedMode).toBe('provisioned')
    expect(recommendation.reasoning).toContain('steady')
  })

  test('should recommend on-demand for traffic with idle periods', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    // Create traffic with idle periods: 100 ops in hour 1, 5 ops in hours 2-5
    for (let i = 0; i < 100; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now,
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })
    }

    for (let hour = 1; hour < 5; hour++) {
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: now + hour * oneHour,
          latencyMs: 50,
          consumedRCU: 1,
          itemCount: 1,
        })
      }
    }

    const recommendation = collector.suggestCapacityMode()

    // This pattern will be detected as highly variable, which also recommends on-demand
    expect(recommendation.recommendedMode).toBe('on-demand')
    expect(recommendation.reasoning).toBeTruthy()
  })

  test('should calculate estimated costs', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()

    // Record some operations with capacity consumption
    for (let i = 0; i < 100; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now,
        latencyMs: 50,
        consumedRCU: 1,
        consumedWCU: 0,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 50; i++) {
      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: now,
        latencyMs: 75,
        consumedRCU: 0,
        consumedWCU: 1,
        itemCount: 1,
      })
    }

    const recommendation = collector.suggestCapacityMode()

    expect(recommendation.estimatedMonthlyCost.recommended).toBeGreaterThan(0)
  })

  test('should handle operations without capacity data', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()

    // Record operations without consumedRCU/WCU
    for (let i = 0; i < 50; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now,
        latencyMs: 50,
        itemCount: 1,
      })
    }

    const recommendation = collector.suggestCapacityMode()

    // Should not crash and should provide a recommendation
    expect(recommendation.recommendedMode).toBeDefined()
    expect(['provisioned', 'on-demand']).toContain(recommendation.recommendedMode)
  })

  test('should provide reasoning for recommendation', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()

    for (let i = 0; i < 50; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now,
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })
    }

    const recommendation = collector.suggestCapacityMode()

    expect(recommendation.reasoning).toBeTruthy()
    expect(recommendation.reasoning.length).toBeGreaterThan(0)
  })

  test('should set currentMode to unknown when not provided', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()

    collector.recordOperation({
      operation: 'get',
      tableName: 'TestTable',
      timestamp: now,
      latencyMs: 50,
      consumedRCU: 1,
      itemCount: 1,
    })

    const recommendation = collector.suggestCapacityMode()

    expect(recommendation.currentMode).toBe('unknown')
  })
})

describe('StatsCollector - Recommendation Generation', () => {
  test('should return empty array when no issues detected', () => {
    const collector = new StatsCollector({ enabled: true })

    const recommendations = collector.getRecommendations()

    expect(recommendations).toHaveLength(0)
  })

  test('should generate hot partition recommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create hot partition (>50% traffic)
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 40; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const hotPartitionRecs = recommendations.filter(r => r.category === 'hot-partition')
    expect(hotPartitionRecs.length).toBeGreaterThan(0)

    const errorRec = hotPartitionRecs.find(r => r.severity === 'error')
    expect(errorRec).toBeDefined()
    expect(errorRec?.message).toContain('Hot partition detected')
  })

  test('should generate scan inefficiency recommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create inefficient scan
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 500,
      itemCount: 5,
      scannedCount: 100,
    })

    const recommendations = collector.getRecommendations()

    const scanRecs = recommendations.filter(r => r.category === 'performance')
    expect(scanRecs.length).toBeGreaterThan(0)
    expect(scanRecs[0].message).toContain('Inefficient scan')
    expect(scanRecs[0].suggestedAction).toContain('query')
  })

  test('should generate unused index recommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000

    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const recommendations = collector.getRecommendations()

    const indexRecs = recommendations.filter(r => r.category === 'cost')
    expect(indexRecs.length).toBeGreaterThan(0)
    expect(indexRecs[0].message).toContain('Unused index')
  })

  test('should generate capacity mode recommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    const now = Date.now()

    // Create some traffic
    for (let i = 0; i < 50; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: now,
        latencyMs: 50,
        consumedRCU: 1,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const capacityRecs = recommendations.filter(r => r.category === 'capacity')
    expect(capacityRecs.length).toBeGreaterThan(0)
    expect(capacityRecs[0].message).toContain('capacity mode')
  })

  test('should prioritize recommendations by severity', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create multiple issues with different severities

    // Hot partition (error severity - >50%)
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    // Inefficient scan (warning severity - 5-10% efficiency)
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 500,
      itemCount: 8,
      scannedCount: 100,
    })

    // Unused index (info severity)
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    collector.recordOperation({
      operation: 'query',
      tableName: 'TestTable',
      indexName: 'GSI2',
      timestamp: eightDaysAgo,
      latencyMs: 100,
      itemCount: 10,
    })

    const recommendations = collector.getRecommendations()

    // Should be sorted by severity: error, warning, info
    expect(recommendations.length).toBeGreaterThan(2)
    expect(recommendations[0].severity).toBe('error')

    const warningIndex = recommendations.findIndex(r => r.severity === 'warning')
    const infoIndex = recommendations.findIndex(r => r.severity === 'info')

    if (warningIndex !== -1 && infoIndex !== -1) {
      expect(warningIndex).toBeLessThan(infoIndex)
    }
  })

  test('should include suggested actions in recommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create inefficient scan
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 500,
      itemCount: 5,
      scannedCount: 100,
    })

    const recommendations = collector.getRecommendations()

    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0].suggestedAction).toBeTruthy()
    expect(recommendations[0].suggestedAction?.length).toBeGreaterThan(0)
  })

  test('should include estimated impact in recommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create inefficient scan
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 500,
      itemCount: 5,
      scannedCount: 100,
    })

    const recommendations = collector.getRecommendations()

    const scanRec = recommendations.find(r => r.category === 'performance')
    expect(scanRec?.estimatedImpact).toBeDefined()
    expect(scanRec?.estimatedImpact?.costReduction).toBeTruthy()
  })

  test('should handle multiple recommendations of same type', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create multiple inefficient scans
    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      timestamp: Date.now(),
      latencyMs: 500,
      itemCount: 5,
      scannedCount: 100,
    })

    collector.recordOperation({
      operation: 'scan',
      tableName: 'TestTable',
      indexName: 'GSI1',
      timestamp: Date.now(),
      latencyMs: 300,
      itemCount: 10,
      scannedCount: 100,
    })

    const recommendations = collector.getRecommendations()

    const scanRecs = recommendations.filter(r => r.category === 'performance')
    expect(scanRecs.length).toBe(2)
  })

  test('should assign correct severity levels', () => {
    const collector = new StatsCollector({ enabled: true })

    // Very hot partition (>50% = error)
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    // Moderately hot partition (30-50% = warning)
    for (let i = 0; i < 35; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    // Slightly hot partition (10-30% = info)
    for (let i = 0; i < 15; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI3',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const hotPartitionRecs = recommendations.filter(r => r.category === 'hot-partition')
    expect(hotPartitionRecs.length).toBe(3)

    const errorRecs = hotPartitionRecs.filter(r => r.severity === 'error')
    const warningRecs = hotPartitionRecs.filter(r => r.severity === 'warning')
    const infoRecs = hotPartitionRecs.filter(r => r.severity === 'info')

    expect(errorRecs.length).toBeGreaterThan(0)
    expect(warningRecs.length).toBeGreaterThan(0)
    expect(infoRecs.length).toBeGreaterThan(0)
  })
})

describe('StatsCollector - Multi-Attribute Key Opportunity Detection', () => {
  test('should detect indexes with high usage as candidates for multi-attribute keys', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record many operations on an index (>10 threshold)
    for (let i = 0; i < 15; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 10,
      })
    }

    const recommendations = collector.getRecommendations()

    const multiAttrRecs = recommendations.filter(r =>
      r.category === 'best-practice' && r.message.includes('multi-attribute keys')
    )

    expect(multiAttrRecs.length).toBeGreaterThan(0)
    expect(multiAttrRecs[0].message).toContain('TestTable:GSI1')
    expect(multiAttrRecs[0].details).toContain('concatenated strings')
  })

  test('should not recommend multi-attribute keys for low-usage indexes', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record few operations on an index (<=10 threshold)
    for (let i = 0; i < 5; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 10,
      })
    }

    const recommendations = collector.getRecommendations()

    const multiAttrRecs = recommendations.filter(r =>
      r.category === 'best-practice' && r.message.includes('multi-attribute keys')
    )

    expect(multiAttrRecs.length).toBe(0)
  })

  test('should recommend multi-attribute keys for multiple high-usage indexes', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record operations on multiple indexes
    for (let i = 0; i < 15; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 10,
      })
    }

    for (let i = 0; i < 20; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 10,
      })
    }

    const recommendations = collector.getRecommendations()

    const multiAttrRecs = recommendations.filter(r =>
      r.category === 'best-practice' && r.message.includes('multi-attribute keys')
    )

    expect(multiAttrRecs.length).toBe(2)
  })

  test('should include suggested action in multi-attribute key recommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    for (let i = 0; i < 15; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 10,
      })
    }

    const recommendations = collector.getRecommendations()

    const multiAttrRecs = recommendations.filter(r =>
      r.category === 'best-practice' && r.message.includes('multi-attribute keys')
    )

    expect(multiAttrRecs[0].suggestedAction).toContain('type safety')
  })

  test('should not recommend for operations without indexes', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record operations without indexes
    for (let i = 0; i < 20; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const multiAttrRecs = recommendations.filter(r =>
      r.category === 'best-practice' && r.message.includes('multi-attribute keys')
    )

    expect(multiAttrRecs.length).toBe(0)
  })
})

describe('StatsCollector - Hot Partition Multi-Attribute Key Recommendations', () => {
  test('should suggest multi-attribute keys for hot GSI partitions', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create hot partition on GSI (>50% traffic)
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 40; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const hotPartitionRecs = recommendations.filter(r => r.category === 'hot-partition')
    expect(hotPartitionRecs.length).toBeGreaterThan(0)

    // Should suggest multi-attribute keys for GSI
    const gsiRec = hotPartitionRecs.find(r => r.message.includes('GSI1'))
    expect(gsiRec).toBeDefined()
    expect(gsiRec?.suggestedAction).toContain('multi-attribute composite keys')
  })

  test('should not suggest multi-attribute keys for primary index hot partitions', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create hot partition on primary index
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 40; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const hotPartitionRecs = recommendations.filter(r => r.category === 'hot-partition')

    // Primary index recommendation should not mention multi-attribute keys
    const primaryRec = hotPartitionRecs.find(r => r.message.includes('primary'))
    if (primaryRec) {
      expect(primaryRec.suggestedAction).not.toContain('multi-attribute composite keys')
    }
  })

  test('should provide examples of attribute combinations for GSI hot partitions', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create hot partition on GSI
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'StatusIndex',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 40; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const hotPartitionRecs = recommendations.filter(r => r.category === 'hot-partition')
    const gsiRec = hotPartitionRecs.find(r => r.message.includes('StatusIndex'))

    expect(gsiRec).toBeDefined()
    expect(gsiRec?.suggestedAction).toContain('tenantId')
    expect(gsiRec?.suggestedAction).toContain('region')
    expect(gsiRec?.suggestedAction).toContain('category')
  })

  test('should include multi-attribute key suggestion for all GSI hot partitions', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create multiple hot GSI partitions
    for (let i = 0; i < 40; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 35; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    for (let i = 0; i < 25; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI3',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const hotPartitionRecs = recommendations.filter(r => r.category === 'hot-partition')

    // All should be GSI hot partitions
    expect(hotPartitionRecs.length).toBe(3)

    // All should suggest multi-attribute keys
    for (const rec of hotPartitionRecs) {
      expect(rec.suggestedAction).toContain('multi-attribute composite keys')
    }
  })

  test('should maintain severity levels with multi-attribute key suggestions', () => {
    const collector = new StatsCollector({ enabled: true })

    // Create very hot partition (>50% = error)
    for (let i = 0; i < 60; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI1',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    // Create moderately hot partition (30-50% = warning)
    for (let i = 0; i < 35; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        indexName: 'GSI2',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
      })
    }

    const recommendations = collector.getRecommendations()

    const hotPartitionRecs = recommendations.filter(r => r.category === 'hot-partition')

    const errorRec = hotPartitionRecs.find(r => r.severity === 'error')
    const warningRec = hotPartitionRecs.find(r => r.severity === 'warning')

    expect(errorRec).toBeDefined()
    expect(warningRec).toBeDefined()

    // Both should suggest multi-attribute keys
    expect(errorRec?.suggestedAction).toContain('multi-attribute composite keys')
    expect(warningRec?.suggestedAction).toContain('multi-attribute composite keys')
  })
})

describe('StatsCollector - Batch Opportunity Detection', () => {
  describe('detectBatchOpportunities', () => {
    test('should detect batchGet opportunities', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record 10 get operations within 500ms window
      for (let i = 0; i < 10; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 50, // 50ms apart
          latencyMs: 10,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      expect(opportunities.length).toBeGreaterThan(0)

      const batchGetOpp = opportunities.find(
        (opp) => opp.message.includes('Batch get opportunity')
      )

      expect(batchGetOpp).toBeDefined()
      expect(batchGetOpp?.severity).toBe('info')
      expect(batchGetOpp?.category).toBe('performance')
      expect(batchGetOpp?.details).toContain('10 individual get operations')
      expect(batchGetOpp?.suggestedAction).toContain('batchGet()')
    })

    test('should detect batchWrite opportunities for put operations', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record 8 put operations within 500ms window
      for (let i = 0; i < 8; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 60, // 60ms apart
          latencyMs: 15,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      expect(opportunities.length).toBeGreaterThan(0)

      const batchWriteOpp = opportunities.find(
        (opp) => opp.message.includes('Batch write opportunity')
      )

      expect(batchWriteOpp).toBeDefined()
      expect(batchWriteOpp?.severity).toBe('info')
      expect(batchWriteOpp?.category).toBe('performance')
      expect(batchWriteOpp?.details).toContain('8 individual write operations')
      expect(batchWriteOpp?.details).toContain('8 puts')
      expect(batchWriteOpp?.suggestedAction).toContain('batchWrite()')
    })

    test('should detect batchWrite opportunities for delete operations', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record 6 delete operations within 500ms window
      for (let i = 0; i < 6; i++) {
        collector.recordOperation({
          operation: 'delete',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 80, // 80ms apart
          latencyMs: 12,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      expect(opportunities.length).toBeGreaterThan(0)

      const batchWriteOpp = opportunities.find(
        (opp) => opp.message.includes('Batch write opportunity')
      )

      expect(batchWriteOpp).toBeDefined()
      expect(batchWriteOpp?.details).toContain('6 individual write operations')
      expect(batchWriteOpp?.details).toContain('6 deletes')
    })

    test('should detect batchWrite opportunities for mixed put and delete operations', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record 5 puts and 3 deletes within 500ms window
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 50,
          latencyMs: 15,
          itemCount: 1,
        })
      }

      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'delete',
          tableName: 'TestTable',
          timestamp: baseTimestamp + 250 + i * 50,
          latencyMs: 12,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      expect(opportunities.length).toBeGreaterThan(0)

      const batchWriteOpp = opportunities.find(
        (opp) => opp.message.includes('Batch write opportunity')
      )

      expect(batchWriteOpp).toBeDefined()
      expect(batchWriteOpp?.details).toContain('8 individual write operations')
      expect(batchWriteOpp?.details).toContain('5 puts')
      expect(batchWriteOpp?.details).toContain('3 deletes')
    })

    test('should not detect opportunities when operations are spread out', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record 10 get operations spread over 5 seconds (500ms apart)
      for (let i = 0; i < 10; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 500,
          latencyMs: 10,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      // Should not detect batch opportunities for spread out operations
      const batchGetOpp = opportunities.find(
        (opp) => opp.message.includes('Batch get opportunity')
      )

      expect(batchGetOpp).toBeUndefined()
    })

    test('should not detect opportunities when operation count is below threshold', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record only 3 get operations (below threshold of 5)
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 50,
          latencyMs: 10,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      const batchGetOpp = opportunities.find(
        (opp) => opp.message.includes('Batch get opportunity')
      )

      expect(batchGetOpp).toBeUndefined()
    })

    test('should include batch opportunities in getRecommendations', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record operations that should trigger batch opportunity
      for (let i = 0; i < 10; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 50,
          latencyMs: 10,
          itemCount: 1,
        })
      }

      const recommendations = collector.getRecommendations()

      const batchRec = recommendations.find(
        (rec) => rec.message.includes('Batch get opportunity')
      )

      expect(batchRec).toBeDefined()
      expect(batchRec?.category).toBe('performance')
    })

    test('should estimate impact for batch opportunities', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record 100 get operations (should suggest 1 batch request)
      for (let i = 0; i < 100; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 5,
          latencyMs: 10,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      const batchGetOpp = opportunities.find(
        (opp) => opp.message.includes('Batch get opportunity')
      )

      expect(batchGetOpp?.estimatedImpact?.performanceImprovement).toContain(
        'Reduce 100 requests to 1 batch'
      )
    })

    test('should estimate impact for batch write with chunking', () => {
      const collector = new StatsCollector({ enabled: true })
      const baseTimestamp = Date.now()

      // Record 50 put operations (should suggest 2 batch requests at 25 per batch)
      for (let i = 0; i < 50; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTimestamp + i * 10,
          latencyMs: 15,
          itemCount: 1,
        })
      }

      const opportunities = collector.detectBatchOpportunities()

      const batchWriteOpp = opportunities.find(
        (opp) => opp.message.includes('Batch write opportunity')
      )

      expect(batchWriteOpp?.estimatedImpact?.performanceImprovement).toContain(
        'Reduce 50 requests to 2 batch'
      )
    })
  })
})

describe('detectProjectionOpportunities', () => {
  test('should detect when operations do not use projections', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record 20 get operations without projection
    for (let i = 0; i < 20; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
        usedProjection: false,
      })
    }

    const opportunities = collector.detectProjectionOpportunities()

    expect(opportunities.length).toBeGreaterThan(0)
    const projectionRec = opportunities.find((opp) =>
      opp.message.includes('projection expressions for get')
    )
    expect(projectionRec).toBeDefined()
    expect(projectionRec?.category).toBe('performance')
    expect(projectionRec?.severity).toBe('info')
  })

  test('should not recommend projections when usage is high', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record 15 operations with projection, 5 without (75% usage)
    for (let i = 0; i < 15; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 5,
        usedProjection: true,
        projectedAttributeCount: 3,
      })
    }

    for (let i = 0; i < 5; i++) {
      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 5,
        usedProjection: false,
      })
    }

    const opportunities = collector.detectProjectionOpportunities()

    const projectionRec = opportunities.find((opp) =>
      opp.message.includes('projection expressions for query')
    )
    expect(projectionRec).toBeUndefined()
  })

  test('should recommend projections for multiple operation types', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record operations without projection for different types
    for (let i = 0; i < 15; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
        usedProjection: false,
      })

      collector.recordOperation({
        operation: 'query',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 20,
        itemCount: 10,
        usedProjection: false,
      })
    }

    const opportunities = collector.detectProjectionOpportunities()

    expect(opportunities.length).toBeGreaterThanOrEqual(2)
    expect(opportunities.some((opp) => opp.message.includes('get'))).toBe(true)
    expect(opportunities.some((opp) => opp.message.includes('query'))).toBe(true)
  })

  test('should include projection opportunities in getRecommendations', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record operations without projection
    for (let i = 0; i < 20; i++) {
      collector.recordOperation({
        operation: 'scan',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 100,
        scannedCount: 100,
        usedProjection: false,
      })
    }

    const recommendations = collector.getRecommendations()

    const projectionRec = recommendations.find((rec) =>
      rec.message.includes('projection expressions')
    )
    expect(projectionRec).toBeDefined()
    expect(projectionRec?.estimatedImpact?.performanceImprovement).toContain(
      'Reduced data transfer'
    )
  })

  test('should not recommend when operation count is low', () => {
    const collector = new StatsCollector({ enabled: true })

    // Record only 5 operations (below threshold of 10)
    for (let i = 0; i < 5; i++) {
      collector.recordOperation({
        operation: 'get',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 10,
        itemCount: 1,
        usedProjection: false,
      })
    }

    const opportunities = collector.detectProjectionOpportunities()

    expect(opportunities.length).toBe(0)
  })
})
