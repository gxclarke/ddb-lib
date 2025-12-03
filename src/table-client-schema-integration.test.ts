/**
 * Integration tests for TableClient with schema validation
 * These tests demonstrate the schema validation feature working end-to-end
 */

import { describe, it, expect } from '@rstest/core'
import { TableClient } from './table-client'
import { schema } from './schema'
import { ValidationError } from './errors'
import type { TableClientConfig } from './types'

describe('TableClient Schema Integration', () => {
  it('should validate and put a valid user', async () => {
    // Define a user schema
    const UserSchema = schema.object({
      pk: schema.string(),
      sk: schema.string(),
      name: schema.string(),
      email: schema.string(),
      age: schema.number(),
      isActive: schema.boolean(),
      tags: schema.array(schema.string()).optional(),
    })

    const config: TableClientConfig = {
      tableName: 'users-table',
      schema: UserSchema,
      endpoint: 'http://localhost:8000',
      region: 'us-east-1',
    }

    const client = new TableClient(config)

    // Mock the DynamoDB client
    const originalSend = client['docClient'].send.bind(client['docClient'])
    client['docClient'].send = async () => ({})

    // Valid user
    const user = {
      pk: 'USER#123',
      sk: 'PROFILE',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      isActive: true,
      tags: ['admin', 'user'],
    }

    // Should succeed
    await expect(client.put(user)).resolves.not.toThrow()

    // Restore
    client['docClient'].send = originalSend
  })

  it('should reject invalid user with detailed error', async () => {
    const UserSchema = schema.object({
      pk: schema.string(),
      sk: schema.string(),
      name: schema.string(),
      email: schema.string(),
      age: schema.number(),
    })

    const config: TableClientConfig = {
      tableName: 'users-table',
      schema: UserSchema,
      endpoint: 'http://localhost:8000',
      region: 'us-east-1',
    }

    const client = new TableClient(config)

    // Invalid user - age is string instead of number
    const invalidUser = {
      pk: 'USER#123',
      sk: 'PROFILE',
      name: 'John Doe',
      email: 'john@example.com',
      age: 'thirty', // Wrong type!
    }

    try {
      await client.put(invalidUser as any)
      expect.fail('Should have thrown ValidationError')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validationError = error as ValidationError

      // Verify error details
      expect(validationError.field).toBe('age')
      expect(validationError.value).toBe('thirty')
      expect(validationError.constraint).toBe('type')
      expect(validationError.message).toContain('Expected number')
    }
  })

  it('should validate partial updates correctly', async () => {
    const UserSchema = schema.object({
      pk: schema.string(),
      sk: schema.string(),
      name: schema.string(),
      email: schema.string(),
      age: schema.number(),
      metadata: schema.object({
        lastLogin: schema.string(),
        loginCount: schema.number(),
      }),
    })

    const config: TableClientConfig = {
      tableName: 'users-table',
      schema: UserSchema,
      endpoint: 'http://localhost:8000',
      region: 'us-east-1',
    }

    const client = new TableClient(config)

    // Mock the DynamoDB client
    const originalSend = client['docClient'].send.bind(client['docClient'])
    client['docClient'].send = async () => ({ Attributes: {} })

    // Valid partial update - only updating name
    await expect(
      client.update({ pk: 'USER#123', sk: 'PROFILE' }, { name: 'Jane Doe' })
    ).resolves.not.toThrow()

    // Valid partial update - updating nested object
    await expect(
      client.update(
        { pk: 'USER#123', sk: 'PROFILE' },
        {
          metadata: {
            lastLogin: '2025-12-02T10:00:00Z',
            loginCount: 5,
          },
        }
      )
    ).resolves.not.toThrow()

    // Invalid partial update - wrong type
    await expect(
      client.update({ pk: 'USER#123', sk: 'PROFILE' }, { age: 'thirty' } as any)
    ).rejects.toThrow(ValidationError)

    // Restore
    client['docClient'].send = originalSend
  })

  it('should work without schema for untyped operations', async () => {
    const config: TableClientConfig = {
      tableName: 'flexible-table',
      endpoint: 'http://localhost:8000',
      region: 'us-east-1',
      // No schema provided
    }

    const client = new TableClient(config)

    // Mock the DynamoDB client
    const originalSend = client['docClient'].send.bind(client['docClient'])
    client['docClient'].send = async () => ({})

    // Any data structure should work
    const flexibleItem = {
      pk: 'ITEM#123',
      sk: 'DATA',
      anyField: 'any value',
      anotherField: 123,
      nested: {
        data: true,
      },
    }

    await expect(client.put(flexibleItem)).resolves.not.toThrow()

    // Restore
    client['docClient'].send = originalSend
  })

  it('should validate complex nested structures', async () => {
    const OrderSchema = schema.object({
      pk: schema.string(),
      sk: schema.string(),
      orderId: schema.string(),
      customer: schema.object({
        id: schema.string(),
        name: schema.string(),
        email: schema.string(),
      }),
      items: schema.array(
        schema.object({
          productId: schema.string(),
          quantity: schema.number(),
          price: schema.number(),
        })
      ),
      total: schema.number(),
      status: schema.string(),
    })

    const config: TableClientConfig = {
      tableName: 'orders-table',
      schema: OrderSchema,
      endpoint: 'http://localhost:8000',
      region: 'us-east-1',
    }

    const client = new TableClient(config)

    // Mock the DynamoDB client
    const originalSend = client['docClient'].send.bind(client['docClient'])
    client['docClient'].send = async () => ({})

    // Valid complex order
    const order = {
      pk: 'ORDER#123',
      sk: 'METADATA',
      orderId: 'ORD-123',
      customer: {
        id: 'CUST-456',
        name: 'John Doe',
        email: 'john@example.com',
      },
      items: [
        {
          productId: 'PROD-1',
          quantity: 2,
          price: 29.99,
        },
        {
          productId: 'PROD-2',
          quantity: 1,
          price: 49.99,
        },
      ],
      total: 109.97,
      status: 'PENDING',
    }

    await expect(client.put(order)).resolves.not.toThrow()

    // Invalid order - wrong type in nested array
    const invalidOrder = {
      ...order,
      items: [
        {
          productId: 'PROD-1',
          quantity: 'two', // Should be number!
          price: 29.99,
        },
      ],
    }

    try {
      await client.put(invalidOrder as any)
      expect.fail('Should have thrown ValidationError')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validationError = error as ValidationError
      expect(validationError.field).toContain('items')
      expect(validationError.field).toContain('quantity')
    }

    // Restore
    client['docClient'].send = originalSend
  })
})
