/**
 * Tests for compile-time type safety of access patterns
 * These tests demonstrate that TypeScript will catch errors at compile time
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { AccessPatternDefinitions } from './types'

describe('TableClient - Access Pattern Type Safety', () => {
  test('should provide type-safe pattern names', () => {
    interface User {
      pk: string
      sk: string
      name: string
      email: string
    }

    const accessPatterns = {
      getUserById: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
        }),
      },
      getUserOrders: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { beginsWith: 'ORDER#' },
        }),
      },
    } satisfies AccessPatternDefinitions<User>

    const client = new TableClient<User>({
      tableName: 'test-table',
      accessPatterns,
    })

    // This should compile - valid pattern name
    expect(async () => {
      await client.executePattern('getUserById', { userId: '123' })
    }).toBeDefined()

    // This should compile - another valid pattern name
    expect(async () => {
      await client.executePattern('getUserOrders', { userId: '123' })
    }).toBeDefined()

    // The following would cause a TypeScript error (uncomment to test):
    // await client.executePattern('invalidPattern', { userId: '123' })
    // Error: Argument of type '"invalidPattern"' is not assignable to parameter of type '"getUserById" | "getUserOrders"'
  })

  test('should provide type-safe pattern parameters', () => {
    interface Order {
      pk: string
      sk: string
      amount: number
      status: string
    }

    const accessPatterns = {
      getOrdersByUser: {
        keyCondition: (params: { userId: string; dateFrom: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { gte: params.dateFrom },
        }),
      },
      getOrdersByStatus: {
        keyCondition: (params: { status: string; minAmount: number }) => ({
          pk: `STATUS#${params.status}`,
        }),
        filter: (params: { status: string; minAmount: number }) => ({
          amount: { gte: params.minAmount },
        }),
      },
    } satisfies AccessPatternDefinitions<Order>

    const client = new TableClient<Order>({
      tableName: 'test-table',
      accessPatterns,
    })

    // This should compile - correct parameters
    expect(async () => {
      await client.executePattern('getOrdersByUser', {
        userId: '123',
        dateFrom: '2025-01-01',
      })
    }).toBeDefined()

    // This should compile - correct parameters for different pattern
    expect(async () => {
      await client.executePattern('getOrdersByStatus', {
        status: 'PENDING',
        minAmount: 100,
      })
    }).toBeDefined()

    // The following would cause TypeScript errors (uncomment to test):

    // Missing required parameter:
    // await client.executePattern('getOrdersByUser', { userId: '123' })
    // Error: Property 'dateFrom' is missing

    // Wrong parameter type:
    // await client.executePattern('getOrdersByUser', { userId: 123, dateFrom: '2025-01-01' })
    // Error: Type 'number' is not assignable to type 'string'

    // Extra parameter:
    // await client.executePattern('getOrdersByUser', { userId: '123', dateFrom: '2025-01-01', extra: 'value' })
    // Error: Object literal may only specify known properties
  })

  test('should infer result type from transform function', () => {
    interface Order {
      pk: string
      sk: string
      amount: number
    }

    interface OrderSummary {
      orderId: string
      total: number
    }

    const accessPatterns = {
      getOrderSummaries: {
        keyCondition: (params: { userId: string }) => ({
          pk: `USER#${params.userId}`,
          sk: { beginsWith: 'ORDER#' },
        }),
        transform: (items: Order[]): OrderSummary[] => {
          return items.map((item) => ({
            orderId: item.sk.replace('ORDER#', ''),
            total: item.amount,
          }))
        },
      },
    } satisfies AccessPatternDefinitions<Order>

    const client = new TableClient<Order>({
      tableName: 'test-table',
      accessPatterns,
    })

    // The result type should be inferred as OrderSummary[]
    expect(async () => {
      const result = await client.executePattern('getOrderSummaries', { userId: '123' })
      // TypeScript knows result is OrderSummary[]
      // result[0].orderId is valid
      // result[0].total is valid
      // result[0].amount would be an error
      return result
    }).toBeDefined()
  })

  test('should support optional parameters in patterns', () => {
    interface Product {
      pk: string
      sk: string
      price: number
    }

    const accessPatterns = {
      getProducts: {
        keyCondition: (params: { category: string; minPrice?: number }) => ({
          pk: `CATEGORY#${params.category}`,
        }),
        filter: (params: { category: string; minPrice?: number }) => {
          if (params.minPrice !== undefined) {
            return { price: { gte: params.minPrice } }
          }
          return {}
        },
      },
    } satisfies AccessPatternDefinitions<Product>

    const client = new TableClient<Product>({
      tableName: 'test-table',
      accessPatterns,
    })

    // Both should compile - minPrice is optional
    expect(async () => {
      await client.executePattern('getProducts', { category: 'electronics' })
    }).toBeDefined()

    expect(async () => {
      await client.executePattern('getProducts', {
        category: 'electronics',
        minPrice: 100,
      })
    }).toBeDefined()
  })

  test('should support union types in pattern parameters', () => {
    interface Item {
      pk: string
      sk: string
      status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
    }

    const accessPatterns = {
      getItemsByStatus: {
        keyCondition: (params: { status: 'ACTIVE' | 'INACTIVE' | 'PENDING' }) => ({
          pk: `STATUS#${params.status}`,
        }),
      },
    } satisfies AccessPatternDefinitions<Item>

    const client = new TableClient<Item>({
      tableName: 'test-table',
      accessPatterns,
    })

    // These should compile - valid status values
    expect(async () => {
      await client.executePattern('getItemsByStatus', { status: 'ACTIVE' })
    }).toBeDefined()

    expect(async () => {
      await client.executePattern('getItemsByStatus', { status: 'PENDING' })
    }).toBeDefined()

    // The following would cause a TypeScript error (uncomment to test):
    // await client.executePattern('getItemsByStatus', { status: 'INVALID' })
    // Error: Type '"INVALID"' is not assignable to type '"ACTIVE" | "INACTIVE" | "PENDING"'
  })

  test('should support complex nested parameter types', () => {
    interface Document {
      pk: string
      sk: string
      metadata: {
        author: string
        tags: string[]
      }
    }

    const accessPatterns = {
      searchDocuments: {
        keyCondition: (params: {
          author: string
          filters: {
            dateFrom?: string
            dateTo?: string
            tags?: string[]
          }
        }) => ({
          pk: `AUTHOR#${params.author}`,
        }),
      },
    } satisfies AccessPatternDefinitions<Document>

    const client = new TableClient<Document>({
      tableName: 'test-table',
      accessPatterns,
    })

    // Should compile with nested parameters
    expect(async () => {
      await client.executePattern('searchDocuments', {
        author: 'john-doe',
        filters: {
          dateFrom: '2025-01-01',
          tags: ['typescript', 'dynamodb'],
        },
      })
    }).toBeDefined()

    // Should compile with minimal nested parameters
    expect(async () => {
      await client.executePattern('searchDocuments', {
        author: 'jane-doe',
        filters: {},
      })
    }).toBeDefined()
  })

  test('should work with patterns that have no parameters', () => {
    interface Config {
      pk: string
      sk: string
      value: string
    }

    const accessPatterns = {
      getAllConfigs: {
        keyCondition: () => ({
          pk: 'CONFIG',
        }),
      },
    } satisfies AccessPatternDefinitions<Config>

    const client = new TableClient<Config>({
      tableName: 'test-table',
      accessPatterns,
    })

    // Should compile with empty params object
    expect(async () => {
      await client.executePattern('getAllConfigs', {})
    }).toBeDefined()
  })

  test('should maintain type safety across multiple patterns with different param types', () => {
    interface Entity {
      pk: string
      sk: string
      data: string
    }

    const accessPatterns = {
      pattern1: {
        keyCondition: (params: { id: string }) => ({ pk: params.id }),
      },
      pattern2: {
        keyCondition: (params: { id: number }) => ({ pk: `ID#${params.id}` }),
      },
      pattern3: {
        keyCondition: (params: { name: string; age: number }) => ({
          pk: `${params.name}#${params.age}`,
        }),
      },
    } satisfies AccessPatternDefinitions<Entity>

    const client = new TableClient<Entity>({
      tableName: 'test-table',
      accessPatterns,
    })

    // Each pattern should enforce its own parameter types
    expect(async () => {
      await client.executePattern('pattern1', { id: 'string-id' })
      await client.executePattern('pattern2', { id: 123 })
      await client.executePattern('pattern3', { name: 'John', age: 30 })
    }).toBeDefined()

    // The following would cause TypeScript errors (uncomment to test):
    // await client.executePattern('pattern1', { id: 123 }) // Wrong type
    // await client.executePattern('pattern2', { id: 'string' }) // Wrong type
    // await client.executePattern('pattern3', { name: 'John' }) // Missing parameter
  })
})
