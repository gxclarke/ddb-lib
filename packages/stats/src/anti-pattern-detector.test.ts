import { describe, test, expect, beforeEach } from '@rstest/core'
import { StatsCollector } from './stats-collector'
import { AntiPatternDetector } from './anti-pattern-detector'

describe('AntiPatternDetector', () => {
  let collector: StatsCollector
  let detector: AntiPatternDetector

  beforeEach(() => {
    collector = new StatsCollector({
      enabled: true,
      sampleRate: 1.0,
    })
    detector = new AntiPatternDetector(collector)
  })

  describe('detectHotPartitions', () => {
    test('should detect hot partitions', () => {
      // Create hot partition (>10% of traffic)
      for (let i = 0; i < 50; i++) {
        const stats = {
          operation: 'get' as const,
          timestamp: Date.now(),
          latencyMs: 50,
        }
        collector.record(stats, 'test-table')
      }

      // Manually set partition keys on exported stats
      const exported = collector.export()
      for (let i = 0; i < 40; i++) {
        exported[i].partitionKey = 'HOT_KEY'
      }
      for (let i = 40; i < 50; i++) {
        exported[i].partitionKey = `KEY_${i}`
      }

      const hotPartitions = detector.detectHotPartitions()
      expect(hotPartitions.length).toBeGreaterThan(0)
      expect(hotPartitions[0].partitionKey).toBe('HOT_KEY')
      expect(hotPartitions[0].percentageOfTotal).toBeGreaterThan(0.1)
    })

    test('should return empty array when no hot partitions', () => {
      // Create evenly distributed traffic
      for (let i = 0; i < 50; i++) {
        const stats = {
          operation: 'get' as const,
          timestamp: Date.now(),
          latencyMs: 50,
        }
        collector.record(stats, 'test-table')
      }

      // Set unique partition keys
      const exported = collector.export()
      for (let i = 0; i < 50; i++) {
        exported[i].partitionKey = `KEY_${i}`
      }

      const hotPartitions = detector.detectHotPartitions()
      expect(hotPartitions).toHaveLength(0)
    })
  })

  describe('detectInefficientScans', () => {
    test('should detect inefficient scans', () => {
      // Record scans with low efficiency
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'scan',
          timestamp: Date.now(),
          latencyMs: 200,
          itemCount: 2,
          scannedCount: 100,
        }, 'test-table')
      }

      const scanReports = detector.detectInefficientScans()
      expect(scanReports.length).toBeGreaterThan(0)
      expect(scanReports[0].efficiency).toBeLessThan(0.2)
    })

    test('should not flag efficient scans', () => {
      // Record scans with high efficiency
      collector.record({
        operation: 'scan',
        timestamp: Date.now(),
        latencyMs: 200,
        itemCount: 90,
        scannedCount: 100,
      }, 'test-table')

      const scanReports = detector.detectInefficientScans()
      expect(scanReports).toHaveLength(0)
    })
  })

  describe('detectUnusedIndexes', () => {
    test('should detect unused indexes', () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000

      // Record old index usage
      collector.record({
        operation: 'query',
        timestamp: eightDaysAgo,
        latencyMs: 100,
        indexName: 'GSI1',
      }, 'test-table')

      const indexReports = detector.detectUnusedIndexes()
      expect(indexReports.length).toBeGreaterThan(0)
      expect(indexReports[0].indexName).toContain('GSI1')
    })

    test('should not flag recently used indexes', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000

      // Record recent index usage
      collector.record({
        operation: 'query',
        timestamp: yesterday,
        latencyMs: 100,
        indexName: 'GSI1',
      }, 'test-table')

      const indexReports = detector.detectUnusedIndexes()
      expect(indexReports).toHaveLength(0)
    })
  })

  describe('detectStringConcatenation', () => {
    test('should recommend multi-attribute keys for frequent index usage', () => {
      // Record many operations on an index
      for (let i = 0; i < 15; i++) {
        collector.record({
          operation: 'query',
          timestamp: Date.now(),
          latencyMs: 100,
          indexName: 'GSI1',
        }, 'test-table')
      }

      const recommendations = detector.detectStringConcatenation()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('multi-attribute keys')
    })

    test('should not recommend for infrequent usage', () => {
      // Record few operations
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'query',
          timestamp: Date.now(),
          latencyMs: 100,
          indexName: 'GSI1',
        }, 'test-table')
      }

      const recommendations = detector.detectStringConcatenation()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectLargeItemScans', () => {
    test('should detect large items', () => {
      // Record operations with large items
      for (let i = 0; i < 5; i++) {
        const stats = {
          operation: 'get' as const,
          timestamp: Date.now(),
          latencyMs: 100,
        }
        collector.record(stats, 'test-table')
      }

      // Set large item sizes
      const exported = collector.export()
      for (const op of exported) {
        op.itemSizeBytes = 150 * 1024 // 150KB
      }

      const recommendations = detector.detectLargeItemScans()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('large items')
    })

    test('should not flag small items', () => {
      // Record operations with small items
      const stats = {
        operation: 'get' as const,
        timestamp: Date.now(),
        latencyMs: 50,
      }
      collector.record(stats, 'test-table')

      // Set small item size
      const exported = collector.export()
      exported[0].itemSizeBytes = 10 * 1024 // 10KB

      const recommendations = detector.detectLargeItemScans()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectMissingGSIs', () => {
    test('should recommend GSIs for frequent scans', () => {
      // Record many scan operations
      for (let i = 0; i < 11; i++) {
        collector.record({
          operation: 'scan',
          timestamp: Date.now(),
          latencyMs: 200,
        }, 'test-table')
      }

      const recommendations = detector.detectMissingGSIs()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('Frequent scans')
    })

    test('should not recommend for infrequent scans', () => {
      // Record few scan operations
      for (let i = 0; i < 3; i++) {
        collector.record({
          operation: 'scan',
          timestamp: Date.now(),
          latencyMs: 200,
        }, 'test-table')
      }

      const recommendations = detector.detectMissingGSIs()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectReadBeforeWrite', () => {
    test('should detect read-before-write pattern', () => {
      const now = Date.now()

      // Record get followed by put on same key
      for (let i = 0; i < 5; i++) {
        const getStats = {
          operation: 'get' as const,
          timestamp: now + i * 10000,
          latencyMs: 50,
        }
        const putStats = {
          operation: 'put' as const,
          timestamp: now + i * 10000 + 1000,
          latencyMs: 50,
        }
        collector.record(getStats, 'test-table')
        collector.record(putStats, 'test-table')
      }

      // Set partition keys
      const exported = collector.export()
      for (const op of exported) {
        op.partitionKey = 'TEST_KEY'
      }

      const recommendations = detector.detectReadBeforeWrite()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('Read-before-write')
    })

    test('should not flag unrelated operations', () => {
      const now = Date.now()

      // Record get and put on different keys
      collector.record({
        operation: 'get',
        timestamp: now,
        latencyMs: 50,
      }, 'test-table')
      collector.record({
        operation: 'put',
        timestamp: now + 1000,
        latencyMs: 50,
      }, 'test-table')

      // Set different partition keys
      const exported = collector.export()
      exported[0].partitionKey = 'KEY_1'
      exported[1].partitionKey = 'KEY_2'

      const recommendations = detector.detectReadBeforeWrite()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('generateRecommendations', () => {
    test('should generate multiple recommendations', () => {
      // Create various anti-patterns
      // Frequent index usage
      for (let i = 0; i < 15; i++) {
        collector.record({
          operation: 'query',
          timestamp: Date.now(),
          latencyMs: 100,
          indexName: 'GSI1',
        }, 'test-table')
      }

      // Frequent scans
      for (let i = 0; i < 10; i++) {
        collector.record({
          operation: 'scan',
          timestamp: Date.now(),
          latencyMs: 200,
        }, 'test-table')
      }

      const recommendations = detector.generateRecommendations()
      expect(recommendations.length).toBeGreaterThan(0)
    })
  })
})
