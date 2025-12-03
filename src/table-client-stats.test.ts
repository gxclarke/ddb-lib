/**
 * Integration tests for stats collection in TableClient
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { StatsConfig } from './types'

describe('TableClient - Stats Collection', () => {

  describe('getStats', () => {
    test('should return empty stats when no operations performed', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: true },
      })

      const stats = client.getStats()

      expect(stats.operations).toEqual({})
      expect(stats.accessPatterns).toEqual({})
    })

    test('should return empty stats when stats not configured', () => {
      const client = new TableClient({
        tableName: 'TestTable',
      })

      const stats = client.getStats()

      expect(stats.operations).toEqual({})
      expect(stats.accessPatterns).toEqual({})
    })

    test('should return empty stats when stats disabled', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: false },
      })

      const stats = client.getStats()

      expect(stats.operations).toEqual({})
      expect(stats.accessPatterns).toEqual({})
    })
  })

  describe('stats configuration', () => {
    test('should initialize with stats enabled', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: {
          enabled: true,
        },
      })

      const stats = client.getStats()

      expect(stats).toBeDefined()
      expect(stats.operations).toEqual({})
      expect(stats.accessPatterns).toEqual({})
    })

    test('should initialize with custom thresholds', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: {
          enabled: true,
          thresholds: {
            slowQueryMs: 500,
            highRCU: 50,
            highWCU: 75,
          },
        },
      })

      const stats = client.getStats()

      expect(stats).toBeDefined()
    })

    test('should initialize with custom sample rate', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: {
          enabled: true,
          sampleRate: 0.5,
        },
      })

      const stats = client.getStats()

      expect(stats).toBeDefined()
    })

    test('should throw error for invalid sample rate', () => {
      expect(() => {
        new TableClient({
          tableName: 'TestTable',
          statsConfig: {
            enabled: true,
            sampleRate: 1.5,
          },
        })
      }).toThrow('sampleRate must be between 0 and 1')
    })
  })
})

describe('TableClient - Recommendations', () => {
  describe('getRecommendations', () => {
    test('should return empty array when stats not configured', () => {
      const client = new TableClient({
        tableName: 'TestTable',
      })

      const recommendations = client.getRecommendations()

      expect(recommendations).toEqual([])
    })

    test('should return empty array when stats disabled', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: false },
      })

      const recommendations = client.getRecommendations()

      expect(recommendations).toEqual([])
    })

    test('should return empty array when no issues detected', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: true },
      })

      const recommendations = client.getRecommendations()

      expect(recommendations).toEqual([])
    })

    test('should emit warnings for high-severity recommendations', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: true },
      })

      // Mock console.warn to capture warnings
      const originalWarn = console.warn
      const warnings: string[] = []
      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '))
      }

      try {
        // Manually add operations to stats collector to trigger recommendations
        // This is a bit of a hack for testing, but it works
        const statsCollector = (client as any).statsCollector
        if (statsCollector) {
          // Create hot partition (>50% traffic = error)
          for (let i = 0; i < 60; i++) {
            statsCollector.recordOperation({
              operation: 'query',
              tableName: 'TestTable',
              indexName: 'GSI1',
              timestamp: Date.now(),
              latencyMs: 10,
              itemCount: 1,
            })
          }

          for (let i = 0; i < 40; i++) {
            statsCollector.recordOperation({
              operation: 'query',
              tableName: 'TestTable',
              indexName: 'GSI2',
              timestamp: Date.now(),
              latencyMs: 10,
              itemCount: 1,
            })
          }
        }

        const recommendations = client.getRecommendations()

        // Should have recommendations
        expect(recommendations.length).toBeGreaterThan(0)

        // Should have emitted warnings
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('ERROR') || w.includes('WARNING'))).toBe(true)
      } finally {
        console.warn = originalWarn
      }
    })

    test('should not emit warnings for info-level recommendations', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: true },
      })

      // Mock console.warn to capture warnings
      const originalWarn = console.warn
      const warnings: string[] = []
      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '))
      }

      try {
        const statsCollector = (client as any).statsCollector
        if (statsCollector) {
          // Create unused index (info severity)
          const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
          statsCollector.recordOperation({
            operation: 'query',
            tableName: 'TestTable',
            indexName: 'GSI1',
            timestamp: eightDaysAgo,
            latencyMs: 100,
            itemCount: 10,
          })
        }

        const recommendations = client.getRecommendations()

        // Should have recommendations
        expect(recommendations.length).toBeGreaterThan(0)

        // Check if there are any error or warning level recommendations
        const hasErrorOrWarning = recommendations.some(r => r.severity === 'error' || r.severity === 'warning')

        // If there are error/warning recommendations, warnings should be emitted
        // If there are only info recommendations, no warnings should be emitted
        const errorOrWarningMessages = warnings.filter(w =>
          w.includes('[DynamoDB Wrapper]') && (w.includes('ERROR') || w.includes('WARNING'))
        )

        if (hasErrorOrWarning) {
          expect(errorOrWarningMessages.length).toBeGreaterThan(0)
        } else {
          expect(errorOrWarningMessages.length).toBe(0)
        }
      } finally {
        console.warn = originalWarn
      }
    })

    test('should return recommendations sorted by severity', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: true },
      })

      const statsCollector = (client as any).statsCollector
      if (statsCollector) {
        // Create hot partition (error)
        for (let i = 0; i < 60; i++) {
          statsCollector.recordOperation({
            operation: 'query',
            tableName: 'TestTable',
            indexName: 'GSI1',
            timestamp: Date.now(),
            latencyMs: 10,
            itemCount: 1,
          })
        }

        // Create inefficient scan (warning)
        statsCollector.recordOperation({
          operation: 'scan',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 500,
          itemCount: 8,
          scannedCount: 100,
        })

        // Create unused index (info)
        const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
        statsCollector.recordOperation({
          operation: 'query',
          tableName: 'TestTable',
          indexName: 'GSI2',
          timestamp: eightDaysAgo,
          latencyMs: 100,
          itemCount: 10,
        })
      }

      // Suppress console warnings for this test
      const originalWarn = console.warn
      console.warn = () => { }

      try {
        const recommendations = client.getRecommendations()

        expect(recommendations.length).toBeGreaterThan(2)

        // First recommendation should be error severity
        expect(recommendations[0].severity).toBe('error')

        // Should be sorted: error, warning, info
        let lastSeverityOrder = -1
        const severityOrder = { error: 0, warning: 1, info: 2 }

        for (const rec of recommendations) {
          const currentOrder = severityOrder[rec.severity]
          expect(currentOrder).toBeGreaterThanOrEqual(lastSeverityOrder)
          lastSeverityOrder = currentOrder
        }
      } finally {
        console.warn = originalWarn
      }
    })

    test('should include all recommendation fields', () => {
      const client = new TableClient({
        tableName: 'TestTable',
        statsConfig: { enabled: true },
      })

      const statsCollector = (client as any).statsCollector
      if (statsCollector) {
        // Create inefficient scan
        statsCollector.recordOperation({
          operation: 'scan',
          tableName: 'TestTable',
          timestamp: Date.now(),
          latencyMs: 500,
          itemCount: 5,
          scannedCount: 100,
        })
      }

      // Suppress console warnings
      const originalWarn = console.warn
      console.warn = () => { }

      try {
        const recommendations = client.getRecommendations()

        expect(recommendations.length).toBeGreaterThan(0)

        const rec = recommendations[0]
        expect(rec.severity).toBeDefined()
        expect(rec.category).toBeDefined()
        expect(rec.message).toBeDefined()
        expect(rec.details).toBeDefined()
      } finally {
        console.warn = originalWarn
      }
    })
  })
})
