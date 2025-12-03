/**
 * Tests for DynamoDB Local test utilities
 */

import { describe, it, expect, beforeAll, afterAll } from '@rstest/core'
import {
  createLocalClient,
  createLocalDocumentClient,
  createTestTable,
  deleteTestTable,
  seedTestData,
  clearTestTable,
  setupTestTable,
  setupTestTableWithData,
  type TestTableConfig,
} from './dynamodb-local'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

describe('DynamoDB Local Test Utilities', () => {
  describe('createLocalClient', () => {
    it('should create a DynamoDB client with default config', () => {
      const client = createLocalClient()

      expect(client).toBeInstanceOf(DynamoDBClient)
      client.destroy()
    })

    it('should create a client with custom endpoint', () => {
      const client = createLocalClient({
        endpoint: 'http://localhost:9000',
      })

      expect(client).toBeInstanceOf(DynamoDBClient)
      client.destroy()
    })

    it('should create a client with custom region', async () => {
      const client = createLocalClient({
        region: 'us-west-2',
      })

      expect(client).toBeInstanceOf(DynamoDBClient)
      const region = await client.config.region()
      expect(region).toBe('us-west-2')
      client.destroy()
    })
  })

  describe('createLocalDocumentClient', () => {
    it('should create a DynamoDB Document client', () => {
      const docClient = createLocalDocumentClient()

      expect(docClient).toBeInstanceOf(DynamoDBDocumentClient)
      docClient.destroy()
    })
  })

  describe('Table operations', () => {
    let client: DynamoDBClient
    const tableName = 'test-table-operations'

    beforeAll(() => {
      client = createLocalClient()
    })

    afterAll(() => {
      client.destroy()
    })

    it('should create a simple table', async () => {
      const config: TestTableConfig = {
        tableName,
        partitionKey: { name: 'pk', type: 'S' },
      }

      await createTestTable(client, config)

      // Verify table exists by attempting to delete it
      await deleteTestTable(client, tableName)
    })

    it('should create a table with sort key', async () => {
      const config: TestTableConfig = {
        tableName,
        partitionKey: { name: 'pk', type: 'S' },
        sortKey: { name: 'sk', type: 'S' },
      }

      await createTestTable(client, config)
      await deleteTestTable(client, tableName)
    })

    it('should create a table with GSI', async () => {
      const config: TestTableConfig = {
        tableName,
        partitionKey: { name: 'pk', type: 'S' },
        sortKey: { name: 'sk', type: 'S' },
        globalSecondaryIndexes: [
          {
            indexName: 'GSI1',
            partitionKey: { name: 'gsi1pk', type: 'S' },
            sortKey: { name: 'gsi1sk', type: 'S' },
          },
        ],
      }

      await createTestTable(client, config)
      await deleteTestTable(client, tableName)
    })

    it('should create a table with LSI', async () => {
      const config: TestTableConfig = {
        tableName,
        partitionKey: { name: 'pk', type: 'S' },
        sortKey: { name: 'sk', type: 'S' },
        localSecondaryIndexes: [
          {
            indexName: 'LSI1',
            sortKey: { name: 'lsi1sk', type: 'S' },
          },
        ],
      }

      await createTestTable(client, config)
      await deleteTestTable(client, tableName)
    })

    it('should create a table with multiple GSIs', async () => {
      const config: TestTableConfig = {
        tableName,
        partitionKey: { name: 'pk', type: 'S' },
        sortKey: { name: 'sk', type: 'S' },
        globalSecondaryIndexes: [
          {
            indexName: 'GSI1',
            partitionKey: { name: 'gsi1pk', type: 'S' },
            sortKey: { name: 'gsi1sk', type: 'N' },
          },
          {
            indexName: 'GSI2',
            partitionKey: { name: 'gsi2pk', type: 'S' },
          },
        ],
      }

      await createTestTable(client, config)
      await deleteTestTable(client, tableName)
    })
  })

  describe('Data seeding', () => {
    let client: DynamoDBClient
    const tableName = 'test-table-seeding'

    beforeAll(async () => {
      client = createLocalClient()

      const config: TestTableConfig = {
        tableName,
        partitionKey: { name: 'pk', type: 'S' },
        sortKey: { name: 'sk', type: 'S' },
      }

      await createTestTable(client, config)
    })

    afterAll(async () => {
      await deleteTestTable(client, tableName)
      client.destroy()
    })

    it('should seed data into table', async () => {
      const items = [
        { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' },
        { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' },
        { pk: 'USER#3', sk: 'PROFILE', name: 'Charlie' },
      ]

      await seedTestData(client, tableName, items)

      // Verify data was inserted
      const docClient = DynamoDBDocumentClient.from(client)
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: 'USER#1', sk: 'PROFILE' },
        }),
      )

      expect(result.Item).toEqual(items[0])
    })

    it('should seed large batch of data', async () => {
      // Create 100 items to test chunking
      const items = Array.from({ length: 100 }, (_, i) => ({
        pk: `ITEM#${i}`,
        sk: 'DATA',
        value: i,
      }))

      await seedTestData(client, tableName, items)

      // Verify a few items
      const docClient = DynamoDBDocumentClient.from(client)
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: 'ITEM#50', sk: 'DATA' },
        }),
      )

      expect(result.Item?.value).toBe(50)
    })

    it('should clear table data', async () => {
      // Seed some data
      const items = [
        { pk: 'CLEAR#1', sk: 'TEST', data: 'test1' },
        { pk: 'CLEAR#2', sk: 'TEST', data: 'test2' },
      ]

      await seedTestData(client, tableName, items)

      // Clear the table
      await clearTestTable(client, tableName, 'pk', 'sk')

      // Verify data was cleared
      const docClient = DynamoDBDocumentClient.from(client)
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: 'CLEAR#1', sk: 'TEST' },
        }),
      )

      expect(result.Item).toBeUndefined()
    })
  })

  describe('Setup helpers', () => {
    it('should setup and cleanup table', async () => {
      const config: TestTableConfig = {
        tableName: 'test-setup-helper',
        partitionKey: { name: 'id', type: 'S' },
      }

      const { client, cleanup } = await setupTestTable(config)

      expect(client).toBeInstanceOf(DynamoDBClient)

      // Verify table exists by inserting data
      const docClient = DynamoDBDocumentClient.from(client)
      await docClient.send(
        new GetCommand({
          TableName: config.tableName,
          Key: { id: 'test' },
        }),
      )

      // Cleanup
      await cleanup()
    })

    it('should setup table with data', async () => {
      const config: TestTableConfig = {
        tableName: 'test-setup-with-data',
        partitionKey: { name: 'id', type: 'S' },
      }

      const data = [
        { id: 'item1', value: 'test1' },
        { id: 'item2', value: 'test2' },
      ]

      const { client, cleanup } = await setupTestTableWithData(config, data)

      // Verify data exists
      const docClient = DynamoDBDocumentClient.from(client)
      const result = await docClient.send(
        new GetCommand({
          TableName: config.tableName,
          Key: { id: 'item1' },
        }),
      )

      expect(result.Item).toEqual(data[0])

      // Cleanup
      await cleanup()
    })
  })
})
