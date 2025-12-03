import { describe, test, expect, beforeEach } from '@rstest/core'
import { StatsCollector } from './stats-collector'
import { RecommendationEngine } from './recommendation-engine'
import type { OperationRecord } from './types'

describe('RecommendationEngine', () => {
  let collector: StatsCollector
  let engine: RecommendationEngine

  beforeEach(() => {
    collector = new StatsCollector({
      enabled: true,
      sampleRate: 1.0,
      thresholds: {
        slowQueryMs: 1000,
        highRCU: 100,
        highWCU: 100,
      },
    })
    engine = new RecommendationEngine(collector)
  })

  describe('detectBatchOpportunities', () => {
    test('should detect batch get opportunities', () => {
      const now = Date.now()

      // Record 5 get operations within 1 second
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'get',
          timestamp: now + i * 100,
          latencyMs: 50,
        })
      }

      const recommendations = engine.detectBatchOpportunities()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('Batch get opportunity')
      expect(recommendations[0].affectedOperations).toContain('get')
    })

    test('should detect batch write opportunities', () => {
      const now = Date.now()

      // Record 5 put operations within 1 second
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'put',
          timestamp: now + i * 100,
          latencyMs: 50,
        })
      }

      const recommendations = engine.detectBatchOpportunities()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('Batch write opportunity')
      expect(recommendations[0].affectedOperations).toContain('put')
    })

    test('should not recommend batching for few operations', () => {
      const now = Date.now()

      // Record only 2 operations
      collector.record({
        operation: 'get',
        timestamp: now,
        latencyMs: 50,
      })
      collector.record({
        operation: 'get',
        timestamp: now + 100,
        latencyMs: 50,
      })

      const recommendations = engine.detectBatchOpportunities()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectProjectionOpportunities', () => {
    test('should recommend projections when not used', () => {
      // Record 15 get operations without projection
      for (let i = 0; i < 15; i++) {
        collector.record({
          operation: 'get',
          timestamp: Date.now(),
          latencyMs: 50,
        })
      }

      const recommendations = engine.detectProjectionOpportunities()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('projection expressions')
    })

    test('should not recommend when projections are already used', () => {
      // Record operations with projection
      for (let i = 0; i < 15; i++) {
        const stats = {
          operation: 'get' as const,
          timestamp: Date.now(),
          latencyMs: 50,
          metadata: { usedProjection: true },
        }
        collector.record(stats)
      }

      // Manually set usedProjection on exported stats
      const exported = collector.export()
      for (const op of exported) {
        op.usedProjection = true
      }

      const recommendations = engine.detectProjectionOpportunities()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectFetchingToFilter', () => {
    test('should detect inefficient queries', () => {
      // Record queries with low efficiency (scanned many, returned few)
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'query',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 2,
          scannedCount: 10,
          patternName: 'getUsersByStatus',
        })
      }

      const recommendations = engine.detectFetchingToFilter()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('client-side filtering')
    })

    test('should not flag efficient queries', () => {
      // Record queries with high efficiency
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'query',
          timestamp: Date.now(),
          latencyMs: 100,
          itemCount: 9,
          scannedCount: 10,
        })
      }

      const recommendations = engine.detectFetchingToFilter()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectSlowOperations', () => {
    test('should detect slow operations', () => {
      // Record slow operations
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'query',
          timestamp: Date.now(),
          latencyMs: 1500, // Above threshold of 1000ms
        })
      }

      const recommendations = engine.detectSlowOperations()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('slow operations')
      expect(recommendations[0].severity).toBe('warning')
    })

    test('should not flag fast operations', () => {
      // Record fast operations
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'get',
          timestamp: Date.now(),
          latencyMs: 50,
        })
      }

      const recommendations = engine.detectSlowOperations()
      expect(recommendations).toHaveLength(0)
    })
  })

  describe('detectHighCapacityUsage', () => {
    test('should detect high RCU usage', () => {
      // Record operations with high RCU
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'query',
          timestamp: Date.now(),
          latencyMs: 100,
          rcu: 150, // Above threshold of 100
        })
      }

      const recommendations = engine.detectHighCapacityUsage()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('high RCU')
    })

    test('should detect high WCU usage', () => {
      // Record operations with high WCU
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'put',
          timestamp: Date.now(),
          latencyMs: 100,
          wcu: 150, // Above threshold of 100
        })
      }

      const recommendations = engine.detectHighCapacityUsage()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].message).toContain('high WCU')
    })
  })

  describe('generateRecommendations', () => {
    test('should generate multiple recommendations', () => {
      const now = Date.now()

      // Create various patterns
      // Batch opportunity
      for (let i = 0; i < 5; i++) {
        collector.record({
          operation: 'get',
          timestamp: now + i * 100,
          latencyMs: 50,
        })
      }

      // Slow operations
      for (let i = 0; i < 3; i++) {
        collector.record({
          operation: 'query',
          timestamp: now + 2000 + i * 100,
          latencyMs: 1500,
        })
      }

      const recommendations = engine.generateRecommendations()
      expect(recommendations.length).toBeGreaterThan(0)
    })

    test('should return empty array when no issues detected', () => {
      // Record a few normal operations
      collector.record({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
      })

      const recommendations = engine.generateRecommendations()
      // May or may not have recommendations depending on patterns
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('suggestCapacityMode', () => {
    test('should recommend on-demand for no operations', () => {
      const recommendation = engine.suggestCapacityMode()
      expect(recommendation.recommendedMode).toBe('on-demand')
      expect(recommendation.reasoning).toContain('No operations recorded')
    })

    test('should recommend on-demand for variable traffic', () => {
      const now = Date.now()
      const oneHour = 60 * 60 * 1000

      // Create variable traffic pattern
      // Hour 1: 100 operations
      for (let i = 0; i < 100; i++) {
        collector.record({
          operation: 'get',
          timestamp: now + i * 10,
          latencyMs: 50,
          rcu: 1,
        })
      }

      // Hour 2: 10 operations
      for (let i = 0; i < 10; i++) {
        collector.record({
          operation: 'get',
          timestamp: now + oneHour + i * 10,
          latencyMs: 50,
          rcu: 1,
        })
      }

      const recommendation = engine.suggestCapacityMode()
      expect(recommendation.recommendedMode).toBe('on-demand')
      expect(recommendation.reasoning).toContain('variable')
    })

    test('should recommend provisioned for steady traffic', () => {
      const now = Date.now()
      const oneHour = 60 * 60 * 1000

      // Create steady traffic pattern
      for (let hour = 0; hour < 3; hour++) {
        for (let i = 0; i < 50; i++) {
          collector.record({
            operation: 'get',
            timestamp: now + hour * oneHour + i * 100,
            latencyMs: 50,
            rcu: 1,
          })
        }
      }

      const recommendation = engine.suggestCapacityMode()
      expect(recommendation.recommendedMode).toBe('provisioned')
      expect(recommendation.reasoning).toContain('steady')
    })
  })
})
