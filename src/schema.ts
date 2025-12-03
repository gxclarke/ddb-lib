/**
 * Schema system for runtime validation and type inference
 */

import { ValidationError } from './errors'
import type { Schema } from './types'

/**
 * Shape definition for object schemas
 */
export type SchemaShape<T> = {
  [K in keyof T]: Schema<T[K]>
}

/**
 * Type inference helper - extracts the type from a Schema
 */
export type Infer<T> = T extends Schema<infer U> ? U : never

/**
 * Parse result for safeParse operations
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError }

/**
 * Abstract base class for all schema types
 */
export abstract class BaseSchema<T> implements Schema<T> {
  /**
   * Internal type marker for type inference
   * @internal
   */
  readonly _type!: T

  /**
   * Parse data and throw on validation failure
   */
  abstract parse(data: unknown): T

  /**
   * Parse data and return result object instead of throwing
   */
  safeParse(data: unknown): ParseResult<T> {
    try {
      const result = this.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { success: false, error }
      }
      // Wrap unexpected errors
      return {
        success: false,
        error: new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          'unknown',
          data,
          'validation'
        ),
      }
    }
  }

  /**
   * Create a schema that makes all properties optional
   */
  partial(): Schema<Partial<T>> {
    return new PartialSchema(this)
  }

  /**
   * Create a schema that picks specific properties
   * Note: This is primarily useful for ObjectSchema
   */
  pick<K extends keyof T>(_keys: K[]): Schema<Pick<T, K>> {
    // Default implementation - subclasses can override
    return this as any
  }

  /**
   * Create a schema that omits specific properties
   * Note: This is primarily useful for ObjectSchema
   */
  omit<K extends keyof T>(_keys: K[]): Schema<Omit<T, K>> {
    // Default implementation - subclasses can override
    return this as any
  }
}

/**
 * Schema wrapper that makes all properties optional
 */
class PartialSchema<T> extends BaseSchema<Partial<T>> {
  constructor(private innerSchema: Schema<T>) {
    super()
  }

  parse(data: unknown): Partial<T> {
    if (data === undefined || data === null) {
      return {}
    }
    // For object schemas, make each property optional
    // For other schemas, just validate normally
    return this.innerSchema.parse(data) as Partial<T>
  }
}



/**
 * Schema wrapper for optional values
 */
export class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private innerSchema: Schema<T>) {
    super()
  }

  parse(data: unknown): T | undefined {
    if (data === undefined) {
      return undefined
    }
    return this.innerSchema.parse(data)
  }
}

/**
 * Schema wrapper for nullable values
 */
export class NullableSchema<T> extends BaseSchema<T | null> {
  constructor(private innerSchema: Schema<T>) {
    super()
  }

  parse(data: unknown): T | null {
    if (data === null) {
      return null
    }
    return this.innerSchema.parse(data)
  }
}

/**
 * String schema type
 */
export class StringSchema extends BaseSchema<string> {
  parse(data: unknown): string {
    if (typeof data !== 'string') {
      throw new ValidationError(
        `Expected string, received ${typeof data}`,
        '',
        data,
        'type'
      )
    }
    return data
  }

  /**
   * Make this string schema optional
   */
  optional(): OptionalSchema<string> {
    return new OptionalSchema(this)
  }

  /**
   * Make this string schema nullable
   */
  nullable(): NullableSchema<string> {
    return new NullableSchema(this)
  }
}

/**
 * Number schema type
 */
export class NumberSchema extends BaseSchema<number> {
  parse(data: unknown): number {
    if (typeof data !== 'number') {
      throw new ValidationError(
        `Expected number, received ${typeof data}`,
        '',
        data,
        'type'
      )
    }
    if (Number.isNaN(data)) {
      throw new ValidationError(
        'Expected number, received NaN',
        '',
        data,
        'type'
      )
    }
    return data
  }

  /**
   * Make this number schema optional
   */
  optional(): OptionalSchema<number> {
    return new OptionalSchema(this)
  }

  /**
   * Make this number schema nullable
   */
  nullable(): NullableSchema<number> {
    return new NullableSchema(this)
  }
}

/**
 * Boolean schema type
 */
export class BooleanSchema extends BaseSchema<boolean> {
  parse(data: unknown): boolean {
    if (typeof data !== 'boolean') {
      throw new ValidationError(
        `Expected boolean, received ${typeof data}`,
        '',
        data,
        'type'
      )
    }
    return data
  }

  /**
   * Make this boolean schema optional
   */
  optional(): OptionalSchema<boolean> {
    return new OptionalSchema(this)
  }

  /**
   * Make this boolean schema nullable
   */
  nullable(): NullableSchema<boolean> {
    return new NullableSchema(this)
  }
}

/**
 * Array schema type with item validation
 */
export class ArraySchema<T> extends BaseSchema<T[]> {
  constructor(private itemSchema: Schema<T>) {
    super()
  }

  parse(data: unknown): T[] {
    if (!Array.isArray(data)) {
      throw new ValidationError(
        `Expected array, received ${typeof data}`,
        '',
        data,
        'type'
      )
    }

    const result: T[] = []
    for (let i = 0; i < data.length; i++) {
      try {
        result.push(this.itemSchema.parse(data[i]))
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(
            `Array item at index ${i}: ${error.message}`,
            `[${i}].${error.field}`,
            data[i],
            error.constraint
          )
        }
        throw error
      }
    }

    return result
  }

  /**
   * Make this array schema optional
   */
  optional(): OptionalSchema<T[]> {
    return new OptionalSchema(this)
  }

  /**
   * Make this array schema nullable
   */
  nullable(): NullableSchema<T[]> {
    return new NullableSchema(this)
  }
}

/**
 * Set schema type for DynamoDB sets
 * DynamoDB supports string sets, number sets, and binary sets
 */
export class SetSchema<T extends string | number | Uint8Array> extends BaseSchema<Set<T>> {
  constructor(private itemSchema: Schema<T>) {
    super()
  }

  parse(data: unknown): Set<T> {
    // Accept both arrays and Sets
    let items: unknown[]
    if (data instanceof Set) {
      items = Array.from(data)
    } else if (Array.isArray(data)) {
      items = data
    } else {
      throw new ValidationError(
        `Expected Set or array, received ${typeof data}`,
        '',
        data,
        'type'
      )
    }

    if (items.length === 0) {
      throw new ValidationError(
        'DynamoDB sets cannot be empty',
        '',
        data,
        'non-empty'
      )
    }

    const result = new Set<T>()
    for (let i = 0; i < items.length; i++) {
      try {
        const validated = this.itemSchema.parse(items[i])
        result.add(validated)
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(
            `Set item at index ${i}: ${error.message}`,
            `[${i}].${error.field}`,
            items[i],
            error.constraint
          )
        }
        throw error
      }
    }

    return result
  }

  /**
   * Make this set schema optional
   */
  optional(): OptionalSchema<Set<T>> {
    return new OptionalSchema(this)
  }

  /**
   * Make this set schema nullable
   */
  nullable(): NullableSchema<Set<T>> {
    return new NullableSchema(this)
  }
}

/**
 * Binary schema type for DynamoDB binary data
 */
export class BinarySchema extends BaseSchema<Uint8Array> {
  parse(data: unknown): Uint8Array {
    if (data instanceof Uint8Array) {
      return data
    }

    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data)
    }

    if (Array.isArray(data)) {
      // Allow arrays of numbers to be converted to Uint8Array
      try {
        return new Uint8Array(data)
      } catch {
        throw new ValidationError(
          'Array contains invalid byte values',
          '',
          data,
          'byte-array'
        )
      }
    }

    throw new ValidationError(
      `Expected Uint8Array, ArrayBuffer, or number array, received ${typeof data}`,
      '',
      data,
      'type'
    )
  }

  /**
   * Make this binary schema optional
   */
  optional(): OptionalSchema<Uint8Array> {
    return new OptionalSchema(this)
  }

  /**
   * Make this binary schema nullable
   */
  nullable(): NullableSchema<Uint8Array> {
    return new NullableSchema(this)
  }
}

/**
 * Object schema type with shape validation
 */
export class ObjectSchema<T extends Record<string, any>> extends BaseSchema<T> {
  constructor(private shape: SchemaShape<T>) {
    super()
  }

  parse(data: unknown): T {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new ValidationError(
        `Expected object, received ${Array.isArray(data) ? 'array' : typeof data}`,
        '',
        data,
        'type'
      )
    }

    const result: any = {}
    const dataObj = data as Record<string, unknown>

    // Validate each property in the shape
    for (const key in this.shape) {
      const fieldSchema = this.shape[key]
      const fieldValue = dataObj[key]

      try {
        result[key] = fieldSchema.parse(fieldValue)
      } catch (error) {
        if (error instanceof ValidationError) {
          // Enhance error with field path
          // If the error field is empty, it's from a primitive schema, so use just the key.
          // Otherwise, append the key to the existing field path.
          const fieldPath = error.field === '' ? key : `${key}.${error.field}`
          throw new ValidationError(
            error.message,
            fieldPath,
            error.value, // Use the original error value, not fieldValue
            error.constraint
          )
        }
        throw error
      }
    }

    return result as T
  }

  /**
   * Create a schema where all properties are optional
   */
  partial(): ObjectSchema<{ [K in keyof T]?: T[K] }> {
    const partialShape: any = {}
    for (const key in this.shape) {
      partialShape[key] = new OptionalSchema(this.shape[key])
    }
    return new ObjectSchema(partialShape)
  }

  /**
   * Create a schema that only includes specified properties
   */
  pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>> {
    const pickedShape: any = {}
    for (const key of keys) {
      if (key in this.shape) {
        pickedShape[key] = this.shape[key]
      }
    }
    return new ObjectSchema(pickedShape)
  }

  /**
   * Create a schema that excludes specified properties
   */
  omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>> {
    const omittedShape: any = {}
    const keysSet = new Set(keys as Array<string | number | symbol>)
    for (const key in this.shape) {
      if (!keysSet.has(key)) {
        omittedShape[key] = this.shape[key]
      }
    }
    return new ObjectSchema(omittedShape)
  }

  /**
   * Make this object schema optional
   */
  optional(): OptionalSchema<T> {
    return new OptionalSchema(this)
  }

  /**
   * Make this object schema nullable
   */
  nullable(): NullableSchema<T> {
    return new NullableSchema(this)
  }
}

/**
 * Schema builder API with factory methods
 */
export const schema = {
  /**
   * Create a string schema
   */
  string(): StringSchema {
    return new StringSchema()
  },

  /**
   * Create a number schema
   */
  number(): NumberSchema {
    return new NumberSchema()
  },

  /**
   * Create a boolean schema
   */
  boolean(): BooleanSchema {
    return new BooleanSchema()
  },

  /**
   * Create an array schema with item validation
   */
  array<T>(itemSchema: Schema<T>): ArraySchema<T> {
    return new ArraySchema(itemSchema)
  },

  /**
   * Create a set schema for DynamoDB sets
   */
  set<T extends string | number | Uint8Array>(itemSchema: Schema<T>): SetSchema<T> {
    return new SetSchema(itemSchema)
  },

  /**
   * Create a binary schema for DynamoDB binary data
   */
  binary(): BinarySchema {
    return new BinarySchema()
  },

  /**
   * Create an object schema with shape validation
   */
  object<T extends Record<string, any>>(shape: SchemaShape<T>): ObjectSchema<T> {
    return new ObjectSchema(shape)
  },

  /**
   * Make a schema optional (allows undefined)
   */
  optional<T>(innerSchema: Schema<T>): OptionalSchema<T> {
    return new OptionalSchema(innerSchema)
  },

  /**
   * Make a schema nullable (allows null)
   */
  nullable<T>(innerSchema: Schema<T>): NullableSchema<T> {
    return new NullableSchema(innerSchema)
  },
}
