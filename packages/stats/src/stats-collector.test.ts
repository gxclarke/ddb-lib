import { describe, test, expect, beforeEach } from '@rstest/core'
import { StatsCollector } from './stats-collector'
import type { OperationRecord, StatsConfig } from './types'

describe('StatsCollector', () => {
  let collector: StatsCollector
  let config: StatsConfig

  beforeEach(() => {
    config = {
      enabled: true,
      sampleRate: 1.0,
      thresholds: {
        slowQueryMs: 1000,
        highRCU: 100,
        highWCU: 100,
      },
    }
    collector = new StatsCollector(config)
  })

  describe('constructor', () => {
    test('should create collector with default values', () => {
      const minimalCollector = new StatsCollector({ enabled: true })
      expect(minimalCollector.isEnabled()).toBe(true)
      expect(minimalCollector.getThresholds()).toEqual({
        slowQueryMs: 1000,
        highRCU: 100,
        highWCU: 100,
      })
    })

    test('should throw error for invalid sample rate', () => {
      expect(() => {
        new StatsCollector({ enabled: true, sampleRate: 1.5 })
      }).toThrow('sampleRate must be between 0 and 1')

      expect(() => {
        new StatsCollector({ enabled: true, sampleRate: -0.1 })
      }).toThrow('sampleRate must be between 0 and 1')
    })
  })

  describe('record', () => {
    test('should record operation when enabled', () => {
      const record: OperationRecord = {
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
        rcu: 1,
        itemCount: 1,
      }

      collector.record(record, 'test-table')
      expect(collector.getOperationCount()).toBe(1)
    })

    test('should not record when disabled', () => {
      const disabledCollector = new StatsCollector({ enabled: false })
      const record: OperationRecord = {
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
      }

      disabledCollector.record(record)
      expect(disabledCollector.getOperationCount()).toBe(0)
    })

    test('should apply sampling rate', () => {
      const sampledCollector = new StatsCollector({
        enabled: true,
        sampleRate: 0.5,
      })

      // Record many operations
      for (let i = 0; i < 1000; i++) {
        sampledCollector.record({
          operation: 'get',
          timestamp: Date.now(),
          latencyMs: 50,
        })
      }

      // With 50% sampling, we expect roughly 500 operations (allow some variance)
      const count = sampledCollector.getOperationCount()
      expect(count).toBeGreaterThan(400)
      expect(count).toBeLessThan(600)
    })

    test('should convert OperationRecord to OperationStats format', () => {
      const record: OperationRecord = {
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 100,
        rcu: 5,
        wcu: 0,
        itemCount: 10,
        scannedCount: 15,
        indexName: 'GSI1',
        patternName: 'getUsersByStatus',
      }

      collector.record(record, 'users-table')
      const exported = collector.export()

      expect(exported).toHaveLength(1)
      expect(exported[0]).toMatchObject({
        operation: 'query',
        latencyMs: 100,
        consumedRCU: 5,
        consumedWCU: 0,
        itemCount: 10,
        scannedCount: 15,
        indexName: 'GSI1',
        accessPattern: 'getUsersByStatus',
        tableName: 'users-table',
      })
    })
  })

  describe('getStats', () => {
    test('should return empty stats when no operations recorded', () => {
      const stats = collector.getStats()
      expect(stats.operations).toEqual({})
      expect(stats.accessPatterns).toEqual({})
    })

    test('should aggregate operations by type', () => {
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
        rcu: 1,
      })
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 100,
        rcu: 2,
      })
      collector.record({
        operation: 'put',
        timestamp: Date.now(),
        latencyMs: 75,
        wcu: 1,
      })

      const stats = collector.getStats()

      expect(stats.operations.get).toEqual({
        count: 2,
        totalLatencyMs: 150,
        avgLatencyMs: 75,
        totalRCU: 3,
        totalWCU: 0,
      })

      expect(stats.operations.put).toEqual({
        count: 1,
        totalLatencyMs: 75,
        avgLatencyMs: 75,
        totalRCU: 0,
        totalWCU: 1,
      })
    })

    test('should aggregate operations by access pattern', () => {
      collector.record({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 10,
        patternName: 'getUsersByStatus',
      })
      collector.record({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 200,
        itemCount: 20,
        patternName: 'getUsersByStatus',
      })

      const stats = collector.getStats()

      expect(stats.accessPatterns.getUsersByStatus).toEqual({
        count: 2,
        avgLatencyMs: 150,
        avgItemsReturned: 15,
      })
    })

    test('should handle operations without pattern names', () => {
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
      })

      const stats = collector.getStats()
      expect(stats.accessPatterns).toEqual({})
    })
  })

  describe('export', () => {
    test('should export all recorded operations', () => {
      const record1: OperationRecord = {
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
      }
      const record2: OperationRecord = {
        operation: 'put',
        timestamp: Date.now(),
        latencyMs: 75,
      }

      collector.record(record1)
      collector.record(record2)

      const exported = collector.export()
      expect(exported).toHaveLength(2)
    })

    test('should return a copy of operations array', () => {
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
      })

      const exported1 = collector.export()
      const exported2 = collector.export()

      expect(exported1).not.toBe(exported2)
      expect(exported1).toEqual(exported2)
    })
  })

  describe('reset', () => {
    test('should clear all recorded operations', () => {
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
      })
      collector.record({
        operation: 'put',
        timestamp: Date.now(),
        latencyMs: 75,
      })

      expect(collector.getOperationCount()).toBe(2)

      collector.reset()

      expect(collector.getOperationCount()).toBe(0)
      expect(collector.export()).toEqual([])
    })
  })

  describe('getOperationsInRange', () => {
    test('should return operations within time range', () => {
      const now = Date.now()

      collector.record({
        operation: 'get',
        timestamp: now - 2000,
        latencyMs: 50,
      })
      collector.record({
        operation: 'get',
        timestamp: now - 1000,
        latencyMs: 50,
      })
      collector.record({
        operation: 'get',
        timestamp: now,
        latencyMs: 50,
      })

      const ops = collector.getOperationsInRange(now - 1500, now - 500)
      expect(ops).toHaveLength(1)
      expect(ops[0].timestamp).toBe(now - 1000)
    })
  })

  describe('getOperationsByType', () => {
    test('should return operations of specific type', () => {
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
      })
      collector.record({
        operation: 'put',
        timestamp: Date.now(),
        latencyMs: 75,
      })
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 60,
      })

      const getOps = collector.getOperationsByType('get')
      expect(getOps).toHaveLength(2)
      expect(getOps.every(op => op.operation === 'get')).toBe(true)
    })
  })

  describe('getOperationsByPattern', () => {
    test('should return operations with specific pattern name', () => {
      collector.record({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 100,
        patternName: 'getUsersByStatus',
      })
      collector.record({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 150,
        patternName: 'getUsersByRole',
      })
      collector.record({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 120,
        patternName: 'getUsersByStatus',
      })

      const ops = collector.getOperationsByPattern('getUsersByStatus')
      expect(ops).toHaveLength(2)
      expect(ops.every(op => op.accessPattern === 'getUsersByStatus')).toBe(true)
    })
  })
})
