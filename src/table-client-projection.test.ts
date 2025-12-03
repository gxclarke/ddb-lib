/**
 * Tests for projection expression support in TableClient
 */

import { describe, test, expect, beforeEach } from '@rstest/core'
import { TableClient } from './table-client'
import type { TableClientConfig } from './types'

interface TestItem {
  pk: string
  sk?: string
  name?: string
  email?: string
  user?: {
    profile?: {
      email?: string
      name?: string
    }
    settings?: {
      theme?: string
    }
  }
  metadata?: {
    createdAt?: string
    updatedAt?: string
  }
}

describe('TableClient - Projection Expressions', () => {
  let client: TableClient<TestItem>
  let capturedParams: any

  beforeEach(() => {
    const config: TableClientConfig<TestItem> = {
      tableName: 'test-table',
      endpoint: 'http://localhost:8000',
      region: 'us-east-1',
    }

    client = new TableClient(config)

    // Mock the docClient.send method to capture params
    const mockItem = { pk: 'USER#123', name: 'John Doe' }
    client['docClient'].send = async (command: any) => {
      capturedParams = command.input
      return { Item: mockItem, Items: [mockItem] }
    }
  })

  describe('get operation', () => {
    test('should handle simple projection expression', async () => {
      await client.get({ pk: 'USER#123' }, { projectionExpression: ['name', 'email'] })

      expect(capturedParams.ProjectionExpression).toBe('#p0, #p1')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#p0': 'name',
        '#p1': 'email',
      })
    })

    test('should handle nested attribute projection', async () => {
      await client.get({ pk: 'USER#123' }, { projectionExpression: ['user.profile.email'] })

      expect(capturedParams.ProjectionExpression).toBe('#p0.#p1.#p2')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#p0': 'user',
        '#p1': 'profile',
        '#p2': 'email',
      })
    })

    test('should handle mix of simple and nested attributes', async () => {
      await client.get(
        { pk: 'USER#123' },
        { projectionExpression: ['name', 'user.profile.email', 'metadata.createdAt'] }
      )

      expect(capturedParams.ProjectionExpression).toBe('#p0, #p1.#p2.#p3, #p4.#p5')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#p0': 'name',
        '#p1': 'user',
        '#p2': 'profile',
        '#p3': 'email',
        '#p4': 'metadata',
        '#p5': 'createdAt',
      })
    })

    test('should handle reserved words in projection', async () => {
      await client.get({ pk: 'USER#123' }, { projectionExpression: ['name', 'status', 'data'] })

      expect(capturedParams.ProjectionExpression).toBe('#p0, #p1, #p2')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#p0': 'name',
        '#p1': 'status',
        '#p2': 'data',
      })
    })
  })

  describe('query operation', () => {
    test('should handle projection in query', async () => {
      await client.query({
        keyCondition: { pk: 'USER#123' },
        projectionExpression: ['name', 'email'],
      })

      expect(capturedParams.ProjectionExpression).toBe('#p0, #p1')
      expect(capturedParams.ExpressionAttributeNames).toHaveProperty('#p0', 'name')
      expect(capturedParams.ExpressionAttributeNames).toHaveProperty('#p1', 'email')
    })

    test('should handle nested projection in query', async () => {
      await client.query({
        keyCondition: { pk: 'USER#123' },
        projectionExpression: ['user.profile.email', 'user.settings.theme'],
      })

      expect(capturedParams.ProjectionExpression).toBe('#p0.#p1.#p2, #p3.#p4.#p5')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#k0': 'pk',
        '#p0': 'user',
        '#p1': 'profile',
        '#p2': 'email',
        '#p3': 'user',
        '#p4': 'settings',
        '#p5': 'theme',
      })
    })
  })

  describe('scan operation', () => {
    test('should handle projection in scan', async () => {
      await client.scan({
        projectionExpression: ['pk', 'name'],
      })

      expect(capturedParams.ProjectionExpression).toBe('#p0, #p1')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#p0': 'pk',
        '#p1': 'name',
      })
    })

    test('should handle nested projection in scan', async () => {
      await client.scan({
        projectionExpression: ['metadata.createdAt', 'metadata.updatedAt'],
      })

      expect(capturedParams.ProjectionExpression).toBe('#p0.#p1, #p2.#p3')
      expect(capturedParams.ExpressionAttributeNames).toEqual({
        '#p0': 'metadata',
        '#p1': 'createdAt',
        '#p2': 'metadata',
        '#p3': 'updatedAt',
      })
    })
  })

  describe('batchGet operation', () => {
    test('should handle projection in batchGet', async () => {
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {
          Responses: {
            'test-table': [{ pk: 'USER#123', name: 'John' }],
          },
        }
      }

      await client.batchGet([{ pk: 'USER#123' }], { projectionExpression: ['name', 'email'] })

      expect(capturedParams.RequestItems['test-table'].ProjectionExpression).toBe('#p0, #p1')
      expect(capturedParams.RequestItems['test-table'].ExpressionAttributeNames).toEqual({
        '#p0': 'name',
        '#p1': 'email',
      })
    })

    test('should handle nested projection in batchGet', async () => {
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {
          Responses: {
            'test-table': [{ pk: 'USER#123' }],
          },
        }
      }

      await client.batchGet([{ pk: 'USER#123' }], { projectionExpression: ['user.profile.name'] })

      expect(capturedParams.RequestItems['test-table'].ProjectionExpression).toBe('#p0.#p1.#p2')
      expect(capturedParams.RequestItems['test-table'].ExpressionAttributeNames).toEqual({
        '#p0': 'user',
        '#p1': 'profile',
        '#p2': 'name',
      })
    })
  })

  describe('transactGet operation', () => {
    test('should handle projection in transactGet', async () => {
      client['docClient'].send = async (command: any) => {
        capturedParams = command.input
        return {
          Responses: [{ Item: { pk: 'USER#123', name: 'John' } }],
        }
      }

      await client.transactGet([{ pk: 'USER#123' }], { projectionExpression: ['name'] })

      expect(capturedParams.TransactItems[0].Get.ProjectionExpression).toBe('#p0')
      expect(capturedParams.TransactItems[0].Get.ExpressionAttributeNames).toEqual({
        '#p0': 'name',
      })
    })
  })
})
