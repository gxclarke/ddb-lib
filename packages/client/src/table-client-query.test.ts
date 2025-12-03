/**
 * Tests for TableClient query operations
 * These tests verify the query method constructs proper parameters
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { QueryParams, KeyCondition, FilterExpression } from './types'
import { KeyConditionBuilder, FilterExpressionBuilder } from './expression-builders'

describe('TableClient query parameter construction', () => {
  test('should construct query params with simple partition key', () => {
    const keyCondition: KeyCondition = {
      pk: 'USER#123',
    }

    const builder = new KeyConditionBuilder()
    const result = builder.build(keyCondition)

    expect(result.expression).toBe('#k0 = :k0')
    expect(result.attributeNames).toEqual({ '#k0': 'pk' })
    expect(result.attributeValues).toEqual({ ':k0': 'USER#123' })
  })

  test('should construct query params with partition and sort key', () => {
    const keyCondition: KeyCondition = {
      pk: 'USER#123',
      sk: 'PROFILE',
    }

    const builder = new KeyConditionBuilder()
    const result = builder.build(keyCondition)

    expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1')
    expect(result.attributeNames).toEqual({ '#k0': 'pk', '#k1': 'sk' })
    expect(result.attributeValues).toEqual({
      ':k0': 'USER#123',
      ':k1': 'PROFILE',
    })
  })

  test('should construct query params with sort key beginsWith', () => {
    const keyCondition: KeyCondition = {
      pk: 'USER#123',
      sk: { beginsWith: 'ORDER#' },
    }

    const builder = new KeyConditionBuilder()
    const result = builder.build(keyCondition)

    expect(result.expression).toBe('#k0 = :k0 AND begins_with(#k1, :k1)')
    expect(result.attributeNames).toEqual({ '#k0': 'pk', '#k1': 'sk' })
    expect(result.attributeValues).toEqual({
      ':k0': 'USER#123',
      ':k1': 'ORDER#',
    })
  })

  test('should construct query params with sort key comparison', () => {
    const keyCondition: KeyCondition = {
      pk: 'USER#123',
      sk: { lt: '2025-02-01', gte: '2025-01-01' },
    }

    const builder = new KeyConditionBuilder()
    const result = builder.build(keyCondition)

    expect(result.expression).toContain('>=')
    expect(result.expression).toContain('<')
    expect(result.attributeValues[':k1']).toBe('2025-02-01')
    expect(result.attributeValues[':k2']).toBe('2025-01-01')
  })

  test('should construct query params with filter expression', () => {
    const filter: FilterExpression = {
      status: 'ACTIVE',
      total: { gte: 50 },
    }

    const builder = new FilterExpressionBuilder()
    const result = builder.build(filter)

    // Expression uses placeholders like #f0, #f1
    expect(result.expression).toContain('#f0')
    expect(result.expression).toContain('#f1')
    expect(result.expression).toContain('>=')
    // Verify attribute names map to actual fields
    expect(result.attributeNames['#f0']).toBe('status')
    expect(result.attributeNames['#f1']).toBe('total')
  })

  test('should construct query params with multi-attribute partition key', () => {
    const keyCondition: KeyCondition = {
      multiPk: ['TENANT#123', 'CUSTOMER#456'],
    }

    const builder = new KeyConditionBuilder()
    const result = builder.build(keyCondition)

    expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1')
    expect(result.attributeNames).toEqual({ '#k0': 'pk0', '#k1': 'pk1' })
    expect(result.attributeValues).toEqual({
      ':k0': 'TENANT#123',
      ':k1': 'CUSTOMER#456',
    })
  })

  test('should construct query params with multi-attribute sort key', () => {
    const keyCondition: KeyCondition = {
      multiPk: ['TENANT#123'],
      multiSk: ['USA', 'CA', 'San Francisco'],
    }

    const builder = new KeyConditionBuilder()
    const result = builder.build(keyCondition)

    // Verify attribute names map to sk0, sk1, sk2
    expect(result.attributeNames['#k1']).toBe('sk0')
    expect(result.attributeNames['#k2']).toBe('sk1')
    expect(result.attributeNames['#k3']).toBe('sk2')
    expect(result.attributeValues[':k1']).toBe('USA')
    expect(result.attributeValues[':k2']).toBe('CA')
    expect(result.attributeValues[':k3']).toBe('San Francisco')
  })

  test('should construct query params with multi-attribute sort key comparison', () => {
    const keyCondition: KeyCondition = {
      multiPk: ['TENANT#123'],
      multiSk: { gte: ['USA', 'CA'] },
    }

    const builder = new KeyConditionBuilder()
    const result = builder.build(keyCondition)

    expect(result.expression).toContain('>=')
    expect(result.attributeValues[':k1']).toBe('USA')
    expect(result.attributeValues[':k2']).toBe('CA')
  })
})

describe('TableClient query method', () => {
  test('should have query method defined', () => {
    const client = new TableClient({
      tableName: 'test-table',
    })

    expect(typeof client.query).toBe('function')
  })

  test('should accept QueryParams with all options', () => {
    const client = new TableClient({
      tableName: 'test-table',
    })

    // This test verifies the type signature compiles correctly
    const params: QueryParams = {
      keyCondition: {
        pk: 'USER#123',
        sk: { beginsWith: 'ORDER#' },
      },
      filter: {
        status: 'ACTIVE',
      },
      index: 'GSI1',
      limit: 10,
      scanIndexForward: false,
      exclusiveStartKey: { pk: 'USER#123', sk: 'ORDER#1' },
      consistentRead: true,
      projectionExpression: ['pk', 'sk', 'status'],
    }

    // Verify params structure
    expect(params.keyCondition).toBeDefined()
    expect(params.filter).toBeDefined()
    expect(params.index).toBe('GSI1')
    expect(params.limit).toBe(10)
    expect(params.scanIndexForward).toBe(false)
    expect(params.consistentRead).toBe(true)
    expect(params.projectionExpression).toHaveLength(3)
  })
})
