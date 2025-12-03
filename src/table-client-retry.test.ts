/**
 * Integration tests for retry logic in TableClient
 */

import { describe, test, expect, beforeEach } from '@rstest/core'
import { TableClient } from './table-client'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

describe('TableClient retry integration', () => {
  describe('retryable errors', () => {
    test('should retry on ProvisionedThroughputExceededException', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount === 1) {
          const error: any = new Error('Throttled')
          error.name = 'ProvisionedThroughputExceededException'
          throw error
        }
        return { Item: { pk: 'TEST', sk: 'DATA', value: 'success' } }
      }

      // Create a mock client
      const mockClient = {
        send: mockSend,
      } as any

      const mockDocClient = {
        send: mockSend,
      } as any

      // Mock DynamoDBDocumentClient.from to return our mock
      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        client: mockClient,
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      const result = await client.get({ pk: 'TEST', sk: 'DATA' })

      expect(result).toEqual({ pk: 'TEST', sk: 'DATA', value: 'success' })
      expect(callCount).toBe(2)

      // Restore
      DynamoDBDocumentClient.from = originalFrom
    })

    test('should retry on ThrottlingException', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount === 1) {
          const error: any = new Error('Throttled')
          error.name = 'ThrottlingException'
          throw error
        }
        return {}
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      await client.put({ pk: 'TEST', sk: 'DATA', value: 'test' })

      expect(callCount).toBe(2)

      DynamoDBDocumentClient.from = originalFrom
    })

    test('should retry on 5xx HTTP status codes', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount === 1) {
          const error: any = new Error('Internal Server Error')
          error.name = 'InternalServerError'
          error.$metadata = { httpStatusCode: 500 }
          throw error
        }
        return { Attributes: { pk: 'TEST', sk: 'DATA', value: 'updated' } }
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      const result = await client.update({ pk: 'TEST', sk: 'DATA' }, { value: 'updated' })

      expect(result).toEqual({ pk: 'TEST', sk: 'DATA', value: 'updated' })
      expect(callCount).toBe(2)

      DynamoDBDocumentClient.from = originalFrom
    })

    test('should retry on 429 HTTP status code', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount === 1) {
          const error: any = new Error('Too Many Requests')
          error.name = 'TooManyRequestsException'
          error.$metadata = { httpStatusCode: 429 }
          throw error
        }
        return {}
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      await client.delete({ pk: 'TEST', sk: 'DATA' })

      expect(callCount).toBe(2)

      DynamoDBDocumentClient.from = originalFrom
    })
  })

  describe('non-retryable errors', () => {
    test('should not retry ValidationException', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        const error: any = new Error('Validation failed')
        error.name = 'ValidationException'
        throw error
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      try {
        await client.get({ pk: 'TEST', sk: 'DATA' })
        throw new Error('Should have thrown')
      } catch (error: any) {
        expect(error.name).toBe('ValidationException')
        expect(callCount).toBe(1)
      }

      DynamoDBDocumentClient.from = originalFrom
    })

    test('should not retry ConditionalCheckFailedException', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        const error: any = new Error('Condition check failed')
        error.name = 'ConditionalCheckFailedException'
        throw error
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      try {
        await client.put({ pk: 'TEST', sk: 'DATA', value: 'test' }, {
          condition: { version: { eq: 1 } },
        })
        throw new Error('Should have thrown')
      } catch (error: any) {
        // Should be wrapped in ConditionalCheckError
        expect(error.name).toBe('ConditionalCheckError')
        expect(callCount).toBe(1)
      }

      DynamoDBDocumentClient.from = originalFrom
    })

    test('should not retry 4xx HTTP status codes (except 429)', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        const error: any = new Error('Bad Request')
        error.name = 'BadRequestException'
        error.$metadata = { httpStatusCode: 400 }
        throw error
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      try {
        await client.get({ pk: 'TEST', sk: 'DATA' })
        throw new Error('Should have thrown')
      } catch (error: any) {
        expect(error.name).toBe('BadRequestException')
        expect(callCount).toBe(1)
      }

      DynamoDBDocumentClient.from = originalFrom
    })
  })

  describe('retry exhaustion', () => {
    test('should throw error after max retries exhausted', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        const error: any = new Error('Throttled')
        error.name = 'ThrottlingException'
        throw error
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 2 },
      })

      try {
        await client.get({ pk: 'TEST', sk: 'DATA' })
        throw new Error('Should have thrown')
      } catch (error: any) {
        expect(error.name).toBe('ThrottlingException')
        expect(callCount).toBe(3) // Initial + 2 retries
      }

      DynamoDBDocumentClient.from = originalFrom
    })
  })

  describe('custom retry configuration', () => {
    test('should use custom retry config', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount <= 5) {
          const error: any = new Error('Throttled')
          error.name = 'ThrottlingException'
          throw error
        }
        return { Item: { pk: 'TEST', sk: 'DATA', value: 'success' } }
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: {
          baseDelayMs: 5,
          maxDelayMs: 20,
          maxRetries: 5,
        },
      })

      const result = await client.get({ pk: 'TEST', sk: 'DATA' })

      expect(result).toEqual({ pk: 'TEST', sk: 'DATA', value: 'success' })
      expect(callCount).toBe(6) // Initial + 5 retries

      DynamoDBDocumentClient.from = originalFrom
    })
  })

  describe('operations coverage', () => {
    test('should retry query operations', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount === 1) {
          const error: any = new Error('Throttled')
          error.name = 'ThrottlingException'
          throw error
        }
        return {
          Items: [{ pk: 'TEST', sk: 'DATA', value: 'success' }],
          Count: 1,
          ScannedCount: 1,
        }
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      const result = await client.query({ keyCondition: { pk: 'TEST' } })

      expect(result.items).toHaveLength(1)
      expect(callCount).toBe(2)

      DynamoDBDocumentClient.from = originalFrom
    })

    test('should retry scan operations', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount === 1) {
          const error: any = new Error('Throttled')
          error.name = 'ThrottlingException'
          throw error
        }
        return {
          Items: [{ pk: 'TEST', sk: 'DATA', value: 'success' }],
          Count: 1,
          ScannedCount: 1,
        }
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      const result = await client.scan()

      expect(result.items).toHaveLength(1)
      expect(callCount).toBe(2)

      DynamoDBDocumentClient.from = originalFrom
    })

    test('should retry batch operations', async () => {
      let callCount = 0
      const mockSend = async () => {
        callCount++
        if (callCount === 1) {
          const error: any = new Error('Throttled')
          error.name = 'ThrottlingException'
          throw error
        }
        return {
          Responses: {
            'test-table': [{ pk: 'TEST', sk: 'DATA', value: 'success' }],
          },
        }
      }

      const mockDocClient = {
        send: mockSend,
      } as any

      const originalFrom = DynamoDBDocumentClient.from
      DynamoDBDocumentClient.from = (() => mockDocClient) as any

      const client = new TableClient({
        tableName: 'test-table',
        retryConfig: { baseDelayMs: 10, maxDelayMs: 10, maxRetries: 3 },
      })

      const result = await client.batchGet([{ pk: 'TEST', sk: 'DATA' }])

      expect(result).toHaveLength(1)
      expect(callCount).toBe(2)

      DynamoDBDocumentClient.from = originalFrom
    })
  })
})
