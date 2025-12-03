/**
 * Tests for ConditionExpressionBuilder
 */

import { describe, test, expect } from '@rstest/core'
import { ConditionExpressionBuilder } from './expression-builders'

describe('ConditionExpressionBuilder', () => {
  describe('comparison operators', () => {
    test('should build eq (equals) condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        status: { eq: 'ACTIVE' },
      })

      expect(result.expression).toBe('#c0 = :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'status' })
      expect(result.attributeValues).toEqual({ ':c0': 'ACTIVE' })
    })

    test('should build ne (not equals) condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        status: { ne: 'DELETED' },
      })

      expect(result.expression).toBe('#c0 <> :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'status' })
      expect(result.attributeValues).toEqual({ ':c0': 'DELETED' })
    })

    test('should build lt (less than) condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        age: { lt: 18 },
      })

      expect(result.expression).toBe('#c0 < :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'age' })
      expect(result.attributeValues).toEqual({ ':c0': 18 })
    })

    test('should build lte (less than or equal) condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        price: { lte: 100 },
      })

      expect(result.expression).toBe('#c0 <= :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'price' })
      expect(result.attributeValues).toEqual({ ':c0': 100 })
    })

    test('should build gt (greater than) condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        score: { gt: 50 },
      })

      expect(result.expression).toBe('#c0 > :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'score' })
      expect(result.attributeValues).toEqual({ ':c0': 50 })
    })

    test('should build gte (greater than or equal) condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        balance: { gte: 0 },
      })

      expect(result.expression).toBe('#c0 >= :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'balance' })
      expect(result.attributeValues).toEqual({ ':c0': 0 })
    })

    test('should build multiple comparison operators on same field', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        age: { gte: 18, lt: 65 },
      })

      // Order may vary, so check both parts are present
      expect(result.expression).toContain('#c0 >= :c')
      expect(result.expression).toContain('#c0 < :c')
      expect(result.expression).toContain(' AND ')
      expect(result.attributeNames).toEqual({ '#c0': 'age' })
      // Check that both values are present (order may vary)
      const values = Object.values(result.attributeValues)
      expect(values).toContain(18)
      expect(values).toContain(65)
    })
  })

  describe('DynamoDB functions', () => {
    test('should build exists condition (attribute exists)', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        email: { exists: true },
      })

      expect(result.expression).toBe('attribute_exists(#c0)')
      expect(result.attributeNames).toEqual({ '#c0': 'email' })
      expect(result.attributeValues).toEqual({})
    })

    test('should build exists condition (attribute not exists)', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        deletedAt: { exists: false },
      })

      expect(result.expression).toBe('attribute_not_exists(#c0)')
      expect(result.attributeNames).toEqual({ '#c0': 'deletedAt' })
      expect(result.attributeValues).toEqual({})
    })

    test('should build contains condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        tags: { contains: 'important' },
      })

      expect(result.expression).toBe('contains(#c0, :c0)')
      expect(result.attributeNames).toEqual({ '#c0': 'tags' })
      expect(result.attributeValues).toEqual({ ':c0': 'important' })
    })

    test('should build beginsWith condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        email: { beginsWith: 'admin@' },
      })

      expect(result.expression).toBe('begins_with(#c0, :c0)')
      expect(result.attributeNames).toEqual({ '#c0': 'email' })
      expect(result.attributeValues).toEqual({ ':c0': 'admin@' })
    })
  })

  describe('simple equality conditions', () => {
    test('should build simple equality condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        status: 'ACTIVE',
      })

      expect(result.expression).toBe('#c0 = :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'status' })
      expect(result.attributeValues).toEqual({ ':c0': 'ACTIVE' })
    })

    test('should build multiple simple equality conditions', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        status: 'ACTIVE',
        type: 'USER',
      })

      expect(result.expression).toContain('#c0 = :c0')
      expect(result.expression).toContain('#c1 = :c1')
      expect(result.expression).toContain(' AND ')
      expect(result.attributeNames).toEqual({ '#c0': 'status', '#c1': 'type' })
      expect(result.attributeValues).toEqual({ ':c0': 'ACTIVE', ':c1': 'USER' })
    })
  })

  describe('logical operators', () => {
    test('should build AND condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        and: [{ status: 'ACTIVE' }, { age: { gte: 18 } }],
      })

      expect(result.expression).toBe('(#c0 = :c0 AND #c1 >= :c1)')
      expect(result.attributeNames).toEqual({ '#c0': 'status', '#c1': 'age' })
      expect(result.attributeValues).toEqual({ ':c0': 'ACTIVE', ':c1': 18 })
    })

    test('should build OR condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        or: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
      })

      expect(result.expression).toBe('(#c0 = :c0 OR #c1 = :c1)')
      expect(result.attributeNames).toEqual({ '#c0': 'status', '#c1': 'status' })
      expect(result.attributeValues).toEqual({ ':c0': 'ACTIVE', ':c1': 'PENDING' })
    })

    test('should build NOT condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        not: { status: 'DELETED' },
      })

      expect(result.expression).toBe('NOT #c0 = :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'status' })
      expect(result.attributeValues).toEqual({ ':c0': 'DELETED' })
    })

    test('should build nested logical conditions', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        and: [
          { status: 'ACTIVE' },
          {
            or: [{ age: { gte: 18 } }, { verified: true }],
          },
        ],
      })

      expect(result.expression).toBe('(#c0 = :c0 AND (#c1 >= :c1 OR #c2 = :c2))')
      expect(result.attributeNames).toEqual({
        '#c0': 'status',
        '#c1': 'age',
        '#c2': 'verified',
      })
      expect(result.attributeValues).toEqual({
        ':c0': 'ACTIVE',
        ':c1': 18,
        ':c2': true,
      })
    })

    test('should build complex nested conditions', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        or: [
          {
            and: [{ status: 'ACTIVE' }, { age: { gte: 18 } }],
          },
          {
            and: [{ status: 'PENDING' }, { verified: true }],
          },
        ],
      })

      expect(result.expression).toBe('((#c0 = :c0 AND #c1 >= :c1) OR (#c2 = :c2 AND #c3 = :c3))')
      expect(result.attributeNames).toEqual({
        '#c0': 'status',
        '#c1': 'age',
        '#c2': 'status',
        '#c3': 'verified',
      })
      expect(result.attributeValues).toEqual({
        ':c0': 'ACTIVE',
        ':c1': 18,
        ':c2': 'PENDING',
        ':c3': true,
      })
    })

    test('should build NOT with complex condition', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        not: {
          and: [{ status: 'DELETED' }, { archived: true }],
        },
      })

      expect(result.expression).toBe('NOT (#c0 = :c0 AND #c1 = :c1)')
      expect(result.attributeNames).toEqual({ '#c0': 'status', '#c1': 'archived' })
      expect(result.attributeValues).toEqual({ ':c0': 'DELETED', ':c1': true })
    })
  })

  describe('mixed conditions', () => {
    test('should build condition with field and logical operators', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        type: 'USER',
        or: [{ status: 'ACTIVE' }, { status: 'PENDING' }],
      })

      // Check that both parts are present (order may vary)
      expect(result.expression).toContain('= :c')
      expect(result.expression).toContain('OR')
      // The 'or' is processed as a logical operator, 'type' as a field
      // So we should have type + 2 status fields
      const nameValues = Object.values(result.attributeNames)
      expect(nameValues).toContain('type')
      expect(nameValues.filter((v) => v === 'status').length).toBeGreaterThanOrEqual(2)
      // Check values
      const values = Object.values(result.attributeValues)
      expect(values).toContain('USER')
      expect(values).toContain('ACTIVE')
      expect(values).toContain('PENDING')
    })

    test('should build condition with functions and logical operators', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        and: [{ email: { exists: true } }, { email: { beginsWith: 'admin@' } }],
      })

      expect(result.expression).toBe('(attribute_exists(#c0) AND begins_with(#c1, :c0))')
      expect(result.attributeNames).toEqual({ '#c0': 'email', '#c1': 'email' })
      expect(result.attributeValues).toEqual({ ':c0': 'admin@' })
    })
  })

  describe('edge cases', () => {
    test('should handle empty condition object', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({})

      expect(result.expression).toBe('')
      expect(result.attributeNames).toEqual({})
      expect(result.attributeValues).toEqual({})
    })

    test('should handle condition with number values', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        count: 42,
      })

      expect(result.expression).toBe('#c0 = :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'count' })
      expect(result.attributeValues).toEqual({ ':c0': 42 })
    })

    test('should handle condition with boolean values', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        active: true,
      })

      expect(result.expression).toBe('#c0 = :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'active' })
      expect(result.attributeValues).toEqual({ ':c0': true })
    })

    test('should handle condition with null values', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        deletedAt: null,
      })

      expect(result.expression).toBe('#c0 = :c0')
      expect(result.attributeNames).toEqual({ '#c0': 'deletedAt' })
      expect(result.attributeValues).toEqual({ ':c0': null })
    })
  })
})
