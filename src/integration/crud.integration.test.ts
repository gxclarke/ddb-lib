/**
 * End-to-end integration tests for CRUD operations with DynamoDB Local
 */

import { describe, it, expect, beforeAll, afterAll } from '@rstest/core'
import { TableClient } from '../table-client'
import { schema } from '../schema'
import { ValidationError, ConditionalCheckError } from '../errors'
import {
  setupTestTable,
  type TestTableConfig,
} from '../test-utils/dynamodb-local'
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'

describe('CRUD Integration Tests', () => {
  let client: DynamoDBClient
  let cleanup: () => Promise<void>
  const tableName = 'integration-crud-test'

  beforeAll(async () => {
    const config: TestTableConfig = {
      tableName,
      partitionKey: { name: 'pk', type: 'S' },
      sortKey: { name: 'sk', type: 'S' },
    }

    const setup = await setupTestTable(config)
    client = setup.client
    cleanup = setup.cleanup
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('Untyped CRUD operations', () => {
    it('should perform complete CRUD lifecycle', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // CREATE
      const item = {
        pk: 'USER#1',
        sk: 'PROFILE',
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
      }

      await table.put(item)

      // READ
      const retrieved = await table.get({ pk: 'USER#1', sk: 'PROFILE' })
      expect(retrieved).toEqual(item)

      // UPDATE
      const updated = await table.update(
        { pk: 'USER#1', sk: 'PROFILE' },
        { age: 31, email: 'alice.new@example.com' },
      )

      expect(updated.age).toBe(31)
      expect(updated.email).toBe('alice.new@example.com')
      expect(updated.name).toBe('Alice')

      // DELETE
      await table.delete({ pk: 'USER#1', sk: 'PROFILE' })

      // Verify deletion
      const deleted = await table.get({ pk: 'USER#1', sk: 'PROFILE' })
      expect(deleted).toBeNull()
    })

    it('should return null for non-existent item', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      const result = await table.get({
        pk: 'NONEXISTENT',
        sk: 'ITEM',
      })

      expect(result).toBeNull()
    })

    it('should handle put with returnValues', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put initial item
      await table.put({
        pk: 'USER#2',
        sk: 'PROFILE',
        name: 'Bob',
        version: 1,
      })

      // Update with returnValues
      const oldItem = await table.put(
        {
          pk: 'USER#2',
          sk: 'PROFILE',
          name: 'Bob Updated',
          version: 2,
        },
        { returnValues: 'ALL_OLD' },
      )

      expect(oldItem?.name).toBe('Bob')
      expect(oldItem?.version).toBe(1)

      // Cleanup
      await table.delete({ pk: 'USER#2', sk: 'PROFILE' })
    })

    it('should handle update with returnValues', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put initial item
      await table.put({
        pk: 'USER#3',
        sk: 'PROFILE',
        name: 'Charlie',
        age: 25,
      })

      // Update with ALL_NEW
      const updated = await table.update(
        { pk: 'USER#3', sk: 'PROFILE' },
        { age: 26 },
        { returnValues: 'ALL_NEW' },
      )

      expect(updated.age).toBe(26)
      expect(updated.name).toBe('Charlie')

      // Cleanup
      await table.delete({ pk: 'USER#3', sk: 'PROFILE' })
    })

    it('should handle delete with returnValues', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put initial item
      await table.put({
        pk: 'USER#4',
        sk: 'PROFILE',
        name: 'David',
      })

      // Delete with returnValues
      const deleted = await table.delete(
        { pk: 'USER#4', sk: 'PROFILE' },
        { returnValues: 'ALL_OLD' },
      )

      expect(deleted?.name).toBe('David')
    })

    it('should handle consistent read', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put item
      await table.put({
        pk: 'USER#5',
        sk: 'PROFILE',
        name: 'Eve',
      })

      // Read with consistent read
      const result = await table.get(
        { pk: 'USER#5', sk: 'PROFILE' },
        { consistentRead: true },
      )

      expect(result?.name).toBe('Eve')

      // Cleanup
      await table.delete({ pk: 'USER#5', sk: 'PROFILE' })
    })

    it('should handle projection expression', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put item with multiple attributes
      await table.put({
        pk: 'USER#6',
        sk: 'PROFILE',
        name: 'Frank',
        email: 'frank@example.com',
        age: 40,
        address: '123 Main St',
      })

      // Get with projection
      const result = await table.get(
        { pk: 'USER#6', sk: 'PROFILE' },
        { projectionExpression: ['name', 'email'] },
      )

      expect(result?.name).toBe('Frank')
      expect(result?.email).toBe('frank@example.com')
      expect(result?.age).toBeUndefined()
      expect(result?.address).toBeUndefined()

      // Cleanup
      await table.delete({ pk: 'USER#6', sk: 'PROFILE' })
    })
  })

  describe('Typed CRUD operations with schema', () => {
    interface User {
      pk: string
      sk: string
      name: string
      email: string
      age: number
      tags?: string[]
    }

    const userSchema = schema.object({
      pk: schema.string(),
      sk: schema.string(),
      name: schema.string(),
      email: schema.string(),
      age: schema.number(),
      tags: schema.array(schema.string()).optional(),
    })

    it('should perform CRUD with schema validation', async () => {
      const table = new TableClient<User>({
        tableName,
        client,
        schema: userSchema,
      })

      // CREATE with valid data
      const user: User = {
        pk: 'USER#10',
        sk: 'PROFILE',
        name: 'Grace',
        email: 'grace@example.com',
        age: 28,
        tags: ['developer', 'typescript'],
      }

      await table.put(user)

      // READ
      const retrieved = await table.get({ pk: 'USER#10', sk: 'PROFILE' })
      expect(retrieved).toEqual(user)

      // UPDATE
      const updated = await table.update(
        { pk: 'USER#10', sk: 'PROFILE' },
        { age: 29 },
      )

      expect(updated.age).toBe(29)

      // DELETE
      await table.delete({ pk: 'USER#10', sk: 'PROFILE' })
    })

    it('should reject invalid data with schema', async () => {
      const table = new TableClient<User>({
        tableName,
        client,
        schema: userSchema,
      })

      // Try to put invalid data
      await expect(
        table.put({
          pk: 'USER#11',
          sk: 'PROFILE',
          name: 'Invalid',
          email: 'invalid@example.com',
          age: 'not a number' as any, // Invalid type
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should validate on update', async () => {
      const table = new TableClient<User>({
        tableName,
        client,
        schema: userSchema,
      })

      // Put valid item
      await table.put({
        pk: 'USER#12',
        sk: 'PROFILE',
        name: 'Henry',
        email: 'henry@example.com',
        age: 35,
      })

      // Try to update with invalid data
      await expect(
        table.update(
          { pk: 'USER#12', sk: 'PROFILE' },
          { age: 'invalid' as any },
        ),
      ).rejects.toThrow(ValidationError)

      // Cleanup
      await table.delete({ pk: 'USER#12', sk: 'PROFILE' })
    })

    it('should handle optional fields', async () => {
      const table = new TableClient<User>({
        tableName,
        client,
        schema: userSchema,
      })

      // Put without optional field
      await table.put({
        pk: 'USER#13',
        sk: 'PROFILE',
        name: 'Iris',
        email: 'iris@example.com',
        age: 32,
      })

      const retrieved = await table.get({ pk: 'USER#13', sk: 'PROFILE' })
      expect(retrieved?.tags).toBeUndefined()

      // Cleanup
      await table.delete({ pk: 'USER#13', sk: 'PROFILE' })
    })
  })

  describe('Conditional operations', () => {
    it('should handle conditional put', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put initial item
      await table.put({
        pk: 'USER#20',
        sk: 'PROFILE',
        name: 'Jack',
        version: 1,
      })

      // Try to put with condition that fails
      await expect(
        table.put(
          {
            pk: 'USER#20',
            sk: 'PROFILE',
            name: 'Jack Updated',
            version: 2,
          },
          {
            condition: {
              attribute_not_exists: 'pk',
            },
          },
        ),
      ).rejects.toThrow(ConditionalCheckError)

      // Cleanup
      await table.delete({ pk: 'USER#20', sk: 'PROFILE' })
    })

    it('should handle conditional update', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put initial item
      await table.put({
        pk: 'USER#21',
        sk: 'PROFILE',
        name: 'Kate',
        status: 'active',
      })

      // Update with condition
      await table.update(
        { pk: 'USER#21', sk: 'PROFILE' },
        { name: 'Kate Updated' },
        {
          condition: {
            status: { eq: 'active' },
          },
        },
      )

      const retrieved = await table.get({ pk: 'USER#21', sk: 'PROFILE' })
      expect(retrieved?.name).toBe('Kate Updated')

      // Try update with failing condition
      await expect(
        table.update(
          { pk: 'USER#21', sk: 'PROFILE' },
          { name: 'Kate Again' },
          {
            condition: {
              status: { eq: 'inactive' },
            },
          },
        ),
      ).rejects.toThrow(ConditionalCheckError)

      // Cleanup
      await table.delete({ pk: 'USER#21', sk: 'PROFILE' })
    })

    it('should handle conditional delete', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Put initial item
      await table.put({
        pk: 'USER#22',
        sk: 'PROFILE',
        name: 'Leo',
        deletable: true,
      })

      // Delete with condition
      await table.delete(
        { pk: 'USER#22', sk: 'PROFILE' },
        {
          condition: {
            deletable: { eq: true },
          },
        },
      )

      const retrieved = await table.get({ pk: 'USER#22', sk: 'PROFILE' })
      expect(retrieved).toBeNull()
    })
  })

  describe('Error scenarios', () => {
    it('should handle network errors gracefully', async () => {
      // Create client with invalid endpoint
      const badTable = new TableClient({
        tableName,
        endpoint: 'http://localhost:9999', // Non-existent endpoint
        region: 'us-east-1',
      })

      await expect(
        badTable.get({ pk: 'TEST', sk: 'TEST' }),
      ).rejects.toThrow()
    })

    it('should handle missing table', async () => {
      const table = new TableClient({
        tableName: 'non-existent-table',
        client,
      })

      await expect(
        table.get({ pk: 'TEST', sk: 'TEST' }),
      ).rejects.toThrow()
    })

    it('should handle malformed keys', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      // Missing required sort key
      await expect(
        table.get({ pk: 'USER#99' } as any),
      ).rejects.toThrow()
    })
  })

  describe('Complex data types', () => {
    it('should handle arrays', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      await table.put({
        pk: 'USER#30',
        sk: 'PROFILE',
        name: 'Mike',
        hobbies: ['reading', 'coding', 'gaming'],
      })

      const retrieved = await table.get({ pk: 'USER#30', sk: 'PROFILE' })
      expect(retrieved?.hobbies).toEqual(['reading', 'coding', 'gaming'])

      // Cleanup
      await table.delete({ pk: 'USER#30', sk: 'PROFILE' })
    })

    it('should handle nested objects', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      await table.put({
        pk: 'USER#31',
        sk: 'PROFILE',
        name: 'Nancy',
        address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
        },
      })

      const retrieved = await table.get({ pk: 'USER#31', sk: 'PROFILE' })
      expect(retrieved?.address.city).toBe('Boston')

      // Cleanup
      await table.delete({ pk: 'USER#31', sk: 'PROFILE' })
    })

    it('should handle sets', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      await table.put({
        pk: 'USER#32',
        sk: 'PROFILE',
        name: 'Oscar',
        tags: new Set(['developer', 'typescript', 'aws']),
      })

      const retrieved = await table.get({ pk: 'USER#32', sk: 'PROFILE' })
      expect(retrieved?.tags).toBeInstanceOf(Set)
      expect(retrieved?.tags.has('developer')).toBe(true)

      // Cleanup
      await table.delete({ pk: 'USER#32', sk: 'PROFILE' })
    })

    it('should handle numbers', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      await table.put({
        pk: 'PRODUCT#1',
        sk: 'DETAILS',
        name: 'Widget',
        price: 19.99,
        quantity: 100,
      })

      const retrieved = await table.get({ pk: 'PRODUCT#1', sk: 'DETAILS' })
      expect(retrieved?.price).toBe(19.99)
      expect(retrieved?.quantity).toBe(100)

      // Cleanup
      await table.delete({ pk: 'PRODUCT#1', sk: 'DETAILS' })
    })

    it('should handle booleans', async () => {
      const table = new TableClient({
        tableName,
        client,
      })

      await table.put({
        pk: 'USER#33',
        sk: 'PROFILE',
        name: 'Paula',
        active: true,
        verified: false,
      })

      const retrieved = await table.get({ pk: 'USER#33', sk: 'PROFILE' })
      expect(retrieved?.active).toBe(true)
      expect(retrieved?.verified).toBe(false)

      // Cleanup
      await table.delete({ pk: 'USER#33', sk: 'PROFILE' })
    })
  })
})
