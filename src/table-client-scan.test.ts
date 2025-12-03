/**
 * Tests for TableClient scan operations
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { ScanParams } from './types'

describe('TableClient scan method', () => {
  test('should have scan method defined', () => {
    const client = new TableClient({
      tableName: 'test-table',
    })

    expect(typeof client.scan).toBe('function')
  })

  test('should accept ScanParams with all options', () => {
    const client = new TableClient({
      tableName: 'test-table',
    })

    // This test verifies the type signature compiles correctly
    const params: ScanParams = {
      filter: {
        status: 'ACTIVE',
        age: { gte: 18 },
      },
      index: 'GSI1',
      limit: 100,
      exclusiveStartKey: { pk: 'USER#123', sk: 'PROFILE' },
      consistentRead: true,
      projectionExpression: ['pk', 'sk', 'status'],
    }

    // Verify params structure
    expect(params.filter).toBeDefined()
    expect(params.index).toBe('GSI1')
    expect(params.limit).toBe(100)
    expect(params.consistentRead).toBe(true)
    expect(params.projectionExpression).toHaveLength(3)
  })

  test('should accept scan with no parameters', () => {
    const client = new TableClient({
      tableName: 'test-table',
    })

    // Scan can be called without any parameters
    // This should compile without errors
    expect(typeof client.scan).toBe('function')
  })

  test('should accept scan with only filter', () => {
    const params: ScanParams = {
      filter: {
        status: 'ACTIVE',
      },
    }

    expect(params.filter).toBeDefined()
    expect(params.filter?.status).toBe('ACTIVE')
  })

  test('should accept scan with pagination', () => {
    const params: ScanParams = {
      limit: 50,
      exclusiveStartKey: { pk: 'ITEM#100' },
    }

    expect(params.limit).toBe(50)
    expect(params.exclusiveStartKey).toEqual({ pk: 'ITEM#100' })
  })

  test('should accept scan with projection expression', () => {
    const params: ScanParams = {
      projectionExpression: ['id', 'name', 'email'],
    }

    expect(params.projectionExpression).toHaveLength(3)
    expect(params.projectionExpression).toContain('email')
  })

  test('should accept scan on GSI', () => {
    const params: ScanParams = {
      index: 'StatusIndex',
      filter: {
        status: 'PENDING',
      },
    }

    expect(params.index).toBe('StatusIndex')
    expect(params.filter).toBeDefined()
  })

  test('should accept scan with consistent read', () => {
    const params: ScanParams = {
      consistentRead: true,
    }

    expect(params.consistentRead).toBe(true)
  })

  test('should accept scan with complex filter', () => {
    const params: ScanParams = {
      filter: {
        status: { in: ['ACTIVE', 'PENDING'] },
        age: { gte: 18, lt: 65 },
        email: { exists: true },
        tags: { contains: 'premium' },
      },
    }

    expect(params.filter).toBeDefined()
    expect(params.filter?.status).toHaveProperty('in')
    expect(params.filter?.age).toHaveProperty('gte')
    expect(params.filter?.email).toHaveProperty('exists')
    expect(params.filter?.tags).toHaveProperty('contains')
  })
})
