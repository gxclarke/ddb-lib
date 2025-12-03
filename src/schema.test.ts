/**
 * Tests for schema system base functionality
 */

import { describe, test, expect } from '@rstest/core'
import {
  BaseSchema,
  OptionalSchema,
  NullableSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ArraySchema,
  SetSchema,
  BinarySchema,
  ObjectSchema,
} from './schema'
import { ValidationError } from './errors'

// Test implementation of BaseSchema for testing
class TestSchema extends BaseSchema<string> {
  parse(data: unknown): string {
    if (typeof data !== 'string') {
      throw new ValidationError(
        'Expected string',
        '',
        data,
        'type'
      )
    }
    return data
  }
}

describe('BaseSchema', () => {
  describe('parse', () => {
    test('should parse valid data', () => {
      const schema = new TestSchema()
      expect(schema.parse('hello')).toBe('hello')
    })

    test('should throw ValidationError on invalid data', () => {
      const schema = new TestSchema()
      expect(() => schema.parse(123)).toThrow(ValidationError)
    })

    test('should use empty string as field for primitive errors', () => {
      const schema = new TestSchema()
      try {
        schema.parse(123)
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.field).toBe('')
        }
      }
    })
  })

  describe('safeParse', () => {
    test('should return success result for valid data', () => {
      const schema = new TestSchema()
      const result = schema.safeParse('hello')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('hello')
      }
    })

    test('should return error result for invalid data', () => {
      const schema = new TestSchema()
      const result = schema.safeParse(123)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.field).toBe('')
      }
    })

    test('should wrap unexpected errors', () => {
      class ThrowingSchema extends BaseSchema<string> {
        parse(_data: unknown): string {
          throw new Error('Unexpected error')
        }
      }
      const schema = new ThrowingSchema()
      const result = schema.safeParse('test')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.message).toBe('Unexpected error')
      }
    })
  })

  describe('partial', () => {
    test('should create a partial schema', () => {
      const schema = new TestSchema()
      const partialSchema = schema.partial()
      expect(partialSchema.parse(undefined)).toEqual({})
      expect(partialSchema.parse(null)).toEqual({})
      expect(partialSchema.parse('hello')).toBe('hello')
    })
  })

  describe('pick', () => {
    test('should pick specific properties', () => {
      // We'll test this more thoroughly with ObjectSchema
      const schema = new TestSchema()
      const pickSchema = schema.pick([])
      expect(pickSchema).toBeDefined()
    })
  })

  describe('omit', () => {
    test('should omit specific properties', () => {
      // We'll test this more thoroughly with ObjectSchema
      const schema = new TestSchema()
      const omitSchema = schema.omit([])
      expect(omitSchema).toBeDefined()
    })
  })
})

describe('OptionalSchema', () => {
  test('should accept undefined', () => {
    const schema = new OptionalSchema(new TestSchema())
    expect(schema.parse(undefined)).toBeUndefined()
  })

  test('should validate defined values', () => {
    const schema = new OptionalSchema(new TestSchema())
    expect(schema.parse('hello')).toBe('hello')
  })

  test('should reject invalid defined values', () => {
    const schema = new OptionalSchema(new TestSchema())
    expect(() => schema.parse(123)).toThrow(ValidationError)
  })

  test('should work with safeParse', () => {
    const schema = new OptionalSchema(new TestSchema())
    const result1 = schema.safeParse(undefined)
    expect(result1.success).toBe(true)
    if (result1.success) {
      expect(result1.data).toBeUndefined()
    }

    const result2 = schema.safeParse('hello')
    expect(result2.success).toBe(true)
    if (result2.success) {
      expect(result2.data).toBe('hello')
    }

    const result3 = schema.safeParse(123)
    expect(result3.success).toBe(false)
  })
})

describe('NullableSchema', () => {
  test('should accept null', () => {
    const schema = new NullableSchema(new TestSchema())
    expect(schema.parse(null)).toBeNull()
  })

  test('should validate non-null values', () => {
    const schema = new NullableSchema(new TestSchema())
    expect(schema.parse('hello')).toBe('hello')
  })

  test('should reject invalid non-null values', () => {
    const schema = new NullableSchema(new TestSchema())
    expect(() => schema.parse(123)).toThrow(ValidationError)
  })

  test('should work with safeParse', () => {
    const schema = new NullableSchema(new TestSchema())
    const result1 = schema.safeParse(null)
    expect(result1.success).toBe(true)
    if (result1.success) {
      expect(result1.data).toBeNull()
    }

    const result2 = schema.safeParse('hello')
    expect(result2.success).toBe(true)
    if (result2.success) {
      expect(result2.data).toBe('hello')
    }

    const result3 = schema.safeParse(123)
    expect(result3.success).toBe(false)
  })
})


describe('StringSchema', () => {
  test('should parse valid string', () => {
    const schema = new StringSchema()
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.parse('')).toBe('')
    expect(schema.parse('123')).toBe('123')
  })

  test('should reject non-string values', () => {
    const schema = new StringSchema()
    expect(() => schema.parse(123)).toThrow(ValidationError)
    expect(() => schema.parse(true)).toThrow(ValidationError)
    expect(() => schema.parse(null)).toThrow(ValidationError)
    expect(() => schema.parse(undefined)).toThrow(ValidationError)
    expect(() => schema.parse({})).toThrow(ValidationError)
    expect(() => schema.parse([])).toThrow(ValidationError)
  })

  test('should provide descriptive error messages', () => {
    const schema = new StringSchema()
    try {
      schema.parse(123)
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.message).toContain('Expected string')
        expect(error.message).toContain('number')
        expect(error.field).toBe('')
        expect(error.value).toBe(123)
      }
    }
  })

  test('should work with safeParse', () => {
    const schema = new StringSchema()
    const result1 = schema.safeParse('hello')
    expect(result1.success).toBe(true)
    if (result1.success) {
      expect(result1.data).toBe('hello')
    }

    const result2 = schema.safeParse(123)
    expect(result2.success).toBe(false)
    if (!result2.success) {
      expect(result2.error).toBeInstanceOf(ValidationError)
    }
  })

  test('should support optional', () => {
    const schema = new StringSchema().optional()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse('hello')).toBe('hello')
    expect(() => schema.parse(123)).toThrow(ValidationError)
  })

  test('should support nullable', () => {
    const schema = new StringSchema().nullable()
    expect(schema.parse(null)).toBeNull()
    expect(schema.parse('hello')).toBe('hello')
    expect(() => schema.parse(123)).toThrow(ValidationError)
  })
})

describe('NumberSchema', () => {
  test('should parse valid numbers', () => {
    const schema = new NumberSchema()
    expect(schema.parse(0)).toBe(0)
    expect(schema.parse(123)).toBe(123)
    expect(schema.parse(-456)).toBe(-456)
    expect(schema.parse(3.14)).toBe(3.14)
    expect(schema.parse(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
    expect(schema.parse(Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY)
  })

  test('should reject NaN', () => {
    const schema = new NumberSchema()
    expect(() => schema.parse(Number.NaN)).toThrow(ValidationError)
  })

  test('should reject non-number values', () => {
    const schema = new NumberSchema()
    expect(() => schema.parse('123')).toThrow(ValidationError)
    expect(() => schema.parse(true)).toThrow(ValidationError)
    expect(() => schema.parse(null)).toThrow(ValidationError)
    expect(() => schema.parse(undefined)).toThrow(ValidationError)
    expect(() => schema.parse({})).toThrow(ValidationError)
    expect(() => schema.parse([])).toThrow(ValidationError)
  })

  test('should provide descriptive error messages', () => {
    const schema = new NumberSchema()
    try {
      schema.parse('123')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.message).toContain('Expected number')
        expect(error.message).toContain('string')
        expect(error.field).toBe('')
        expect(error.value).toBe('123')
      }
    }
  })

  test('should work with safeParse', () => {
    const schema = new NumberSchema()
    const result1 = schema.safeParse(42)
    expect(result1.success).toBe(true)
    if (result1.success) {
      expect(result1.data).toBe(42)
    }

    const result2 = schema.safeParse('42')
    expect(result2.success).toBe(false)
    if (!result2.success) {
      expect(result2.error).toBeInstanceOf(ValidationError)
    }
  })

  test('should support optional', () => {
    const schema = new NumberSchema().optional()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse(42)).toBe(42)
    expect(() => schema.parse('42')).toThrow(ValidationError)
  })

  test('should support nullable', () => {
    const schema = new NumberSchema().nullable()
    expect(schema.parse(null)).toBeNull()
    expect(schema.parse(42)).toBe(42)
    expect(() => schema.parse('42')).toThrow(ValidationError)
  })
})

describe('BooleanSchema', () => {
  test('should parse valid booleans', () => {
    const schema = new BooleanSchema()
    expect(schema.parse(true)).toBe(true)
    expect(schema.parse(false)).toBe(false)
  })

  test('should reject non-boolean values', () => {
    const schema = new BooleanSchema()
    expect(() => schema.parse(1)).toThrow(ValidationError)
    expect(() => schema.parse(0)).toThrow(ValidationError)
    expect(() => schema.parse('true')).toThrow(ValidationError)
    expect(() => schema.parse('false')).toThrow(ValidationError)
    expect(() => schema.parse(null)).toThrow(ValidationError)
    expect(() => schema.parse(undefined)).toThrow(ValidationError)
    expect(() => schema.parse({})).toThrow(ValidationError)
    expect(() => schema.parse([])).toThrow(ValidationError)
  })

  test('should provide descriptive error messages', () => {
    const schema = new BooleanSchema()
    try {
      schema.parse('true')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.message).toContain('Expected boolean')
        expect(error.message).toContain('string')
        expect(error.field).toBe('')
        expect(error.value).toBe('true')
      }
    }
  })

  test('should work with safeParse', () => {
    const schema = new BooleanSchema()
    const result1 = schema.safeParse(true)
    expect(result1.success).toBe(true)
    if (result1.success) {
      expect(result1.data).toBe(true)
    }

    const result2 = schema.safeParse(1)
    expect(result2.success).toBe(false)
    if (!result2.success) {
      expect(result2.error).toBeInstanceOf(ValidationError)
    }
  })

  test('should support optional', () => {
    const schema = new BooleanSchema().optional()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse(true)).toBe(true)
    expect(schema.parse(false)).toBe(false)
    expect(() => schema.parse(1)).toThrow(ValidationError)
  })

  test('should support nullable', () => {
    const schema = new BooleanSchema().nullable()
    expect(schema.parse(null)).toBeNull()
    expect(schema.parse(true)).toBe(true)
    expect(schema.parse(false)).toBe(false)
    expect(() => schema.parse(1)).toThrow(ValidationError)
  })
})


describe('ArraySchema', () => {
  test('should parse valid arrays', () => {
    const schema = new ArraySchema(new StringSchema())
    expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    expect(schema.parse([])).toEqual([])
  })

  test('should validate array items', () => {
    const schema = new ArraySchema(new NumberSchema())
    expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3])
    expect(() => schema.parse([1, 'two', 3])).toThrow(ValidationError)
  })

  test('should reject non-arrays', () => {
    const schema = new ArraySchema(new StringSchema())
    expect(() => schema.parse('not an array')).toThrow(ValidationError)
    expect(() => schema.parse(123)).toThrow(ValidationError)
    expect(() => schema.parse({})).toThrow(ValidationError)
    expect(() => schema.parse(null)).toThrow(ValidationError)
  })

  test('should provide descriptive error messages with index', () => {
    const schema = new ArraySchema(new NumberSchema())
    try {
      schema.parse([1, 2, 'three', 4])
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.message).toContain('index 2')
        expect(error.field).toContain('[2]')
        expect(error.value).toBe('three')
      }
    }
  })

  test('should work with nested arrays', () => {
    const schema = new ArraySchema(new ArraySchema(new NumberSchema()))
    expect(schema.parse([[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]])
    expect(() => schema.parse([[1, 2], ['a', 'b']])).toThrow(ValidationError)
  })

  test('should work with safeParse', () => {
    const schema = new ArraySchema(new StringSchema())
    const result1 = schema.safeParse(['a', 'b'])
    expect(result1.success).toBe(true)
    if (result1.success) {
      expect(result1.data).toEqual(['a', 'b'])
    }

    const result2 = schema.safeParse([1, 2])
    expect(result2.success).toBe(false)
  })

  test('should support optional', () => {
    const schema = new ArraySchema(new StringSchema()).optional()
    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse(['a', 'b'])).toEqual(['a', 'b'])
  })

  test('should support nullable', () => {
    const schema = new ArraySchema(new StringSchema()).nullable()
    expect(schema.parse(null)).toBeNull()
    expect(schema.parse(['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('SetSchema', () => {
  test('should parse valid sets from arrays', () => {
    const schema = new SetSchema(new StringSchema())
    const result = schema.parse(['a', 'b', 'c'])
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(3)
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(true)
    expect(result.has('c')).toBe(true)
  })

  test('should parse valid sets from Set objects', () => {
    const schema = new SetSchema(new NumberSchema())
    const input = new Set([1, 2, 3])
    const result = schema.parse(input)
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(3)
    expect(result.has(1)).toBe(true)
  })

  test('should remove duplicates', () => {
    const schema = new SetSchema(new StringSchema())
    const result = schema.parse(['a', 'b', 'a', 'c', 'b'])
    expect(result.size).toBe(3)
  })

  test('should reject empty sets', () => {
    const schema = new SetSchema(new StringSchema())
    expect(() => schema.parse([])).toThrow(ValidationError)
    expect(() => schema.parse(new Set())).toThrow(ValidationError)
  })

  test('should validate set items', () => {
    const schema = new SetSchema(new NumberSchema())
    expect(() => schema.parse([1, 'two', 3])).toThrow(ValidationError)
  })

  test('should reject non-array/non-set values', () => {
    const schema = new SetSchema(new StringSchema())
    expect(() => schema.parse('not a set')).toThrow(ValidationError)
    expect(() => schema.parse(123)).toThrow(ValidationError)
    expect(() => schema.parse({})).toThrow(ValidationError)
  })

  test('should provide descriptive error messages', () => {
    const schema = new SetSchema(new NumberSchema())
    try {
      schema.parse([1, 2, 'three'])
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.message).toContain('index 2')
        expect(error.field).toContain('[2]')
      }
    }
  })

  test('should work with safeParse', () => {
    const schema = new SetSchema(new StringSchema())
    const result1 = schema.safeParse(['a', 'b'])
    expect(result1.success).toBe(true)

    const result2 = schema.safeParse([])
    expect(result2.success).toBe(false)
  })

  test('should support optional', () => {
    const schema = new SetSchema(new StringSchema()).optional()
    expect(schema.parse(undefined)).toBeUndefined()
    const result = schema.parse(['a', 'b'])
    expect(result).toBeInstanceOf(Set)
  })

  test('should support nullable', () => {
    const schema = new SetSchema(new StringSchema()).nullable()
    expect(schema.parse(null)).toBeNull()
    const result = schema.parse(['a', 'b'])
    expect(result).toBeInstanceOf(Set)
  })
})

describe('BinarySchema', () => {
  test('should parse Uint8Array', () => {
    const schema = new BinarySchema()
    const data = new Uint8Array([1, 2, 3, 4])
    expect(schema.parse(data)).toEqual(data)
  })

  test('should parse ArrayBuffer', () => {
    const schema = new BinarySchema()
    const buffer = new ArrayBuffer(4)
    const view = new Uint8Array(buffer)
    view[0] = 1
    view[1] = 2
    view[2] = 3
    view[3] = 4
    const result = schema.parse(buffer)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(1)
    expect(result[3]).toBe(4)
  })

  test('should parse number arrays', () => {
    const schema = new BinarySchema()
    const result = schema.parse([1, 2, 3, 4])
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(1)
    expect(result[3]).toBe(4)
  })

  test('should handle byte value wrapping', () => {
    const schema = new BinarySchema()
    // Uint8Array automatically wraps values to 0-255 range
    const result1 = schema.parse([1, 2, 256])
    expect(result1[2]).toBe(0) // 256 wraps to 0

    const result2 = schema.parse([1, 2, 257])
    expect(result2[2]).toBe(1) // 257 wraps to 1
  })

  test('should reject non-binary values', () => {
    const schema = new BinarySchema()
    expect(() => schema.parse('not binary')).toThrow(ValidationError)
    expect(() => schema.parse(123)).toThrow(ValidationError)
    expect(() => schema.parse({})).toThrow(ValidationError)
    expect(() => schema.parse(null)).toThrow(ValidationError)
  })

  test('should work with safeParse', () => {
    const schema = new BinarySchema()
    const result1 = schema.safeParse(new Uint8Array([1, 2, 3]))
    expect(result1.success).toBe(true)

    const result2 = schema.safeParse('not binary')
    expect(result2.success).toBe(false)
  })

  test('should support optional', () => {
    const schema = new BinarySchema().optional()
    expect(schema.parse(undefined)).toBeUndefined()
    const result = schema.parse(new Uint8Array([1, 2]))
    expect(result).toBeInstanceOf(Uint8Array)
  })

  test('should support nullable', () => {
    const schema = new BinarySchema().nullable()
    expect(schema.parse(null)).toBeNull()
    const result = schema.parse(new Uint8Array([1, 2]))
    expect(result).toBeInstanceOf(Uint8Array)
  })
})


describe('ObjectSchema', () => {
  test('should parse valid objects', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
      age: new NumberSchema(),
      active: new BooleanSchema(),
    })

    const result = schema.parse({
      name: 'John',
      age: 30,
      active: true,
    })

    expect(result).toEqual({
      name: 'John',
      age: 30,
      active: true,
    })
  })

  test('should validate each property', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
      age: new NumberSchema(),
    })

    expect(() => schema.parse({
      name: 'John',
      age: 'thirty',
    })).toThrow(ValidationError)
  })

  test('should reject non-objects', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
    })

    expect(() => schema.parse('not an object')).toThrow(ValidationError)
    expect(() => schema.parse(123)).toThrow(ValidationError)
    expect(() => schema.parse(null)).toThrow(ValidationError)
    expect(() => schema.parse([])).toThrow(ValidationError)
  })

  test('should provide descriptive error messages with field paths', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
      age: new NumberSchema(),
    })

    try {
      schema.parse({
        name: 'John',
        age: 'thirty',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.field).toBe('age')
        expect(error.value).toBe('thirty')
      }
    }
  })

  test('should support nested objects', () => {
    const schema = new ObjectSchema({
      user: new ObjectSchema({
        name: new StringSchema(),
        email: new StringSchema(),
      }),
      metadata: new ObjectSchema({
        created: new StringSchema(),
        updated: new StringSchema(),
      }),
    })

    const result = schema.parse({
      user: {
        name: 'John',
        email: 'john@example.com',
      },
      metadata: {
        created: '2025-01-01',
        updated: '2025-01-02',
      },
    })

    expect(result.user.name).toBe('John')
    expect(result.metadata.created).toBe('2025-01-01')
  })

  test('should provide nested field paths in errors', () => {
    const schema = new ObjectSchema({
      user: new ObjectSchema({
        name: new StringSchema(),
        age: new NumberSchema(),
      }),
    })

    try {
      schema.parse({
        user: {
          name: 'John',
          age: 'thirty',
        },
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.field).toBe('user.age')
      }
    }
  })

  test('should support optional fields', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
      age: new NumberSchema().optional(),
    })

    const result1 = schema.parse({
      name: 'John',
      age: 30,
    })
    expect(result1.age).toBe(30)

    const result2 = schema.parse({
      name: 'Jane',
      age: undefined,
    })
    expect(result2.age).toBeUndefined()
  })

  test('should support arrays in objects', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
      tags: new ArraySchema(new StringSchema()),
    })

    const result = schema.parse({
      name: 'John',
      tags: ['tag1', 'tag2'],
    })

    expect(result.tags).toEqual(['tag1', 'tag2'])
  })

  test('should support sets in objects', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
      tags: new SetSchema(new StringSchema()),
    })

    const result = schema.parse({
      name: 'John',
      tags: ['tag1', 'tag2'],
    })

    expect(result.tags).toBeInstanceOf(Set)
    expect(result.tags.size).toBe(2)
  })

  test('should work with safeParse', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
      age: new NumberSchema(),
    })

    const result1 = schema.safeParse({
      name: 'John',
      age: 30,
    })
    expect(result1.success).toBe(true)

    const result2 = schema.safeParse({
      name: 'John',
      age: 'thirty',
    })
    expect(result2.success).toBe(false)
  })

  describe('partial', () => {
    test('should make all properties optional', () => {
      const schema = new ObjectSchema({
        name: new StringSchema(),
        age: new NumberSchema(),
        active: new BooleanSchema(),
      })

      const partialSchema = schema.partial()

      const result1 = partialSchema.parse({
        name: 'John',
      })
      expect(result1.name).toBe('John')
      expect(result1.age).toBeUndefined()

      const result2 = partialSchema.parse({
        age: 30,
      })
      expect(result2.age).toBe(30)
      expect(result2.name).toBeUndefined()

      const result3 = partialSchema.parse({})
      expect(result3).toEqual({})
    })

    test('should still validate provided properties', () => {
      const schema = new ObjectSchema({
        name: new StringSchema(),
        age: new NumberSchema(),
      })

      const partialSchema = schema.partial()

      expect(() => partialSchema.parse({
        name: 123,
      })).toThrow(ValidationError)
    })
  })

  describe('pick', () => {
    test('should only include specified properties', () => {
      const schema = new ObjectSchema({
        name: new StringSchema(),
        age: new NumberSchema(),
        email: new StringSchema(),
        active: new BooleanSchema(),
      })

      const pickedSchema = schema.pick(['name', 'email'])

      const result = pickedSchema.parse({
        name: 'John',
        email: 'john@example.com',
      })

      expect(result).toEqual({
        name: 'John',
        email: 'john@example.com',
      })
    })

    test('should validate picked properties', () => {
      const schema = new ObjectSchema({
        name: new StringSchema(),
        age: new NumberSchema(),
        email: new StringSchema(),
      })

      const pickedSchema = schema.pick(['name', 'age'])

      expect(() => pickedSchema.parse({
        name: 'John',
        age: 'thirty',
      })).toThrow(ValidationError)
    })
  })

  describe('omit', () => {
    test('should exclude specified properties', () => {
      const schema = new ObjectSchema({
        name: new StringSchema(),
        age: new NumberSchema(),
        email: new StringSchema(),
        password: new StringSchema(),
      })

      const omittedSchema = schema.omit(['password'])

      const result = omittedSchema.parse({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      })

      expect(result).toEqual({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      })
    })

    test('should validate remaining properties', () => {
      const schema = new ObjectSchema({
        name: new StringSchema(),
        age: new NumberSchema(),
        password: new StringSchema(),
      })

      const omittedSchema = schema.omit(['password'])

      expect(() => omittedSchema.parse({
        name: 'John',
        age: 'thirty',
      })).toThrow(ValidationError)
    })
  })

  test('should support optional object schema', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
    }).optional()

    expect(schema.parse(undefined)).toBeUndefined()
    expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' })
  })

  test('should support nullable object schema', () => {
    const schema = new ObjectSchema({
      name: new StringSchema(),
    }).nullable()

    expect(schema.parse(null)).toBeNull()
    expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' })
  })

  test('should handle deeply nested objects', () => {
    const schema = new ObjectSchema({
      level1: new ObjectSchema({
        level2: new ObjectSchema({
          level3: new ObjectSchema({
            value: new StringSchema(),
          }),
        }),
      }),
    })

    const result = schema.parse({
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    })

    expect(result.level1.level2.level3.value).toBe('deep')
  })

  test('should provide correct error paths for deeply nested objects', () => {
    const schema = new ObjectSchema({
      level1: new ObjectSchema({
        level2: new ObjectSchema({
          level3: new ObjectSchema({
            value: new NumberSchema(),
          }),
        }),
      }),
    })

    try {
      schema.parse({
        level1: {
          level2: {
            level3: {
              value: 'not a number',
            },
          },
        },
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      if (error instanceof ValidationError) {
        expect(error.field).toBe('level1.level2.level3.value')
      }
    }
  })
})
