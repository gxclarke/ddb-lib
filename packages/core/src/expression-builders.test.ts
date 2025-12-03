/**
 * Tests for expression builders
 */

import { describe, test, expect } from '@rstest/core'
import { KeyConditionBuilder, FilterExpressionBuilder } from './expression-builders'
import type { KeyCondition, FilterExpression } from './types'

describe('KeyConditionBuilder', () => {
  describe('single-attribute partition key', () => {
    test('should build simple partition key condition', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0')
      expect(result.attributeNames).toEqual({ '#k0': 'pk' })
      expect(result.attributeValues).toEqual({ ':k0': 'USER#123' })
    })

    test('should build partition key with number', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        pk: 12345,
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0')
      expect(result.attributeNames).toEqual({ '#k0': 'pk' })
      expect(result.attributeValues).toEqual({ ':k0': 12345 })
    })
  })

  describe('single-attribute sort key', () => {
    test('should build partition and sort key with equality', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: 'PROFILE',
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1')
      expect(result.attributeNames).toEqual({ '#k0': 'pk', '#k1': 'sk' })
      expect(result.attributeValues).toEqual({ ':k0': 'USER#123', ':k1': 'PROFILE' })
    })

    test('should build sort key with beginsWith', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: { beginsWith: 'ORDER#' },
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND begins_with(#k1, :k1)')
      expect(result.attributeNames).toEqual({ '#k0': 'pk', '#k1': 'sk' })
      expect(result.attributeValues).toEqual({ ':k0': 'USER#123', ':k1': 'ORDER#' })
    })

    test('should build sort key with less than', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: { lt: '2025-01-01' },
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 < :k1')
      expect(result.attributeNames).toEqual({ '#k0': 'pk', '#k1': 'sk' })
      expect(result.attributeValues).toEqual({ ':k0': 'USER#123', ':k1': '2025-01-01' })
    })

    test('should build sort key with greater than or equal', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: { gte: '2025-01-01' },
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 >= :k1')
      expect(result.attributeNames).toEqual({ '#k0': 'pk', '#k1': 'sk' })
      expect(result.attributeValues).toEqual({ ':k0': 'USER#123', ':k1': '2025-01-01' })
    })

    test('should build sort key with between', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        pk: 'USER#123',
        sk: { between: ['2025-01-01', '2025-12-31'] },
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 BETWEEN :k1 AND :k2')
      expect(result.attributeNames).toEqual({ '#k0': 'pk', '#k1': 'sk' })
      expect(result.attributeValues).toEqual({
        ':k0': 'USER#123',
        ':k1': '2025-01-01',
        ':k2': '2025-12-31',
      })
    })
  })

  describe('multi-attribute partition key', () => {
    test('should build multi-attribute partition key', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT#123', 'CUSTOMER#456'],
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1')
      expect(result.attributeNames).toEqual({ '#k0': 'pk0', '#k1': 'pk1' })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT#123',
        ':k1': 'CUSTOMER#456',
      })
    })

    test('should build multi-attribute partition key with numbers', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT#123', 100, 'DEPT#A'],
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1 AND #k2 = :k2')
      expect(result.attributeNames).toEqual({ '#k0': 'pk0', '#k1': 'pk1', '#k2': 'pk2' })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT#123',
        ':k1': 100,
        ':k2': 'DEPT#A',
      })
    })
  })

  describe('multi-attribute sort key', () => {
    test('should build multi-attribute sort key with equality', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT#123'],
        multiSk: ['USA', 'CA', 'San Francisco'],
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1 AND #k2 = :k2 AND #k3 = :k3')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk0',
        '#k1': 'sk0',
        '#k2': 'sk1',
        '#k3': 'sk2',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT#123',
        ':k1': 'USA',
        ':k2': 'CA',
        ':k3': 'San Francisco',
      })
    })

    test('should build multi-attribute sort key with comparison', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT#123'],
        multiSk: { gte: ['USA', 'CA'] },
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1 AND #k2 >= :k2')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk0',
        '#k1': 'sk0',
        '#k2': 'sk1',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT#123',
        ':k1': 'USA',
        ':k2': 'CA',
      })
    })

    test('should build multi-attribute sort key with between', () => {
      const builder = new KeyConditionBuilder()
      const keyCondition: KeyCondition = {
        multiPk: ['TENANT#123'],
        multiSk: {
          between: [
            ['USA', 'CA'],
            ['USA', 'NY'],
          ],
        },
      }

      const result = builder.build(keyCondition)

      expect(result.expression).toBe('#k0 = :k0 AND #k1 = :k1 AND #k2 BETWEEN :k2 AND :k3')
      expect(result.attributeNames).toEqual({
        '#k0': 'pk0',
        '#k1': 'sk0',
        '#k2': 'sk1',
      })
      expect(result.attributeValues).toEqual({
        ':k0': 'TENANT#123',
        ':k1': 'USA',
        ':k2': 'CA',
        ':k3': 'NY',
      })
    })
  })
})

describe('FilterExpressionBuilder', () => {
  test('should build simple equality filter', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      status: 'ACTIVE',
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('#f0 = :f0')
    expect(result.attributeNames).toEqual({ '#f0': 'status' })
    expect(result.attributeValues).toEqual({ ':f0': 'ACTIVE' })
  })

  test('should build multiple field filters', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      status: 'ACTIVE',
      age: { gte: 18 },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('#f0 = :f0 AND #f1 >= :f1')
    expect(result.attributeNames).toEqual({ '#f0': 'status', '#f1': 'age' })
    expect(result.attributeValues).toEqual({ ':f0': 'ACTIVE', ':f1': 18 })
  })

  test('should build filter with comparison operators', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      age: { lt: 65, gte: 18 },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('#f0 < :f0 AND #f0 >= :f1')
    expect(result.attributeNames).toEqual({ '#f0': 'age' })
    expect(result.attributeValues).toEqual({ ':f0': 65, ':f1': 18 })
  })

  test('should build filter with between', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      price: { between: [10, 100] },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('#f0 BETWEEN :f0 AND :f1')
    expect(result.attributeNames).toEqual({ '#f0': 'price' })
    expect(result.attributeValues).toEqual({ ':f0': 10, ':f1': 100 })
  })

  test('should build filter with IN operator', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      status: { in: ['ACTIVE', 'PENDING', 'APPROVED'] },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('#f0 IN (:f0, :f1, :f2)')
    expect(result.attributeNames).toEqual({ '#f0': 'status' })
    expect(result.attributeValues).toEqual({
      ':f0': 'ACTIVE',
      ':f1': 'PENDING',
      ':f2': 'APPROVED',
    })
  })

  test('should build filter with exists', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      email: { exists: true },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('attribute_exists(#f0)')
    expect(result.attributeNames).toEqual({ '#f0': 'email' })
    expect(result.attributeValues).toEqual({})
  })

  test('should build filter with not exists', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      deletedAt: { exists: false },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('attribute_not_exists(#f0)')
    expect(result.attributeNames).toEqual({ '#f0': 'deletedAt' })
    expect(result.attributeValues).toEqual({})
  })

  test('should build filter with contains', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      tags: { contains: 'important' },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('contains(#f0, :f0)')
    expect(result.attributeNames).toEqual({ '#f0': 'tags' })
    expect(result.attributeValues).toEqual({ ':f0': 'important' })
  })

  test('should build filter with beginsWith', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      email: { beginsWith: 'admin@' },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe('begins_with(#f0, :f0)')
    expect(result.attributeNames).toEqual({ '#f0': 'email' })
    expect(result.attributeValues).toEqual({ ':f0': 'admin@' })
  })

  test('should build complex filter with multiple conditions', () => {
    const builder = new FilterExpressionBuilder()
    const filter: FilterExpression = {
      status: 'ACTIVE',
      age: { lt: 65, gte: 18 },
      email: { exists: true },
      tags: { contains: 'premium' },
    }

    const result = builder.build(filter)

    expect(result.expression).toBe(
      '#f0 = :f0 AND #f1 < :f1 AND #f1 >= :f2 AND attribute_exists(#f2) AND contains(#f3, :f3)'
    )
    expect(result.attributeNames).toEqual({
      '#f0': 'status',
      '#f1': 'age',
      '#f2': 'email',
      '#f3': 'tags',
    })
    expect(result.attributeValues).toEqual({
      ':f0': 'ACTIVE',
      ':f1': 65,
      ':f2': 18,
      ':f3': 'premium',
    })
  })
})

describe('ProjectionExpressionBuilder', () => {
  test('should build projection expression for single attribute', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes = ['userId']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0')
    expect(result.attributeNames).toEqual({ '#p0': 'userId' })
    expect(result.attributeValues).toEqual({})
  })

  test('should build projection expression for multiple attributes', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes = ['userId', 'email', 'name']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0, #p1, #p2')
    expect(result.attributeNames).toEqual({
      '#p0': 'userId',
      '#p1': 'email',
      '#p2': 'name',
    })
    expect(result.attributeValues).toEqual({})
  })

  test('should handle nested attributes with dot notation', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes = ['user.email']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0.#p1')
    expect(result.attributeNames).toEqual({
      '#p0': 'user',
      '#p1': 'email',
    })
    expect(result.attributeValues).toEqual({})
  })

  test('should handle multiple nested attributes', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes = ['user.profile.email', 'user.profile.name']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0.#p1.#p2, #p3.#p4.#p5')
    expect(result.attributeNames).toEqual({
      '#p0': 'user',
      '#p1': 'profile',
      '#p2': 'email',
      '#p3': 'user',
      '#p4': 'profile',
      '#p5': 'name',
    })
    expect(result.attributeValues).toEqual({})
  })

  test('should handle mix of simple and nested attributes', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes = ['userId', 'user.email', 'status', 'metadata.createdAt']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0, #p1.#p2, #p3, #p4.#p5')
    expect(result.attributeNames).toEqual({
      '#p0': 'userId',
      '#p1': 'user',
      '#p2': 'email',
      '#p3': 'status',
      '#p4': 'metadata',
      '#p5': 'createdAt',
    })
    expect(result.attributeValues).toEqual({})
  })

  test('should handle deeply nested attributes', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes = ['data.level1.level2.level3.value']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0.#p1.#p2.#p3.#p4')
    expect(result.attributeNames).toEqual({
      '#p0': 'data',
      '#p1': 'level1',
      '#p2': 'level2',
      '#p3': 'level3',
      '#p4': 'value',
    })
    expect(result.attributeValues).toEqual({})
  })

  test('should handle empty attribute array', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes: string[] = []

    const result = builder.build(attributes)

    expect(result.expression).toBe('')
    expect(result.attributeNames).toEqual({})
    expect(result.attributeValues).toEqual({})
  })

  test('should handle attributes with reserved words', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    // DynamoDB reserved words like 'name', 'status', 'data' should be handled via attribute names
    const attributes = ['name', 'status', 'data']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0, #p1, #p2')
    expect(result.attributeNames).toEqual({
      '#p0': 'name',
      '#p1': 'status',
      '#p2': 'data',
    })
    expect(result.attributeValues).toEqual({})
  })

  test('should handle attributes with special characters in nested paths', () => {
    const { ProjectionExpressionBuilder } = require('./expression-builders')
    const builder = new ProjectionExpressionBuilder()
    const attributes = ['user-info.email-address', 'order_details.item_count']

    const result = builder.build(attributes)

    expect(result.expression).toBe('#p0.#p1, #p2.#p3')
    expect(result.attributeNames).toEqual({
      '#p0': 'user-info',
      '#p1': 'email-address',
      '#p2': 'order_details',
      '#p3': 'item_count',
    })
    expect(result.attributeValues).toEqual({})
  })
})
