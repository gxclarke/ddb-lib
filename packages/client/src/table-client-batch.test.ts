/**
 * Tests for batch operations (batchGet, batchWrite)
 */

import { describe, it, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { Key, BatchWriteOperation } from './types'

describe('TableClient - Batch Operations', () => {
  describe('batchGet', () => {
    it('should have batchGet method', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      expect(typeof client.batchGet).toBe('function')
    })

    it('should handle empty keys array', async () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const result = await client.batchGet([])

      expect(result).toEqual([])
    })

    it('should accept keys array and options', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const keys: Key[] = [
        { pk: 'USER#1', sk: 'PROFILE' },
        { pk: 'USER#2', sk: 'PROFILE' },
      ]

      // Verify the method signature accepts the correct parameters
      const promise = client.batchGet(keys, {
        consistentRead: true,
        projectionExpression: ['pk', 'name'],
        chunkSize: 50,
      })

      expect(promise).toBeInstanceOf(Promise)
    })

    it('should accept keys without options', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const keys: Key[] = [{ pk: 'USER#1', sk: 'PROFILE' }]

      const promise = client.batchGet(keys)

      expect(promise).toBeInstanceOf(Promise)
    })
  })

  describe('batchWrite', () => {
    it('should have batchWrite method', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      expect(typeof client.batchWrite).toBe('function')
    })

    it('should handle empty operations array', async () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      await client.batchWrite([])

      // Should complete without error
      expect(true).toBe(true)
    })

    it('should accept put operations', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const operations: BatchWriteOperation<any>[] = [
        { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
        { type: 'put', item: { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' } },
      ]

      const promise = client.batchWrite(operations)

      expect(promise).toBeInstanceOf(Promise)
    })

    it('should accept delete operations', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const operations: BatchWriteOperation<any>[] = [
        { type: 'delete', key: { pk: 'USER#1', sk: 'PROFILE' } },
        { type: 'delete', key: { pk: 'USER#2', sk: 'PROFILE' } },
      ]

      const promise = client.batchWrite(operations)

      expect(promise).toBeInstanceOf(Promise)
    })

    it('should accept mixed put and delete operations', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const operations: BatchWriteOperation<any>[] = [
        { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
        { type: 'delete', key: { pk: 'USER#2', sk: 'PROFILE' } },
        { type: 'put', item: { pk: 'USER#3', sk: 'PROFILE', name: 'Charlie' } },
      ]

      const promise = client.batchWrite(operations)

      expect(promise).toBeInstanceOf(Promise)
    })

    it('should accept custom chunk size option', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const operations: BatchWriteOperation<any>[] = [
        { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
      ]

      const promise = client.batchWrite(operations, { chunkSize: 10 })

      expect(promise).toBeInstanceOf(Promise)
    })
  })
})
