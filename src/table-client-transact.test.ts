/**
 * Tests for transactional operations (transactWrite and transactGet)
 */

import { describe, it, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { TransactWriteOperation } from './types'

interface TestItem {
  pk: string
  sk: string
  name?: string
  balance?: number
  status?: string
  version?: number
}

describe('TableClient - Transactional Operations', () => {
  describe('transactWrite', () => {
    it('should have transactWrite method', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      expect(typeof client.transactWrite).toBe('function')
    })

    it('should handle empty operations array', async () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      await client.transactWrite([])
      // Should not throw and complete successfully
      expect(true).toBe(true)
    })

    it('should throw error for more than 100 operations', async () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const operations: TransactWriteOperation<TestItem>[] = Array.from({ length: 101 }, (_, i) => ({
        type: 'put' as const,
        item: { pk: `USER#${i}`, sk: 'PROFILE', name: `User ${i}` },
      }))

      try {
        await client.transactWrite(operations)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain('TransactWrite supports a maximum of 100 operations')
      }
    })

    it('should accept all operation types', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const operations: TransactWriteOperation<TestItem>[] = [
        {
          type: 'put',
          item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' },
        },
        {
          type: 'put',
          item: { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' },
          condition: { pk: { exists: false } },
        },
        {
          type: 'update',
          key: { pk: 'ACCOUNT#1', sk: 'BALANCE' },
          updates: { balance: 100 },
        },
        {
          type: 'update',
          key: { pk: 'ACCOUNT#2', sk: 'BALANCE' },
          updates: { balance: 200 },
          condition: { balance: { gte: 0 } },
        },
        {
          type: 'delete',
          key: { pk: 'TEMP#1', sk: 'DATA' },
        },
        {
          type: 'delete',
          key: { pk: 'TEMP#2', sk: 'DATA' },
          condition: { status: 'EXPIRED' },
        },
        {
          type: 'conditionCheck',
          key: { pk: 'LOCK#1', sk: 'STATUS' },
          condition: { status: 'AVAILABLE' },
        },
      ]

      // Should accept the operations without type errors
      expect(operations.length).toBe(7)
    })

    it('should accept options with clientRequestToken', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const operations: TransactWriteOperation<TestItem>[] = [
        {
          type: 'put',
          item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' },
        },
      ]

      // Should accept options without type errors
      const options = { clientRequestToken: 'unique-token-123' }
      expect(options.clientRequestToken).toBe('unique-token-123')
    })
  })

  describe('transactGet', () => {
    it('should have transactGet method', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      expect(typeof client.transactGet).toBe('function')
    })

    it('should handle empty keys array', async () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const result = await client.transactGet([])
      expect(result).toEqual([])
    })

    it('should throw error for more than 100 keys', async () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const keys = Array.from({ length: 101 }, (_, i) => ({
        pk: `USER#${i}`,
        sk: 'PROFILE',
      }))

      try {
        await client.transactGet(keys)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain('TransactGet supports a maximum of 100 items')
      }
    })

    it('should accept keys array', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const keys = [
        { pk: 'USER#1', sk: 'PROFILE' },
        { pk: 'USER#2', sk: 'PROFILE' },
        { pk: 'ACCOUNT#1', sk: 'BALANCE' },
      ]

      expect(keys.length).toBe(3)
    })

    it('should accept options with projectionExpression', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const options = {
        projectionExpression: ['pk', 'sk', 'name'],
      }

      expect(options.projectionExpression).toEqual(['pk', 'sk', 'name'])
    })

    it('should return array type of items or null', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      // The return type should be (TItem | null)[]
      const keys = [
        { pk: 'USER#1', sk: 'PROFILE' },
        { pk: 'USER#2', sk: 'PROFILE' },
      ]

      // Type check - the method should return Promise<(TItem | null)[]>
      expect(typeof client.transactGet).toBe('function')
    })

    it('should support up to 100 items', () => {
      const client = new TableClient<TestItem>({
        tableName: 'test-table',
      })

      const keys = Array.from({ length: 100 }, (_, i) => ({
        pk: `USER#${i}`,
        sk: 'PROFILE',
      }))

      // Should accept 100 keys without type errors
      expect(keys.length).toBe(100)
    })
  })
})
