/**
 * Integration tests for conditional operations
 */

import { describe, test, expect } from '@rstest/core'
import { ConditionExpressionBuilder } from './expression-builders'
import { ConditionalCheckError } from './errors'

describe('Conditional Operations', () => {
  describe('ConditionExpressionBuilder - comparison operators', () => {
    test('should build condition expression for simple equality', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ status: 'ACTIVE' })

      expect(result.expression).toContain('=')
      expect(result.attributeNames).toBeDefined()
      expect(result.attributeValues).toBeDefined()
      expect(Object.values(result.attributeNames)).toContain('status')
      expect(Object.values(result.attributeValues)).toContain('ACTIVE')
    })

    test('should build condition expression with lt operator', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ age: { lt: 30 } })

      expect(result.expression).toContain('<')
      expect(Object.values(result.attributeNames)).toContain('age')
      expect(Object.values(result.attributeValues)).toContain(30)
    })

    test('should build condition expression with gte operator', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ age: { gte: 18 } })

      expect(result.expression).toContain('>=')
      expect(Object.values(result.attributeNames)).toContain('age')
      expect(Object.values(result.attributeValues)).toContain(18)
    })

    test('should build condition expression with ne operator', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ status: { ne: 'DELETED' } })

      expect(result.expression).toContain('<>')
      expect(Object.values(result.attributeNames)).toContain('status')
      expect(Object.values(result.attributeValues)).toContain('DELETED')
    })
  })

  describe('ConditionExpressionBuilder - DynamoDB functions', () => {
    test('should build condition expression with exists function (false)', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ email: { exists: false } })

      expect(result.expression).toContain('attribute_not_exists')
      expect(Object.values(result.attributeNames)).toContain('email')
    })

    test('should build condition expression with exists function (true)', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ email: { exists: true } })

      expect(result.expression).toContain('attribute_exists')
      expect(Object.values(result.attributeNames)).toContain('email')
    })

    test('should build condition expression with beginsWith function', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ email: { beginsWith: 'admin@' } })

      expect(result.expression).toContain('begins_with')
      expect(Object.values(result.attributeNames)).toContain('email')
      expect(Object.values(result.attributeValues)).toContain('admin@')
    })

    test('should build condition expression with contains function', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({ tags: { contains: 'admin' } })

      expect(result.expression).toContain('contains')
      expect(Object.values(result.attributeNames)).toContain('tags')
      expect(Object.values(result.attributeValues)).toContain('admin')
    })
  })

  describe('ConditionExpressionBuilder - logical operators', () => {
    test('should build condition expression with AND operator', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        and: [{ status: 'ACTIVE' }, { age: { gte: 18 } }],
      })

      expect(result.expression).toContain('AND')
      expect(Object.values(result.attributeNames)).toContain('status')
      expect(Object.values(result.attributeNames)).toContain('age')
      expect(Object.values(result.attributeValues)).toContain('ACTIVE')
      expect(Object.values(result.attributeValues)).toContain(18)
    })

    test('should build condition expression with OR operator', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        or: [{ status: 'PENDING' }, { status: 'INACTIVE' }],
      })

      expect(result.expression).toContain('OR')
      expect(Object.values(result.attributeValues)).toContain('PENDING')
      expect(Object.values(result.attributeValues)).toContain('INACTIVE')
    })

    test('should build condition expression with NOT operator', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        not: { status: 'ACTIVE' },
      })

      expect(result.expression).toContain('NOT')
      expect(Object.values(result.attributeNames)).toContain('status')
      expect(Object.values(result.attributeValues)).toContain('ACTIVE')
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

      expect(result.expression).toContain('AND')
      expect(result.expression).toContain('OR')
      expect(Object.values(result.attributeNames)).toContain('status')
      expect(Object.values(result.attributeNames)).toContain('age')
      expect(Object.values(result.attributeNames)).toContain('verified')
    })
  })

  describe('ConditionExpressionBuilder - optimistic locking pattern', () => {
    test('should support version-based condition', () => {
      const builder = new ConditionExpressionBuilder()
      const currentVersion = 5
      const result = builder.build({ version: { eq: currentVersion } })

      expect(result.expression).toContain('=')
      expect(Object.values(result.attributeNames)).toContain('version')
      expect(Object.values(result.attributeValues)).toContain(5)
    })

    test('should support multiple conditions for optimistic locking', () => {
      const builder = new ConditionExpressionBuilder()
      const result = builder.build({
        and: [{ version: { eq: 5 } }, { status: 'ACTIVE' }],
      })

      expect(result.expression).toContain('AND')
      expect(Object.values(result.attributeNames)).toContain('version')
      expect(Object.values(result.attributeNames)).toContain('status')
    })
  })

  describe('ConditionalCheckError', () => {
    test('should create ConditionalCheckError with proper fields', () => {
      const condition = '{"status":"ACTIVE"}'
      const error = new ConditionalCheckError('Condition failed', condition, { pk: 'test' })

      expect(error).toBeInstanceOf(ConditionalCheckError)
      expect(error.message).toBe('Condition failed')
      expect(error.condition).toBe(condition)
      expect(error.item).toEqual({ pk: 'test' })
      expect(error.code).toBe('CONDITIONAL_CHECK_FAILED')
      expect(error.operation).toBe('conditionalCheck')
    })

    test('should have proper error name', () => {
      const error = new ConditionalCheckError('Test', '{}')

      expect(error.name).toBe('ConditionalCheckError')
    })
  })
})
