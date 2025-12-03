/**
 * Unit tests for error classes
 */

import { describe, test, expect } from '@rstest/core'
import {
  DynamoDBWrapperError,
  ValidationError,
  ConditionalCheckError,
} from './errors'

describe('DynamoDBWrapperError', () => {
  test('should create error with all properties', () => {
    const error = new DynamoDBWrapperError(
      'Test error message',
      'TEST_CODE',
      'testOperation',
      { key: 'value', count: 42 }
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(DynamoDBWrapperError)
    expect(error.message).toBe('Test error message')
    expect(error.code).toBe('TEST_CODE')
    expect(error.operation).toBe('testOperation')
    expect(error.context).toEqual({ key: 'value', count: 42 })
    expect(error.name).toBe('DynamoDBWrapperError')
  })

  test('should create error without context', () => {
    const error = new DynamoDBWrapperError(
      'Test error',
      'TEST_CODE',
      'testOperation'
    )

    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.operation).toBe('testOperation')
    expect(error.context).toBeUndefined()
  })

  test('should have proper stack trace', () => {
    const error = new DynamoDBWrapperError(
      'Test error',
      'TEST_CODE',
      'testOperation'
    )

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('DynamoDBWrapperError')
  })

  test('should be catchable as Error', () => {
    try {
      throw new DynamoDBWrapperError('Test', 'CODE', 'operation')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(DynamoDBWrapperError)
    }
  })

  test('should preserve context with complex objects', () => {
    const context = {
      tableName: 'users',
      key: { pk: 'USER#123', sk: 'PROFILE' },
      timestamp: Date.now(),
      nested: { deep: { value: true } },
    }

    const error = new DynamoDBWrapperError(
      'Complex context',
      'TEST_CODE',
      'testOperation',
      context
    )

    expect(error.context).toEqual(context)
    expect(error.context?.nested.deep.value).toBe(true)
  })
})

describe('ValidationError', () => {
  test('should create validation error with all properties', () => {
    const error = new ValidationError(
      'Field "email" must be a valid email address',
      'email',
      'invalid-email',
      'email format'
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(DynamoDBWrapperError)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.message).toBe('Field "email" must be a valid email address')
    expect(error.field).toBe('email')
    expect(error.value).toBe('invalid-email')
    expect(error.constraint).toBe('email format')
    expect(error.name).toBe('ValidationError')
  })

  test('should have correct error code and operation', () => {
    const error = new ValidationError(
      'Validation failed',
      'age',
      -5,
      'positive number'
    )

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.operation).toBe('validate')
  })

  test('should include field, value, and constraint in context', () => {
    const error = new ValidationError(
      'Invalid value',
      'status',
      'INVALID',
      'enum: ACTIVE, INACTIVE'
    )

    expect(error.context).toEqual({
      field: 'status',
      value: 'INVALID',
      constraint: 'enum: ACTIVE, INACTIVE',
    })
  })

  test('should handle various value types', () => {
    const testCases = [
      { value: null, constraint: 'required' },
      { value: undefined, constraint: 'required' },
      { value: 123, constraint: 'string type' },
      { value: { nested: 'object' }, constraint: 'primitive type' },
      { value: ['array'], constraint: 'string type' },
      { value: true, constraint: 'string type' },
    ]

    for (const testCase of testCases) {
      const error = new ValidationError(
        'Test',
        'testField',
        testCase.value,
        testCase.constraint
      )

      expect(error.value).toEqual(testCase.value)
      expect(error.constraint).toBe(testCase.constraint)
    }
  })

  test('should have proper stack trace', () => {
    const error = new ValidationError('Test', 'field', 'value', 'constraint')

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('ValidationError')
  })

  test('should be distinguishable from base error', () => {
    const baseError = new DynamoDBWrapperError('Base', 'CODE', 'operation')
    const validationError = new ValidationError('Val', 'field', 'val', 'con')

    expect(validationError).toBeInstanceOf(DynamoDBWrapperError)
    expect(baseError).not.toBeInstanceOf(ValidationError)
    expect(validationError.name).toBe('ValidationError')
    expect(baseError.name).toBe('DynamoDBWrapperError')
  })
})

describe('ConditionalCheckError', () => {
  test('should create conditional check error with all properties', () => {
    const item = { pk: 'USER#123', sk: 'PROFILE', version: 1 }
    const error = new ConditionalCheckError(
      'Conditional check failed: version mismatch',
      'version = 2',
      item
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(DynamoDBWrapperError)
    expect(error).toBeInstanceOf(ConditionalCheckError)
    expect(error.message).toBe('Conditional check failed: version mismatch')
    expect(error.condition).toBe('version = 2')
    expect(error.item).toEqual(item)
    expect(error.name).toBe('ConditionalCheckError')
  })

  test('should create error without item', () => {
    const error = new ConditionalCheckError(
      'Condition not met',
      'attribute_exists(pk)'
    )

    expect(error.message).toBe('Condition not met')
    expect(error.condition).toBe('attribute_exists(pk)')
    expect(error.item).toBeUndefined()
  })

  test('should have correct error code and operation', () => {
    const error = new ConditionalCheckError('Failed', 'status = ACTIVE')

    expect(error.code).toBe('CONDITIONAL_CHECK_FAILED')
    expect(error.operation).toBe('conditionalCheck')
  })

  test('should include condition and item in context', () => {
    const item = { pk: 'ORDER#456', status: 'PENDING' }
    const error = new ConditionalCheckError(
      'Status check failed',
      'status = ACTIVE',
      item
    )

    expect(error.context).toEqual({
      condition: 'status = ACTIVE',
      item: { pk: 'ORDER#456', status: 'PENDING' },
    })
  })

  test('should handle complex condition expressions', () => {
    const conditions = [
      'attribute_exists(pk) AND attribute_not_exists(sk)',
      'version = :v AND status IN (:s1, :s2)',
      '#attr > :val',
      'begins_with(sk, :prefix)',
    ]

    for (const condition of conditions) {
      const error = new ConditionalCheckError('Failed', condition)
      expect(error.condition).toBe(condition)
    }
  })

  test('should handle various item types', () => {
    const items = [
      { pk: 'simple' },
      { pk: 'USER#123', sk: 'PROFILE', nested: { data: { value: 42 } } },
      { pk: 'ITEM#1', tags: ['tag1', 'tag2'], metadata: { created: Date.now() } },
    ]

    for (const item of items) {
      const error = new ConditionalCheckError('Failed', 'condition', item)
      expect(error.item).toEqual(item)
    }
  })

  test('should have proper stack trace', () => {
    const error = new ConditionalCheckError('Test', 'condition')

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('ConditionalCheckError')
  })

  test('should be distinguishable from other errors', () => {
    const baseError = new DynamoDBWrapperError('Base', 'CODE', 'operation')
    const validationError = new ValidationError('Val', 'field', 'val', 'con')
    const conditionalError = new ConditionalCheckError('Cond', 'condition')

    expect(conditionalError).toBeInstanceOf(DynamoDBWrapperError)
    expect(baseError).not.toBeInstanceOf(ConditionalCheckError)
    expect(validationError).not.toBeInstanceOf(ConditionalCheckError)
    expect(conditionalError.name).toBe('ConditionalCheckError')
  })
})

describe('Error inheritance and type checking', () => {
  test('should allow type-safe error handling', () => {
    const errors = [
      new DynamoDBWrapperError('Base', 'CODE', 'op'),
      new ValidationError('Val', 'field', 'val', 'con'),
      new ConditionalCheckError('Cond', 'condition'),
    ]

    for (const error of errors) {
      expect(error).toBeInstanceOf(DynamoDBWrapperError)
      expect(error.code).toBeDefined()
      expect(error.operation).toBeDefined()

      if (error instanceof ValidationError) {
        expect(error.field).toBeDefined()
        expect(error.constraint).toBeDefined()
        expect(error.code).toBe('VALIDATION_ERROR')
      }

      if (error instanceof ConditionalCheckError) {
        expect(error.condition).toBeDefined()
        expect(error.code).toBe('CONDITIONAL_CHECK_FAILED')
      }
    }
  })

  test('should support instanceof checks for error handling', () => {
    const throwValidationError = () => {
      throw new ValidationError('Invalid', 'field', 'value', 'constraint')
    }

    const throwConditionalError = () => {
      throw new ConditionalCheckError('Failed', 'condition')
    }

    try {
      throwValidationError()
    } catch (error) {
      if (error instanceof ValidationError) {
        expect(error.field).toBe('field')
        expect(error.code).toBe('VALIDATION_ERROR')
      } else {
        throw new Error('Should be ValidationError')
      }
    }

    try {
      throwConditionalError()
    } catch (error) {
      if (error instanceof ConditionalCheckError) {
        expect(error.condition).toBe('condition')
        expect(error.code).toBe('CONDITIONAL_CHECK_FAILED')
      } else {
        throw new Error('Should be ConditionalCheckError')
      }
    }
  })

  test('should maintain error hierarchy', () => {
    const validationError = new ValidationError('Val', 'field', 'val', 'con')
    const conditionalError = new ConditionalCheckError('Cond', 'condition')

    // Both should be instances of base class
    expect(validationError).toBeInstanceOf(DynamoDBWrapperError)
    expect(conditionalError).toBeInstanceOf(DynamoDBWrapperError)

    // Both should be instances of Error
    expect(validationError).toBeInstanceOf(Error)
    expect(conditionalError).toBeInstanceOf(Error)

    // Should not be instances of each other
    expect(validationError).not.toBeInstanceOf(ConditionalCheckError)
    expect(conditionalError).not.toBeInstanceOf(ValidationError)
  })
})
