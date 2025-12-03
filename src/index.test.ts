import { describe, expect, test } from '@rstest/core'
import {
  version,
  DynamoDBWrapperError,
  ValidationError,
  ConditionalCheckError,
  type Key,
  type KeyCondition,
  type FilterExpression,
  type QueryResult,
  type ScanResult,
  type GetOptions,
  type PutOptions,
  type UpdateOptions,
  type DeleteOptions,
  type TableClientConfig,
} from './index'

describe('DynamoDB Wrapper', () => {
  test('should export version', () => {
    expect(version).toBe('0.1.0')
  })

  describe('Type Definitions', () => {
    test('should create a valid Key', () => {
      const key: Key = { pk: 'USER#123' }
      expect(key.pk).toBe('USER#123')
      expect(key.sk).toBeUndefined()

      const keyWithSk: Key = { pk: 'USER#123', sk: 'PROFILE' }
      expect(keyWithSk.sk).toBe('PROFILE')
    })

    test('should create a valid KeyCondition', () => {
      const simpleCondition: KeyCondition = {
        pk: 'USER#123',
        sk: 'PROFILE',
      }
      expect(simpleCondition.pk).toBe('USER#123')

      const complexCondition: KeyCondition = {
        pk: 'USER#123',
        sk: { beginsWith: 'ORDER#' },
      }
      expect(complexCondition.sk).toHaveProperty('beginsWith')
    })

    test('should create a valid FilterExpression', () => {
      const filter: FilterExpression = {
        status: 'ACTIVE',
        age: { gt: 18 },
      }
      expect(filter.status).toBe('ACTIVE')
      expect(filter.age).toHaveProperty('gt')
    })

    test('should create a valid QueryResult', () => {
      const result: QueryResult<{ id: string }> = {
        items: [{ id: '1' }, { id: '2' }],
        count: 2,
        scannedCount: 2,
      }
      expect(result.items).toHaveLength(2)
      expect(result.count).toBe(2)
    })

    test('should create a valid ScanResult', () => {
      const result: ScanResult<{ id: string }> = {
        items: [{ id: '1' }],
        count: 1,
        scannedCount: 10,
      }
      expect(result.items).toHaveLength(1)
      expect(result.scannedCount).toBe(10)
    })

    test('should create valid operation options', () => {
      const getOpts: GetOptions = {
        consistentRead: true,
        projectionExpression: ['id', 'name'],
      }
      expect(getOpts.consistentRead).toBe(true)

      const putOpts: PutOptions = {
        condition: { version: { eq: 1 } },
        returnValues: 'ALL_OLD',
      }
      expect(putOpts.returnValues).toBe('ALL_OLD')

      const updateOpts: UpdateOptions = {
        condition: { status: { eq: 'PENDING' } },
        returnValues: 'ALL_NEW',
      }
      expect(updateOpts.returnValues).toBe('ALL_NEW')

      const deleteOpts: DeleteOptions = {
        condition: { exists: true },
        returnValues: 'ALL_OLD',
      }
      expect(deleteOpts.returnValues).toBe('ALL_OLD')
    })

    test('should create a valid TableClientConfig', () => {
      const config: TableClientConfig = {
        tableName: 'my-table',
        region: 'us-east-1',
      }
      expect(config.tableName).toBe('my-table')
      expect(config.region).toBe('us-east-1')

      const configWithStats: TableClientConfig = {
        tableName: 'my-table',
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
      expect(configWithStats.statsConfig?.enabled).toBe(true)
      expect(configWithStats.statsConfig?.sampleRate).toBe(0.5)
    })
  })

  describe('Error Classes', () => {
    test('should export DynamoDBWrapperError', () => {
      const error = new DynamoDBWrapperError(
        'Test error',
        'TEST_CODE',
        'testOperation',
        { key: 'value' }
      )

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(DynamoDBWrapperError)
      expect(error.name).toBe('DynamoDBWrapperError')
      expect(error.code).toBe('TEST_CODE')
      expect(error.operation).toBe('testOperation')
    })

    test('should export ValidationError', () => {
      const error = new ValidationError(
        'Invalid value',
        'email',
        'not-an-email',
        'must be valid email'
      )

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(DynamoDBWrapperError)
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.name).toBe('ValidationError')
      expect(error.message).toBe('Invalid value')
      expect(error.field).toBe('email')
      expect(error.value).toBe('not-an-email')
      expect(error.constraint).toBe('must be valid email')
    })

    test('should export ConditionalCheckError', () => {
      const error = new ConditionalCheckError(
        'Condition failed',
        'version = 2',
        { pk: 'USER#123', version: 1 }
      )

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(DynamoDBWrapperError)
      expect(error).toBeInstanceOf(ConditionalCheckError)
      expect(error.name).toBe('ConditionalCheckError')
      expect(error.condition).toBe('version = 2')
      expect(error.item).toEqual({ pk: 'USER#123', version: 1 })
    })
  })
})
