/**
 * Tests for StatsCollector anti-pattern detection
 */

import { describe, test, expect } from '@rstest/core'
import { StatsCollector } from './stats-collector'
import type { OperationStats } from './types'

describe('StatsCollector - Anti-Pattern Detection', () => {
  describe('detectFetchingToFilter', () => {
    test('should detect queries with low efficiency (client-side filtering)', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record multiple query operations with low efficiency
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          indexName: 'GSI1',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 10,
          scannedCount: 100, // 10% efficiency
        })
      }

      const recommendations = collector.detectFetchingToFilter()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].severity).toBe('warning')
      expect(recommendations[0].category).toBe('performance')
      expect(recommendations[0].message).toContain('client-side filtering')
      expect(recommendations[0].details).toContain('10.0% efficiency')
      expect(recommendations[0].suggestedAction).toContain('FilterExpression')
    })

    test('should not detect queries with high efficiency', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record query operations with high efficiency
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 90,
          scannedCount: 100, // 90% efficiency
        })
      }

      const recommendations = collector.detectFetchingToFilter()

      expect(recommendations).toHaveLength(0)
    })

    test('should require minimum number of operations', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record only 2 operations (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 10,
          scannedCount: 100,
        })
      }

      const recommendations = collector.detectFetchingToFilter()

      expect(recommendations).toHaveLength(0)
    })

    test('should group by access pattern', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations for different access patterns
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          accessPattern: 'getUserOrders',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 10,
          scannedCount: 100,
        })
      }

      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          accessPattern: 'getOrdersByStatus',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 80,
          scannedCount: 100, // High efficiency
        })
      }

      const recommendations = collector.detectFetchingToFilter()

      // Should only detect the low-efficiency pattern
      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].message).toContain('getUserOrders')
    })

    test('should use info severity for moderate inefficiency', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations with 40% efficiency (moderate)
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 40,
          scannedCount: 100,
        })
      }

      const recommendations = collector.detectFetchingToFilter()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].severity).toBe('info')
    })

    test('should handle operations without scannedCount', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations without scannedCount
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 10,
        })
      }

      const recommendations = collector.detectFetchingToFilter()

      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectSequentialWrites', () => {
    test('should detect multiple writes in short time window', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record 5 put operations within 500ms
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectSequentialWrites()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].severity).toBe('info')
      expect(recommendations[0].category).toBe('performance')
      expect(recommendations[0].message).toContain('Sequential write')
      expect(recommendations[0].details).toContain('5')
      expect(recommendations[0].suggestedAction).toContain('batchWrite')
    })

    test('should detect mixed put and delete operations', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record mixed operations
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      for (let i = 0; i < 2; i++) {
        collector.recordOperation({
          operation: 'delete',
          tableName: 'TestTable',
          timestamp: baseTime + (i + 3) * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectSequentialWrites()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].details).toContain('3 puts')
      expect(recommendations[0].details).toContain('2 deletes')
    })

    test('should not detect writes spread over long time period', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record operations spread over 5 seconds (beyond 1 second window)
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 2000, // 2 seconds apart
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectSequentialWrites()

      expect(recommendations).toHaveLength(0)
    })

    test('should require minimum number of operations', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record only 2 operations (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectSequentialWrites()

      expect(recommendations).toHaveLength(0)
    })

    test('should detect multiple clusters', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // First cluster
      for (let i = 0; i < 4; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      // Second cluster (3 seconds later)
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + 3000 + i * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectSequentialWrites()

      expect(recommendations).toHaveLength(2)
    })

    test('should calculate batch reduction correctly', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record 30 operations (would need 2 batches of 25)
      for (let i = 0; i < 30; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 30,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectSequentialWrites()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].estimatedImpact?.performanceImprovement).toContain('30 requests to 2 batch')
    })
  })

  describe('detectReadBeforeWrite', () => {
    test('should detect get followed by put on same key', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()
      const key = 'USER#123'

      // Record multiple get-then-put patterns
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 10000,
          latencyMs: 50,
          itemCount: 1,
        })

        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 10000 + 100, // 100ms after get
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectReadBeforeWrite()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].severity).toBe('info')
      expect(recommendations[0].category).toBe('performance')
      expect(recommendations[0].message).toContain('Read-before-write')
      expect(recommendations[0].details).toContain('3 instances')
      expect(recommendations[0].suggestedAction).toContain('update()')
    })

    test('should include sort key in key matching', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record pattern with sort key
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          partitionKey: 'USER#123',
          sortKey: 'PROFILE',
          timestamp: baseTime + i * 10000,
          latencyMs: 50,
          itemCount: 1,
        })

        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: 'USER#123',
          sortKey: 'PROFILE',
          timestamp: baseTime + i * 10000 + 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectReadBeforeWrite()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].details).toContain('USER#123#PROFILE')
    })

    test('should not detect put before get', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()
      const key = 'USER#123'

      // Record put before get (wrong order)
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 10000,
          latencyMs: 50,
          itemCount: 1,
        })

        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 10000 + 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectReadBeforeWrite()

      expect(recommendations).toHaveLength(0)
    })

    test('should respect time window', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()
      const key = 'USER#123'

      // Record get and put too far apart (>5 seconds)
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 20000,
          latencyMs: 50,
          itemCount: 1,
        })

        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 20000 + 6000, // 6 seconds after get
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectReadBeforeWrite()

      expect(recommendations).toHaveLength(0)
    })

    test('should require minimum occurrences', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()
      const key = 'USER#123'

      // Record only 2 patterns (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 10000,
          latencyMs: 50,
          itemCount: 1,
        })

        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: key,
          timestamp: baseTime + i * 10000 + 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectReadBeforeWrite()

      expect(recommendations).toHaveLength(0)
    })

    test('should handle operations without partition key', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record operations without partition key
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'get',
          tableName: 'TestTable',
          timestamp: baseTime + i * 10000,
          latencyMs: 50,
          itemCount: 1,
        })

        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 10000 + 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectReadBeforeWrite()

      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectLargeItems', () => {
    test('should detect items between 100KB and 300KB', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations with items around 150KB
      for (let i = 0; i < 3; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 1,
          itemSizeBytes: 150 * 1024,
        })
      }

      const recommendations = collector.detectLargeItems()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].severity).toBe('info')
      expect(recommendations[0].category).toBe('best-practice')
      expect(recommendations[0].message).toContain('100KB-300KB')
      expect(recommendations[0].suggestedAction).toContain('S3')
    })

    test('should detect items exceeding 300KB with warning severity', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations with very large items
      for (let i = 0; i < 2; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 1,
          itemSizeBytes: 350 * 1024,
        })
      }

      const recommendations = collector.detectLargeItems()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].severity).toBe('warning')
      expect(recommendations[0].message).toContain('>300KB')
      expect(recommendations[0].suggestedAction).toContain('URGENT')
    })

    test('should generate separate recommendations for different size ranges', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record items in both ranges
      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 1,
        itemSizeBytes: 150 * 1024, // 150KB
      })

      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 1,
        itemSizeBytes: 350 * 1024, // 350KB
      })

      const recommendations = collector.detectLargeItems()

      expect(recommendations).toHaveLength(2)
      expect(recommendations.some(r => r.severity === 'info')).toBe(true)
      expect(recommendations.some(r => r.severity === 'warning')).toBe(true)
    })

    test('should not detect items below 100KB', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations with small items
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
          itemSizeBytes: 50 * 1024, // 50KB
        })
      }

      const recommendations = collector.detectLargeItems()

      expect(recommendations).toHaveLength(0)
    })

    test('should include average and max sizes in details', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 1,
        itemSizeBytes: 100 * 1024,
      })

      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 1,
        itemSizeBytes: 200 * 1024,
      })

      const recommendations = collector.detectLargeItems()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].details).toContain('avg: 150.0KB')
      expect(recommendations[0].details).toContain('max: 200.0KB')
    })

    test('should track update operations as well as put', () => {
      const collector = new StatsCollector({ enabled: true })

      collector.recordOperation({
        operation: 'update',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 1,
        itemSizeBytes: 150 * 1024,
      })

      const recommendations = collector.detectLargeItems()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].affectedOperations).toContain('update')
    })

    test('should handle operations without itemSizeBytes', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations without size tracking
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectLargeItems()

      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectUniformPartitionKeys', () => {
    test('should detect sequential numeric partition keys', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations with sequential keys
      for (let i = 1; i <= 25; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: `USER#${i}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].severity).toBe('warning')
      expect(recommendations[0].category).toBe('best-practice')
      expect(recommendations[0].message).toContain('Sequential partition key')
      expect(recommendations[0].suggestedAction).toContain('hash-based')
    })

    test('should detect timestamp-based partition keys', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Record operations with timestamp keys
      for (let i = 0; i < 25; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: `${baseTime + i * 1000}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].message).toContain('Timestamp-based')
      expect(recommendations[0].suggestedAction).toContain('timestamps in sort keys')
    })

    test('should detect ISO date partition keys', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations with ISO date keys
      for (let i = 0; i < 25; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: `2025-12-${String(i + 1).padStart(2, '0')}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].message).toContain('Timestamp-based')
    })

    test('should not detect random/hashed partition keys', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations with random keys
      for (let i = 0; i < 25; i++) {
        const randomId = Math.random().toString(36).substring(7)
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: `USER#${randomId}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      expect(recommendations).toHaveLength(0)
    })

    test('should require minimum sample size', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record only 10 operations (below threshold of 20)
      for (let i = 1; i <= 10; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: `USER#${i}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      expect(recommendations).toHaveLength(0)
    })

    test('should not detect if less than 50% are sequential', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record mix of sequential and random keys
      for (let i = 1; i <= 10; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: `USER#${i}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      for (let i = 0; i < 15; i++) {
        const randomId = Math.random().toString(36).substring(7)
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          partitionKey: `USER#${randomId}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      // Should not detect sequential pattern (only 40% sequential)
      expect(recommendations.filter(r => r.message.includes('Sequential'))).toHaveLength(0)
    })

    test('should handle operations without partition key', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record operations without partition key
      for (let i = 0; i < 25; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      expect(recommendations).toHaveLength(0)
    })

    test('should track update operations as well as put', () => {
      const collector = new StatsCollector({ enabled: true })

      // Record update operations with sequential keys
      for (let i = 1; i <= 25; i++) {
        collector.recordOperation({
          operation: 'update',
          tableName: 'TestTable',
          partitionKey: `USER#${i}`,
          timestamp: Date.now(),
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.detectUniformPartitionKeys()

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].affectedOperations).toContain('update')
    })
  })

  describe('getRecommendations - integration with anti-patterns', () => {
    test('should include anti-pattern recommendations in overall recommendations', () => {
      const collector = new StatsCollector({ enabled: true })

      const baseTime = Date.now()

      // Add fetching-to-filter pattern
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          timestamp: baseTime,
          latencyMs: 100,
          itemCount: 10,
          scannedCount: 100,
        })
      }

      // Add sequential writes pattern
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      // Add large items pattern
      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: baseTime,
        latencyMs: 100,
        itemCount: 1,
        itemSizeBytes: 350 * 1024,
      })

      const recommendations = collector.getRecommendations()

      // Should include recommendations from all anti-pattern detections
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations.some(r => r.message.includes('client-side filtering'))).toBe(true)
      expect(recommendations.some(r => r.message.includes('Sequential write'))).toBe(true)
      expect(recommendations.some(r => r.message.includes('large items'))).toBe(true)
    })

    test('should sort recommendations by severity', () => {
      const collector = new StatsCollector({ enabled: true })

      // Add warning-level recommendation (large items >300KB)
      collector.recordOperation({
        operation: 'put',
        tableName: 'TestTable',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 1,
        itemSizeBytes: 350 * 1024,
      })

      // Add info-level recommendation (sequential writes)
      const baseTime = Date.now()
      for (let i = 0; i < 5; i++) {
        collector.recordOperation({
          operation: 'put',
          tableName: 'TestTable',
          timestamp: baseTime + i * 100,
          latencyMs: 50,
          itemCount: 1,
        })
      }

      const recommendations = collector.getRecommendations()

      // Warning should come before info
      const warningIndex = recommendations.findIndex(r => r.severity === 'warning')
      const infoIndex = recommendations.findIndex(r => r.severity === 'info')

      expect(warningIndex).toBeLessThan(infoIndex)
    })
  })
})
