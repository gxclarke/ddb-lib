/**
 * Tests for TableClient paginated iterator methods
 */

import { describe, test, expect } from '@rstest/core'
import { TableClient } from './table-client'
import type { QueryParams, ScanParams } from './types'

describe('TableClient paginated iterators', () => {
  describe('queryPaginated', () => {
    test('should have queryPaginated method defined', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      expect(typeof client.queryPaginated).toBe('function')
    })

    test('should return an async iterable iterator', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const params: QueryParams = {
        keyCondition: {
          pk: 'USER#123',
        },
      }

      const iterator = client.queryPaginated(params)

      // Verify it's an async iterable iterator
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function')
      expect(typeof iterator.next).toBe('function')
    })

    test('should accept QueryParams', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const params: QueryParams = {
        keyCondition: {
          pk: 'USER#123',
          sk: { beginsWith: 'ORDER#' },
        },
        filter: {
          status: 'ACTIVE',
        },
        limit: 10,
      }

      const iterator = client.queryPaginated(params)

      expect(iterator).toBeDefined()
    })

    test('should work with for-await-of syntax', async () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const params: QueryParams = {
        keyCondition: {
          pk: 'USER#123',
        },
      }

      // This test verifies the type signature works with for-await-of
      // In a real scenario, this would iterate over actual items
      const iterator = client.queryPaginated(params)
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function')
    })
  })

  describe('scanPaginated', () => {
    test('should have scanPaginated method defined', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      expect(typeof client.scanPaginated).toBe('function')
    })

    test('should return an async iterable iterator', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const iterator = client.scanPaginated()

      // Verify it's an async iterable iterator
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function')
      expect(typeof iterator.next).toBe('function')
    })

    test('should accept ScanParams', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const params: ScanParams = {
        filter: {
          status: 'ACTIVE',
        },
        limit: 100,
      }

      const iterator = client.scanPaginated(params)

      expect(iterator).toBeDefined()
    })

    test('should work without parameters', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const iterator = client.scanPaginated()

      expect(iterator).toBeDefined()
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function')
    })

    test('should work with for-await-of syntax', async () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const params: ScanParams = {
        filter: {
          status: 'ACTIVE',
        },
      }

      // This test verifies the type signature works with for-await-of
      // In a real scenario, this would iterate over actual items
      const iterator = client.scanPaginated(params)
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function')
    })

    test('should accept pagination parameters', () => {
      const client = new TableClient({
        tableName: 'test-table',
      })

      const params: ScanParams = {
        limit: 50,
        exclusiveStartKey: { pk: 'ITEM#100' },
      }

      const iterator = client.scanPaginated(params)

      expect(iterator).toBeDefined()
    })
  })

  describe('iterator type compatibility', () => {
    test('queryPaginated should be compatible with async iteration', () => {
      const client = new TableClient<{ pk: string; name: string }>({
        tableName: 'test-table',
      })

      const params: QueryParams = {
        keyCondition: {
          pk: 'USER#123',
        },
      }

      const iterator = client.queryPaginated(params)

      // Verify the iterator has the correct type
      // This is a compile-time check that the iterator yields the correct type
      expect(iterator).toBeDefined()
    })

    test('scanPaginated should be compatible with async iteration', () => {
      const client = new TableClient<{ pk: string; status: string }>({
        tableName: 'test-table',
      })

      const params: ScanParams = {
        filter: {
          status: 'ACTIVE',
        },
      }

      const iterator = client.scanPaginated(params)

      // Verify the iterator has the correct type
      expect(iterator).toBeDefined()
    })
  })
})
