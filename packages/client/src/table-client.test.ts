/**
 * Unit tests for TableClient
 */

import { describe, it, expect } from '@rstest/core'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from './table-client'
import { schema } from './schema'
import { ValidationError } from './errors'
import type { TableClientConfig } from './types'

describe('TableClient', () => {
  describe('constructor', () => {
    it('should initialize with minimal config', () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
      }

      const client = new TableClient(config)

      expect(client).toBeDefined()
      expect(client.getTableName()).toBe('test-table')
      expect(client.getClient()).toBeInstanceOf(DynamoDBClient)
    })

    it('should use provided DynamoDB client', () => {
      const mockClient = new DynamoDBClient({ region: 'us-east-1' })
      const config: TableClientConfig = {
        tableName: 'test-table',
        client: mockClient,
      }

      const client = new TableClient(config)

      expect(client.getClient()).toBe(mockClient)
    })

    it('should create new client with region', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        region: 'us-west-2',
      }

      const client = new TableClient(config)

      expect(client.getClient()).toBeInstanceOf(DynamoDBClient)
      // Region is a function in AWS SDK v3, need to call it
      const region = await client.getClient().config.region()
      expect(region).toBe('us-west-2')
    })

    it('should create new client with custom endpoint', () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
      }

      const client = new TableClient(config)

      expect(client.getClient()).toBeInstanceOf(DynamoDBClient)
    })

    it('should create new client with region and endpoint', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        region: 'us-east-1',
        endpoint: 'http://localhost:8000',
      }

      const client = new TableClient(config)

      expect(client.getClient()).toBeInstanceOf(DynamoDBClient)
      // Region is a function in AWS SDK v3, need to call it
      const region = await client.getClient().config.region()
      expect(region).toBe('us-east-1')
    })

    it('should store table name', () => {
      const config: TableClientConfig = {
        tableName: 'my-awesome-table',
      }

      const client = new TableClient(config)

      expect(client.getTableName()).toBe('my-awesome-table')
    })

    it('should accept schema in config', () => {
      const mockSchema = {
        parse: () => ({}),
        safeParse: () => ({ success: true, data: {} }),
        partial: () => mockSchema,
        pick: () => mockSchema,
        omit: () => mockSchema,
      }

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: mockSchema as any,
      }

      const client = new TableClient(config)

      expect(client).toBeDefined()
    })

    it('should accept access patterns in config', () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        accessPatterns: {
          getUserById: {
            keyCondition: (params: { userId: string }) => ({
              pk: `USER#${params.userId}`,
            }),
          },
        },
      }

      const client = new TableClient(config)

      expect(client).toBeDefined()
    })

    it('should accept stats config', () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        statsConfig: {
          enabled: true,
          sampleRate: 0.5,
          thresholds: {
            slowQueryMs: 1000,
            highRCU: 100,
            highWCU: 50,
          },
        },
      }

      const client = new TableClient(config)

      expect(client).toBeDefined()
    })

    it('should accept debug flag', () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        debug: true,
      }

      const client = new TableClient(config)

      expect(client).toBeDefined()
    })
  })

  describe('get', () => {
    it('should get an item by key', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      // Mock the send method
      const mockItem = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Item: mockItem })

      const result = await client.get({ pk: 'USER#123', sk: 'PROFILE' })

      expect(result).toEqual(mockItem)

      // Restore
      client['docClient'].send = originalSend
    })

    it('should return null for non-existent item', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      // Mock the send method to return no item
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({})

      const result = await client.get({ pk: 'USER#999' })

      expect(result).toBeNull()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support consistent read option', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const mockItem = { pk: 'USER#123', name: 'John Doe' }
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Item: mockItem }
      }

      await client.get({ pk: 'USER#123' }, { consistentRead: true })

      expect(capturedParams.ConsistentRead).toBe(true)

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support projection expression option', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const mockItem = { pk: 'USER#123', name: 'John Doe' }
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Item: mockItem }
      }

      await client.get(
        { pk: 'USER#123' },
        { projectionExpression: ['name', 'email'] }
      )

      expect(capturedParams.ProjectionExpression).toBe('#p0, #p1')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#p0': 'name',
        '#p1': 'email',
      })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should work with only partition key', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const mockItem = { pk: 'USER#123', name: 'John Doe' }
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Item: mockItem })

      const result = await client.get({ pk: 'USER#123' })

      expect(result).toEqual(mockItem)

      // Restore
      client['docClient'].send = originalSend
    })

    it('should work with partition and sort key', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const mockItem = { pk: 'USER#123', sk: 'ORDER#456', total: 100 }
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Item: mockItem })

      const result = await client.get({ pk: 'USER#123', sk: 'ORDER#456' })

      expect(result).toEqual(mockItem)

      // Restore
      client['docClient'].send = originalSend
    })
  })

  describe('put', () => {
    it('should put an item', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item)

      expect(capturedParams.TableName).toBe('test-table')
      expect(capturedParams.Item).toEqual(item)

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional put with simple equality', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item, {
        condition: { version: 1 },
      })

      expect(capturedParams.ConditionExpression).toBe('#c0 = :c0')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#c0': 'version' })
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':c0': 1 })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional put with eq operator', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item, {
        condition: { status: { eq: 'ACTIVE' } },
      })

      expect(capturedParams.ConditionExpression).toBe('#c0 = :c0')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#c0': 'status' })
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':c0': 'ACTIVE' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional put with exists', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item, {
        condition: { pk: { exists: false } },
      })

      expect(capturedParams.ConditionExpression).toBe('attribute_not_exists(#c0)')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#c0': 'pk' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional put with multiple conditions', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item, {
        condition: { version: 1, status: 'ACTIVE' },
      })

      expect(capturedParams.ConditionExpression).toContain('#c0 = :c0')
      expect(capturedParams.ConditionExpression).toContain('#c1 = :c1')
      expect(capturedParams.ConditionExpression).toContain('AND')

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support returnValues option', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item, {
        returnValues: 'ALL_OLD',
      })

      expect(capturedParams.ReturnValues).toBe('ALL_OLD')

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support comparison operators in conditions', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item, {
        condition: { age: { gte: 18 } },
      })

      expect(capturedParams.ConditionExpression).toBe('#c0 >= :c0')
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':c0': 18 })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support beginsWith in conditions', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      const item = { pk: 'USER#123', sk: 'PROFILE', name: 'John Doe' }
      await client.put(item, {
        condition: { email: { beginsWith: 'john' } },
      })

      expect(capturedParams.ConditionExpression).toBe('begins_with(#c0, :c0)')
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':c0': 'john' })

      // Restore
      client['docClient'].send = originalSend
    })
  })

  describe('update', () => {
    it('should update an item', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const updatedItem = { pk: 'USER#123', sk: 'PROFILE', name: 'Jane Doe', age: 30 }
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Attributes: updatedItem }
      }

      const result = await client.update(
        { pk: 'USER#123', sk: 'PROFILE' },
        { name: 'Jane Doe', age: 30 }
      )

      expect(capturedParams.TableName).toBe('test-table')
      expect(capturedParams.Key).toEqual({ pk: 'USER#123', sk: 'PROFILE' })
      expect(capturedParams.UpdateExpression).toContain('SET')
      expect(capturedParams.UpdateExpression).toContain('#u0 = :u0')
      expect(capturedParams.UpdateExpression).toContain('#u1 = :u1')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#u0': 'name', '#u1': 'age' })
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':u0': 'Jane Doe', ':u1': 30 })
      expect(capturedParams.ReturnValues).toBe('ALL_NEW')
      expect(result).toEqual(updatedItem)

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional update', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const updatedItem = { pk: 'USER#123', name: 'Jane Doe', version: 2 }
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Attributes: updatedItem }
      }

      await client.update(
        { pk: 'USER#123' },
        { name: 'Jane Doe' },
        { condition: { version: 1 } }
      )

      expect(capturedParams.ConditionExpression).toBe('#c0 = :c0')
      expect(capturedParams.ExpressionAttributeNames['#c0']).toBe('version')
      expect(capturedParams.ExpressionAttributeValues[':c0']).toBe(1)

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support custom returnValues', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Attributes: {} }
      }

      await client.update(
        { pk: 'USER#123' },
        { name: 'Jane Doe' },
        { returnValues: 'UPDATED_NEW' }
      )

      expect(capturedParams.ReturnValues).toBe('UPDATED_NEW')

      // Restore
      client['docClient'].send = originalSend
    })

    it('should skip undefined values in updates', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Attributes: {} }
      }

      await client.update(
        { pk: 'USER#123' },
        { name: 'Jane Doe', age: undefined as any }
      )

      // Should only include name, not age
      expect(capturedParams.UpdateExpression).toBe('SET #u0 = :u0')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#u0': 'name' })
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':u0': 'Jane Doe' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should handle single field update', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Attributes: {} }
      }

      await client.update({ pk: 'USER#123' }, { status: 'ACTIVE' })

      expect(capturedParams.UpdateExpression).toBe('SET #u0 = :u0')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#u0': 'status' })
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':u0': 'ACTIVE' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should merge expression attributes when using conditions', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return { Attributes: {} }
      }

      await client.update(
        { pk: 'USER#123' },
        { name: 'Jane Doe' },
        { condition: { status: 'PENDING' } }
      )

      // Should have both update and condition attributes
      expect(capturedParams.ExpressionAttributeNames).toHaveProperty('#u0')
      expect(capturedParams.ExpressionAttributeNames).toHaveProperty('#c0')
      expect(capturedParams.ExpressionAttributeValues).toHaveProperty(':u0')
      expect(capturedParams.ExpressionAttributeValues).toHaveProperty(':c0')

      // Restore
      client['docClient'].send = originalSend
    })
  })

  describe('delete', () => {
    it('should delete an item', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      await client.delete({ pk: 'USER#123', sk: 'PROFILE' })

      expect(capturedParams.TableName).toBe('test-table')
      expect(capturedParams.Key).toEqual({ pk: 'USER#123', sk: 'PROFILE' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional delete', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      await client.delete(
        { pk: 'USER#123' },
        { condition: { status: 'INACTIVE' } }
      )

      expect(capturedParams.ConditionExpression).toBe('#c0 = :c0')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#c0': 'status' })
      expect(capturedParams.ExpressionAttributeValues).toEqual({ ':c0': 'INACTIVE' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support returnValues option', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      await client.delete(
        { pk: 'USER#123' },
        { returnValues: 'ALL_OLD' }
      )

      expect(capturedParams.ReturnValues).toBe('ALL_OLD')

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support delete with only partition key', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      await client.delete({ pk: 'USER#123' })

      expect(capturedParams.Key).toEqual({ pk: 'USER#123' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional delete with exists check', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      await client.delete(
        { pk: 'USER#123' },
        { condition: { pk: { exists: true } } }
      )

      expect(capturedParams.ConditionExpression).toBe('attribute_exists(#c0)')
      expect(capturedParams.ExpressionAttributeNames).toEqual({ '#c0': 'pk' })

      // Restore
      client['docClient'].send = originalSend
    })

    it('should support conditional delete with multiple conditions', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      let capturedParams: any
      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {}
      }

      await client.delete(
        { pk: 'USER#123' },
        { condition: { status: 'INACTIVE', version: 1 } }
      )

      expect(capturedParams.ConditionExpression).toContain('#c0 = :c0')
      expect(capturedParams.ConditionExpression).toContain('#c1 = :c1')
      expect(capturedParams.ConditionExpression).toContain('AND')

      // Restore
      client['docClient'].send = originalSend
    })
  })
})

describe('schema validation', () => {
  describe('put with schema', () => {
    it('should validate item before put operation', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({})

      const validItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        age: 30,
      }

      await expect(client.put(validItem)).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should throw ValidationError for invalid item type', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const invalidItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        age: 'thirty', // Should be number
      }

      await expect(client.put(invalidItem as any)).rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError with field details', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const invalidItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        age: 'thirty', // Should be number
      }

      try {
        await client.put(invalidItem as any)
        expect.fail('Should have thrown ValidationError')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.field).toBe('age')
        expect(validationError.value).toBe('thirty')
        expect(validationError.constraint).toBe('type')
      }
    })

    it('should throw ValidationError for missing required field', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const invalidItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        // Missing age
      }

      try {
        await client.put(invalidItem as any)
        expect.fail('Should have thrown ValidationError')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.field).toBe('age')
      }
    })

    it('should validate nested objects', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        metadata: schema.object({
          createdAt: schema.string(),
          updatedAt: schema.string(),
        }),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({})

      const validItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        metadata: {
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        },
      }

      await expect(client.put(validItem)).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should throw ValidationError for invalid nested field', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        metadata: schema.object({
          createdAt: schema.string(),
          updatedAt: schema.string(),
        }),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const invalidItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        metadata: {
          createdAt: '2025-01-01',
          updatedAt: 123, // Should be string
        },
      }

      try {
        await client.put(invalidItem as any)
        expect.fail('Should have thrown ValidationError')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.field).toBe('metadata.updatedAt')
      }
    })

    it('should work without schema', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({})

      const item = {
        pk: 'USER#123',
        sk: 'PROFILE',
        anyField: 'any value',
        anotherField: 123,
      }

      await expect(client.put(item)).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should validate optional fields correctly', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number().optional(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({})

      // Valid without optional field
      const itemWithoutAge = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
      }

      await expect(client.put(itemWithoutAge)).resolves.not.toThrow()

      // Valid with optional field
      const itemWithAge = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        age: 30,
      }

      await expect(client.put(itemWithAge)).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should validate arrays', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        tags: schema.array(schema.string()),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({})

      const validItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        tags: ['admin', 'user'],
      }

      await expect(client.put(validItem)).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should throw ValidationError for invalid array items', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        tags: schema.array(schema.string()),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const invalidItem = {
        pk: 'USER#123',
        sk: 'PROFILE',
        name: 'John Doe',
        tags: ['admin', 123], // Second item should be string
      }

      try {
        await client.put(invalidItem as any)
        expect.fail('Should have thrown ValidationError')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.field).toContain('tags')
        expect(validationError.field).toContain('[1]')
      }
    })
  })

  describe('update with schema', () => {
    it('should validate partial updates', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number(),
        email: schema.string(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Attributes: {} })

      // Should allow partial updates
      const updates = {
        name: 'Jane Doe',
      }

      await expect(
        client.update({ pk: 'USER#123', sk: 'PROFILE' }, updates)
      ).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should throw ValidationError for invalid update field type', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const invalidUpdates = {
        age: 'thirty', // Should be number
      }

      try {
        await client.update({ pk: 'USER#123' }, invalidUpdates as any)
        expect.fail('Should have thrown ValidationError')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.field).toBe('age')
        expect(validationError.value).toBe('thirty')
      }
    })

    it('should allow updating multiple fields', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        age: schema.number(),
        email: schema.string(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Attributes: {} })

      const updates = {
        name: 'Jane Doe',
        age: 25,
      }

      await expect(
        client.update({ pk: 'USER#123' }, updates)
      ).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should work without schema', async () => {
      const config: TableClientConfig = {
        tableName: 'test-table',
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Attributes: {} })

      const updates = {
        anyField: 'any value',
        anotherField: 123,
      }

      await expect(
        client.update({ pk: 'USER#123' }, updates)
      ).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should validate nested object updates', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        metadata: schema.object({
          createdAt: schema.string(),
          updatedAt: schema.string(),
        }),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Attributes: {} })

      const updates = {
        metadata: {
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        },
      }

      await expect(
        client.update({ pk: 'USER#123' }, updates)
      ).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })

    it('should throw ValidationError for invalid nested update', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
        metadata: schema.object({
          createdAt: schema.string(),
          updatedAt: schema.string(),
        }),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const invalidUpdates = {
        metadata: {
          createdAt: '2025-01-01',
          updatedAt: 123, // Should be string
        },
      }

      try {
        await client.update({ pk: 'USER#123' }, invalidUpdates as any)
        expect.fail('Should have thrown ValidationError')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.field).toBe('metadata.updatedAt')
      }
    })

    it('should allow empty updates object', async () => {
      const UserSchema = schema.object({
        pk: schema.string(),
        sk: schema.string(),
        name: schema.string(),
      })

      const config: TableClientConfig = {
        tableName: 'test-table',
        schema: UserSchema,
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
      }

      const client = new TableClient(config)

      const originalSend = client['docClient'].send.bind(client['docClient'])
      client['docClient'].send = async () => ({ Attributes: {} })

      const updates = {}

      await expect(
        client.update({ pk: 'USER#123' }, updates)
      ).resolves.not.toThrow()

      // Restore
      client['docClient'].send = originalSend
    })
  })
})
