/**
 * Test utilities for DynamoDB Local integration testing
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  type CreateTableCommandInput,
  type AttributeDefinition,
  type KeySchemaElement,
  type GlobalSecondaryIndex,
  type LocalSecondaryIndex,
} from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'

/**
 * Configuration for DynamoDB Local test environment
 */
export interface DynamoDBLocalConfig {
  endpoint?: string
  region?: string
}

/**
 * Table configuration for test setup
 */
export interface TestTableConfig {
  tableName: string
  partitionKey: { name: string; type: 'S' | 'N' | 'B' }
  sortKey?: { name: string; type: 'S' | 'N' | 'B' }
  globalSecondaryIndexes?: Array<{
    indexName: string
    partitionKey: { name: string; type: 'S' | 'N' | 'B' }
    sortKey?: { name: string; type: 'S' | 'N' | 'B' }
    projectionType?: 'ALL' | 'KEYS_ONLY' | 'INCLUDE'
    nonKeyAttributes?: string[]
  }>
  localSecondaryIndexes?: Array<{
    indexName: string
    sortKey: { name: string; type: 'S' | 'N' | 'B' }
    projectionType?: 'ALL' | 'KEYS_ONLY' | 'INCLUDE'
    nonKeyAttributes?: string[]
  }>
}

/**
 * Default configuration for DynamoDB Local
 */
const DEFAULT_CONFIG: Required<DynamoDBLocalConfig> = {
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
}

/**
 * Create a DynamoDB client configured for local testing
 */
export function createLocalClient(
  config: DynamoDBLocalConfig = {},
): DynamoDBClient {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  return new DynamoDBClient({
    endpoint: finalConfig.endpoint,
    region: finalConfig.region,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  })
}

/**
 * Create a DynamoDB Document client configured for local testing
 */
export function createLocalDocumentClient(
  config: DynamoDBLocalConfig = {},
): DynamoDBDocumentClient {
  const client = createLocalClient(config)
  return DynamoDBDocumentClient.from(client)
}

/**
 * Create a test table in DynamoDB Local
 */
export async function createTestTable(
  client: DynamoDBClient,
  config: TestTableConfig,
): Promise<void> {
  const attributeDefinitions: AttributeDefinition[] = [
    {
      AttributeName: config.partitionKey.name,
      AttributeType: config.partitionKey.type,
    },
  ]

  const keySchema: KeySchemaElement[] = [
    {
      AttributeName: config.partitionKey.name,
      KeyType: 'HASH',
    },
  ]

  // Add sort key if provided
  if (config.sortKey) {
    attributeDefinitions.push({
      AttributeName: config.sortKey.name,
      AttributeType: config.sortKey.type,
    })
    keySchema.push({
      AttributeName: config.sortKey.name,
      KeyType: 'RANGE',
    })
  }

  // Add GSI attributes
  const gsiAttributes = new Set<string>()
  const globalSecondaryIndexes: GlobalSecondaryIndex[] = []

  if (config.globalSecondaryIndexes) {
    for (const gsi of config.globalSecondaryIndexes) {
      // Add partition key attribute if not already defined
      if (!gsiAttributes.has(gsi.partitionKey.name)) {
        attributeDefinitions.push({
          AttributeName: gsi.partitionKey.name,
          AttributeType: gsi.partitionKey.type,
        })
        gsiAttributes.add(gsi.partitionKey.name)
      }

      const gsiKeySchema: KeySchemaElement[] = [
        {
          AttributeName: gsi.partitionKey.name,
          KeyType: 'HASH',
        },
      ]

      // Add sort key if provided
      if (gsi.sortKey) {
        if (!gsiAttributes.has(gsi.sortKey.name)) {
          attributeDefinitions.push({
            AttributeName: gsi.sortKey.name,
            AttributeType: gsi.sortKey.type,
          })
          gsiAttributes.add(gsi.sortKey.name)
        }
        gsiKeySchema.push({
          AttributeName: gsi.sortKey.name,
          KeyType: 'RANGE',
        })
      }

      globalSecondaryIndexes.push({
        IndexName: gsi.indexName,
        KeySchema: gsiKeySchema,
        Projection: {
          ProjectionType: gsi.projectionType || 'ALL',
          NonKeyAttributes: gsi.nonKeyAttributes,
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    }
  }

  // Add LSI attributes
  const localSecondaryIndexes: LocalSecondaryIndex[] = []

  if (config.localSecondaryIndexes) {
    for (const lsi of config.localSecondaryIndexes) {
      // Add sort key attribute if not already defined
      const lsiSortKeyName = lsi.sortKey.name
      const existingAttr = attributeDefinitions.find(
        (attr) => attr.AttributeName === lsiSortKeyName,
      )

      if (!existingAttr) {
        attributeDefinitions.push({
          AttributeName: lsiSortKeyName,
          AttributeType: lsi.sortKey.type,
        })
      }

      localSecondaryIndexes.push({
        IndexName: lsi.indexName,
        KeySchema: [
          {
            AttributeName: config.partitionKey.name,
            KeyType: 'HASH',
          },
          {
            AttributeName: lsiSortKeyName,
            KeyType: 'RANGE',
          },
        ],
        Projection: {
          ProjectionType: lsi.projectionType || 'ALL',
          NonKeyAttributes: lsi.nonKeyAttributes,
        },
      })
    }
  }

  const params: CreateTableCommandInput = {
    TableName: config.tableName,
    AttributeDefinitions: attributeDefinitions,
    KeySchema: keySchema,
    BillingMode: 'PAY_PER_REQUEST',
  }

  if (globalSecondaryIndexes.length > 0) {
    params.GlobalSecondaryIndexes = globalSecondaryIndexes
  }

  if (localSecondaryIndexes.length > 0) {
    params.LocalSecondaryIndexes = localSecondaryIndexes
  }

  await client.send(new CreateTableCommand(params))

  // Wait for table to be active
  await waitForTableActive(client, config.tableName)
}

/**
 * Wait for a table to become active
 */
async function waitForTableActive(
  client: DynamoDBClient,
  tableName: string,
  maxAttempts = 30,
  delayMs = 1000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await client.send(
        new DescribeTableCommand({ TableName: tableName }),
      )

      if (result.Table?.TableStatus === 'ACTIVE') {
        // Also check GSI status
        const gsis = result.Table.GlobalSecondaryIndexes || []
        const allGSIsActive = gsis.every((gsi) => gsi.IndexStatus === 'ACTIVE')

        if (allGSIsActive) {
          return
        }
      }
    } catch (error) {
      // Table might not exist yet, continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw new Error(
    `Table ${tableName} did not become active within ${maxAttempts * delayMs}ms`,
  )
}

/**
 * Delete a test table from DynamoDB Local
 */
export async function deleteTestTable(
  client: DynamoDBClient,
  tableName: string,
): Promise<void> {
  try {
    await client.send(new DeleteTableCommand({ TableName: tableName }))
  } catch (error: any) {
    // Ignore ResourceNotFoundException
    if (error.name !== 'ResourceNotFoundException') {
      throw error
    }
  }
}

/**
 * Seed data into a test table
 */
export async function seedTestData<T extends Record<string, any>>(
  client: DynamoDBClient,
  tableName: string,
  items: T[],
): Promise<void> {
  const docClient = DynamoDBDocumentClient.from(client)

  // Batch write in chunks of 25 (DynamoDB limit)
  const chunkSize = 25
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((item) => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      }),
    )
  }
}

/**
 * Clear all data from a test table
 */
export async function clearTestTable(
  client: DynamoDBClient,
  tableName: string,
  partitionKeyName: string,
  sortKeyName?: string,
): Promise<void> {
  const docClient = DynamoDBDocumentClient.from(client)

  // Scan all items
  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      ProjectionExpression: sortKeyName
        ? `#pk, #sk`
        : '#pk',
      ExpressionAttributeNames: sortKeyName
        ? { '#pk': partitionKeyName, '#sk': sortKeyName }
        : { '#pk': partitionKeyName },
    }),
  )

  const items = scanResult.Items || []

  // Delete in batches of 25
  const chunkSize = 25
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((item) => ({
            DeleteRequest: {
              Key: sortKeyName
                ? { [partitionKeyName]: item[partitionKeyName], [sortKeyName]: item[sortKeyName] }
                : { [partitionKeyName]: item[partitionKeyName] },
            },
          })),
        },
      }),
    )
  }
}

/**
 * Test setup helper that creates a table and returns cleanup function
 */
export async function setupTestTable(
  config: TestTableConfig,
  localConfig?: DynamoDBLocalConfig,
): Promise<{
  client: DynamoDBClient
  cleanup: () => Promise<void>
}> {
  const client = createLocalClient(localConfig)

  await createTestTable(client, config)

  const cleanup = async () => {
    await deleteTestTable(client, config.tableName)
    client.destroy()
  }

  return { client, cleanup }
}

/**
 * Test setup helper with data seeding
 */
export async function setupTestTableWithData<T extends Record<string, any>>(
  config: TestTableConfig,
  data: T[],
  localConfig?: DynamoDBLocalConfig,
): Promise<{
  client: DynamoDBClient
  cleanup: () => Promise<void>
}> {
  const { client, cleanup } = await setupTestTable(config, localConfig)

  await seedTestData(client, config.tableName, data)

  return { client, cleanup }
}
