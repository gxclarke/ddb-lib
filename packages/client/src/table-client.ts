/**
 * TableClient - Main interface for DynamoDB operations
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand,
  TransactGetCommand,
} from '@aws-sdk/lib-dynamodb'
import type {
  Key,
  KeyCondition,
  GSIConfig,
} from '@ddb-lib/core'
import {
  KeyConditionBuilder,
  FilterExpressionBuilder,
  ConditionExpressionBuilder,
  ProjectionExpressionBuilder,
  validateMultiAttributeKeyValues,
  validateMultiAttributeSortKeyOrder,
  hasMultiAttributePartitionKey,
  hasMultiAttributeSortKey,
  isMultiAttributePartitionKey,
  isMultiAttributeSortKey,
  isMultiAttributeSortKeyArray,
} from '@ddb-lib/core'
import type {
  OperationRecord,
  Recommendation,
} from '@ddb-lib/stats'
import { StatsCollector, RecommendationEngine } from '@ddb-lib/stats'
import type {
  TableClientConfig,
  GetOptions,
  PutOptions,
  UpdateOptions,
  DeleteOptions,
  BatchGetOptions,
  BatchWriteOperation,
  BatchWriteOptions,
  TransactWriteOperation,
  TransactWriteOptions,
  TransactGetOptions,
  ConditionExpression,
  QueryParams,
  QueryResult,
  ScanParams,
  ScanResult,
  AccessPatternDefinition,
  TableStats,
} from './types'
import { RetryHandler } from './retry-handler'
import { ValidationError, ConditionalCheckError } from './errors'

/**
 * Main client for interacting with a DynamoDB table
 */
export class TableClient<TItem = any> {
  private readonly tableName: string
  private readonly client: DynamoDBClient
  private readonly docClient: DynamoDBDocumentClient
  private readonly schema?: TableClientConfig<TItem>['schema']
  private readonly accessPatterns?: TableClientConfig<TItem>['accessPatterns']
  private readonly statsCollector?: StatsCollector
  private readonly recommendationEngine?: RecommendationEngine
  private readonly retryHandler: RetryHandler

  constructor(config: TableClientConfig<TItem>) {
    this.tableName = config.tableName
    this.schema = config.schema
    this.accessPatterns = config.accessPatterns

    // Initialize retry handler with custom config or defaults
    this.retryHandler = new RetryHandler(config.retryConfig)

    // Initialize stats collector if configured
    if (config.statsConfig) {
      this.statsCollector = new StatsCollector(config.statsConfig)
      this.recommendationEngine = new RecommendationEngine(this.statsCollector)
    }

    // Initialize DynamoDB client (use provided or create new)
    if (config.client) {
      this.client = config.client
    } else {
      const clientConfig: any = {}

      if (config.region) {
        clientConfig.region = config.region
      }

      if (config.endpoint) {
        clientConfig.endpoint = config.endpoint
      }

      this.client = new DynamoDBClient(clientConfig)
    }

    // Create document client for automatic marshalling/unmarshalling
    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    })
  }

  /**
   * Get the underlying DynamoDB client for direct SDK access
   */
  getClient(): DynamoDBClient {
    return this.client
  }

  /**
   * Get the table name
   */
  getTableName(): string {
    return this.tableName
  }

  /**
   * Get aggregated statistics for operations performed by this client
   * @returns Table statistics including operation metrics and access pattern usage
   */
  getStats(): TableStats {
    if (!this.statsCollector) {
      return {
        operations: {},
        accessPatterns: {},
      }
    }

    return this.statsCollector.getStats()
  }

  /**
   * Get recommendations for optimizing table usage
   * Emits warnings for high-severity recommendations
   * @returns Array of recommendations prioritized by severity
   */
  getRecommendations(): Recommendation[] {
    if (!this.recommendationEngine) {
      return []
    }

    const recommendations = this.recommendationEngine.generateRecommendations()

    // Emit warnings for high-severity recommendations
    for (const rec of recommendations) {
      if (rec.severity === 'error' || rec.severity === 'warning') {
        console.warn(`[DynamoDB Wrapper] ${rec.severity.toUpperCase()}: ${rec.message}`)
        console.warn(`  Details: ${rec.details}`)
        if (rec.suggestedAction) {
          console.warn(`  Suggested Action: ${rec.suggestedAction}`)
        }
      }
    }

    return recommendations
  }

  /**
   * Helper method to determine if an error should be retried
   * Validation and conditional check errors should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const err = error as any

    // Don't retry validation errors
    if (error instanceof ValidationError) {
      return true
    }

    // Don't retry conditional check failures
    if (error instanceof ConditionalCheckError) {
      return true
    }

    // Don't retry DynamoDB conditional check failures
    if (err.name === 'ConditionalCheckFailedException') {
      return true
    }

    // Don't retry validation exceptions
    if (err.name === 'ValidationException') {
      return true
    }

    return false
  }

  /**
   * Execute an operation with retry logic
   * Wraps operations to handle retryable errors automatically
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        return await operation()
      } catch (error) {
        // If it's a non-retryable error, throw immediately
        if (this.isNonRetryableError(error)) {
          throw error
        }
        // Otherwise, let the retry handler decide
        throw error
      }
    })
  }

  /**
   * Get an item from the table by key
   * @param key - The partition key (pk) and optional sort key (sk)
   * @param options - Optional get options (consistentRead, projectionExpression)
   * @returns The item if found, null otherwise
   */
  async get(key: Key, options?: GetOptions): Promise<TItem | null> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      const params: any = {
        TableName: this.tableName,
        Key: key,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      // Add consistent read if specified
      if (options?.consistentRead) {
        params.ConsistentRead = true
      }

      // Add projection expression if specified
      if (options?.projectionExpression && options.projectionExpression.length > 0) {
        const projection = this.buildProjectionExpression(options.projectionExpression)
        params.ProjectionExpression = projection.expression
        if (projection.names) {
          params.ExpressionAttributeNames = {
            ...params.ExpressionAttributeNames,
            ...projection.names,
          }
        }
      }

      const command = new GetCommand(params)
      const response = await this.docClient.send(command)

      // Record stats
      if (this.statsCollector) {
        const latencyMs = Date.now() - startTime
        this.statsCollector.record({
          operation: 'get',
          timestamp: startTime,
          latencyMs,
          rcu: response.ConsumedCapacity?.CapacityUnits,
          itemCount: response.Item ? 1 : 0,
          metadata: {
            usedProjection: options?.projectionExpression && options.projectionExpression.length > 0,
            projectedAttributeCount: options?.projectionExpression?.length,
          },
        }, this.tableName)
      }

      // Return null if item doesn't exist
      return (response.Item as TItem) ?? null
    })
  }

  /**
   * Put an item into the table
   * @param item - The item to put
   * @param options - Optional put options (condition, returnValues)
   */
  async put(item: TItem, options?: PutOptions): Promise<void> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      // Validate item against schema if provided
      const validatedItem = this.validateItem(item)

      const params: any = {
        TableName: this.tableName,
        Item: validatedItem,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      // Add condition expression if specified
      if (options?.condition) {
        const conditionResult = this.buildConditionExpression(options.condition)
        params.ConditionExpression = conditionResult.expression
        if (conditionResult.names) {
          params.ExpressionAttributeNames = conditionResult.names
        }
        if (conditionResult.values) {
          params.ExpressionAttributeValues = conditionResult.values
        }
      }

      // Add return values if specified
      if (options?.returnValues) {
        params.ReturnValues = options.returnValues
      }

      try {
        const command = new PutCommand(params)
        const response = await this.docClient.send(command)

        // Record stats
        if (this.statsCollector) {
          const latencyMs = Date.now() - startTime
          this.statsCollector.record({
            operation: 'put',
            timestamp: startTime,
            latencyMs,
            wcu: response.ConsumedCapacity?.CapacityUnits,
            itemCount: 1,
          }, this.tableName)
        }
      } catch (error) {
        this.handleDynamoDBError(error, 'put', options?.condition)
      }
    })
  }

  /**
   * Update an item in the table
   * @param key - The partition key (pk) and optional sort key (sk)
   * @param updates - Partial item with fields to update
   * @param options - Optional update options (condition, returnValues)
   * @returns The updated item
   */
  async update(key: Key, updates: Partial<TItem>, options?: UpdateOptions): Promise<TItem> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      // Validate updates against schema if provided
      const validatedUpdates = this.validatePartialItem(updates)

      const params: any = {
        TableName: this.tableName,
        Key: key,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      // Build update expression from updates object
      const updateResult = this.buildUpdateExpression(validatedUpdates)
      params.UpdateExpression = updateResult.expression
      params.ExpressionAttributeNames = updateResult.names
      params.ExpressionAttributeValues = updateResult.values

      // Add condition expression if specified
      if (options?.condition) {
        const conditionResult = this.buildConditionExpression(options.condition)
        params.ConditionExpression = conditionResult.expression

        // Merge expression attribute names and values
        if (conditionResult.names) {
          params.ExpressionAttributeNames = {
            ...params.ExpressionAttributeNames,
            ...conditionResult.names,
          }
        }
        if (conditionResult.values) {
          params.ExpressionAttributeValues = {
            ...params.ExpressionAttributeValues,
            ...conditionResult.values,
          }
        }
      }

      // Set return values (default to ALL_NEW to return updated item)
      params.ReturnValues = options?.returnValues || 'ALL_NEW'

      try {
        const command = new UpdateCommand(params)
        const response = await this.docClient.send(command)

        // Record stats
        if (this.statsCollector) {
          const latencyMs = Date.now() - startTime
          this.statsCollector.record({
            operation: 'update',
            timestamp: startTime,
            latencyMs,
            wcu: response.ConsumedCapacity?.CapacityUnits,
            itemCount: 1,
          }, this.tableName)
        }

        return response.Attributes as TItem
      } catch (error) {
        this.handleDynamoDBError(error, 'update', options?.condition)
      }
    })
  }

  /**
   * Delete an item from the table
   * @param key - The partition key (pk) and optional sort key (sk)
   * @param options - Optional delete options (condition, returnValues)
   */
  async delete(key: Key, options?: DeleteOptions): Promise<void> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      const params: any = {
        TableName: this.tableName,
        Key: key,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      // Add condition expression if specified
      if (options?.condition) {
        const conditionResult = this.buildConditionExpression(options.condition)
        params.ConditionExpression = conditionResult.expression
        if (conditionResult.names) {
          params.ExpressionAttributeNames = conditionResult.names
        }
        if (conditionResult.values) {
          params.ExpressionAttributeValues = conditionResult.values
        }
      }

      // Add return values if specified
      if (options?.returnValues) {
        params.ReturnValues = options.returnValues
      }

      try {
        const command = new DeleteCommand(params)
        const response = await this.docClient.send(command)

        // Record stats
        if (this.statsCollector) {
          const latencyMs = Date.now() - startTime
          this.statsCollector.record({
            operation: 'delete',
            timestamp: startTime,
            latencyMs,
            wcu: response.ConsumedCapacity?.CapacityUnits,
            itemCount: 1,
          }, this.tableName)
        }
      } catch (error) {
        this.handleDynamoDBError(error, 'delete', options?.condition)
      }
    })
  }

  /**
   * Batch get multiple items from the table
   * Automatically chunks requests to DynamoDB's 100-item limit and retries unprocessed keys
   * 
   * @param keys - Array of keys to retrieve
   * @param options - Optional batch get options (consistentRead, projectionExpression, chunkSize)
   * @returns Array of items (may be in different order than keys, missing items are not included)
   * 
   * @example
   * ```typescript
   * const items = await client.batchGet([
   *   { pk: 'USER#1', sk: 'PROFILE' },
   *   { pk: 'USER#2', sk: 'PROFILE' },
   *   { pk: 'USER#3', sk: 'PROFILE' }
   * ])
   * ```
   */
  async batchGet(keys: Key[], options?: BatchGetOptions): Promise<TItem[]> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()
      const chunkSize = options?.chunkSize || 100 // DynamoDB limit
      const allItems: TItem[] = []

      // Split keys into chunks
      const chunks: Key[][] = []
      for (let i = 0; i < keys.length; i += chunkSize) {
        chunks.push(keys.slice(i, i + chunkSize))
      }

      // Process each chunk
      for (const chunk of chunks) {
        let keysToProcess = chunk
        let attempts = 0
        const maxAttempts = 3

        while (keysToProcess.length > 0 && attempts < maxAttempts) {
          attempts++

          const params: any = {
            RequestItems: {
              [this.tableName]: {
                Keys: keysToProcess,
                ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
              },
            },
          }

          // Add consistent read if specified
          if (options?.consistentRead) {
            params.RequestItems[this.tableName].ConsistentRead = true
          }

          // Add projection expression if specified
          if (options?.projectionExpression && options.projectionExpression.length > 0) {
            const projection = this.buildProjectionExpression(options.projectionExpression)
            params.RequestItems[this.tableName].ProjectionExpression = projection.expression
            if (projection.names) {
              params.RequestItems[this.tableName].ExpressionAttributeNames = projection.names
            }
          }

          const command = new BatchGetCommand(params)
          const response = await this.docClient.send(command)

          // Collect items from response
          const items = response.Responses?.[this.tableName] || []
          allItems.push(...(items as TItem[]))

          // Check for unprocessed keys
          const unprocessedKeys = response.UnprocessedKeys?.[this.tableName]?.Keys
          if (unprocessedKeys && unprocessedKeys.length > 0) {
            keysToProcess = unprocessedKeys as Key[]
            // Add exponential backoff before retry
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempts - 1)))
            }
          } else {
            keysToProcess = []
          }

          // Record stats for this batch
          if (this.statsCollector) {
            const consumedCapacity = response.ConsumedCapacity?.find(
              (cc) => cc.TableName === this.tableName
            )
            this.statsCollector.record({
              operation: 'batchGet',
              timestamp: startTime,
              latencyMs: Date.now() - startTime,
              rcu: consumedCapacity?.CapacityUnits,
              itemCount: items.length,
            }, this.tableName)
          }
        }

        // Warn if there are still unprocessed keys after max attempts
        if (keysToProcess.length > 0) {
          console.warn(
            `⚠️  BatchGet: ${keysToProcess.length} keys could not be processed after ${maxAttempts} attempts`
          )
        }
      }

      return allItems
    })
  }

  /**
   * Batch write multiple items to the table (put or delete operations)
   * Automatically chunks requests to DynamoDB's 25-item limit and retries unprocessed items
   * 
   * @param operations - Array of put or delete operations
   * @param options - Optional batch write options (chunkSize)
   * 
   * @example
   * ```typescript
   * await client.batchWrite([
   *   { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
   *   { type: 'put', item: { pk: 'USER#2', sk: 'PROFILE', name: 'Bob' } },
   *   { type: 'delete', key: { pk: 'USER#3', sk: 'PROFILE' } }
   * ])
   * ```
   */
  async batchWrite(
    operations: BatchWriteOperation<TItem>[],
    options?: BatchWriteOptions
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()
      const chunkSize = options?.chunkSize || 25 // DynamoDB limit

      // Split operations into chunks
      const chunks: BatchWriteOperation<TItem>[][] = []
      for (let i = 0; i < operations.length; i += chunkSize) {
        chunks.push(operations.slice(i, i + chunkSize))
      }

      // Process each chunk
      for (const chunk of chunks) {
        let operationsToProcess = chunk
        let attempts = 0
        const maxAttempts = 3

        while (operationsToProcess.length > 0 && attempts < maxAttempts) {
          attempts++

          // Build request items
          const requestItems = operationsToProcess.map((op) => {
            if (op.type === 'put') {
              // Validate item against schema if provided
              const validatedItem = this.validateItem(op.item)
              return {
                PutRequest: {
                  Item: validatedItem,
                },
              }
            }
            // Delete operation
            return {
              DeleteRequest: {
                Key: op.key,
              },
            }
          })

          const params: any = {
            RequestItems: {
              [this.tableName]: requestItems,
            },
            ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
          }

          const command = new BatchWriteCommand(params)
          const response = await this.docClient.send(command)

          // Check for unprocessed items
          const unprocessedItems = response.UnprocessedItems?.[this.tableName]
          if (unprocessedItems && unprocessedItems.length > 0) {
            // Convert unprocessed items back to operations
            operationsToProcess = unprocessedItems.map((item) => {
              if ('PutRequest' in item && item.PutRequest) {
                return {
                  type: 'put' as const,
                  item: item.PutRequest.Item as TItem,
                }
              }
              // DeleteRequest
              return {
                type: 'delete' as const,
                key: item.DeleteRequest!.Key as Key,
              }
            })

            // Add exponential backoff before retry
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempts - 1)))
            }
          } else {
            operationsToProcess = []
          }

          // Record stats for this batch
          if (this.statsCollector) {
            const consumedCapacity = response.ConsumedCapacity?.find(
              (cc) => cc.TableName === this.tableName
            )
            this.statsCollector.record({
              operation: 'batchWrite',
              timestamp: startTime,
              latencyMs: Date.now() - startTime,
              wcu: consumedCapacity?.CapacityUnits,
              itemCount: requestItems.length,
            }, this.tableName)
          }
        }

        // Warn if there are still unprocessed items after max attempts
        if (operationsToProcess.length > 0) {
          console.warn(
            `⚠️  BatchWrite: ${operationsToProcess.length} operations could not be processed after ${maxAttempts} attempts`
          )
        }
      }
    })
  }

  /**
   * Execute multiple write operations as a single atomic transaction
   * All operations succeed or all fail together (up to 100 operations)
   * 
   * @param operations - Array of transactional write operations (put, update, delete, conditionCheck)
   * @param options - Optional transaction options
   * 
   * @example
   * ```typescript
   * await client.transactWrite([
   *   { type: 'put', item: { pk: 'USER#1', sk: 'PROFILE', name: 'Alice' } },
   *   { type: 'update', key: { pk: 'ACCOUNT#1', sk: 'BALANCE' }, updates: { balance: 100 } },
   *   { type: 'delete', key: { pk: 'TEMP#1', sk: 'DATA' } },
   *   { type: 'conditionCheck', key: { pk: 'LOCK#1', sk: 'STATUS' }, condition: { status: 'AVAILABLE' } }
   * ])
   * ```
   */
  async transactWrite(
    operations: TransactWriteOperation<TItem>[],
    options?: TransactWriteOptions
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      if (operations.length === 0) {
        return
      }

      if (operations.length > 100) {
        throw new Error(
          `TransactWrite supports a maximum of 100 operations, but ${operations.length} were provided`
        )
      }

      // Build transaction items
      const transactItems = operations.map((op) => {
        if (op.type === 'put') {
          // Validate item against schema if provided
          const validatedItem = this.validateItem(op.item)
          const putItem: any = {
            Put: {
              TableName: this.tableName,
              Item: validatedItem,
            },
          }

          // Add condition expression if specified
          if (op.condition) {
            const conditionResult = this.buildConditionExpression(op.condition)
            putItem.Put.ConditionExpression = conditionResult.expression
            if (conditionResult.names) {
              putItem.Put.ExpressionAttributeNames = conditionResult.names
            }
            if (conditionResult.values) {
              putItem.Put.ExpressionAttributeValues = conditionResult.values
            }
          }

          return putItem
        }

        if (op.type === 'update') {
          // Validate updates against schema if provided
          const validatedUpdates = this.validatePartialItem(op.updates)

          const updateItem: any = {
            Update: {
              TableName: this.tableName,
              Key: op.key,
            },
          }

          // Build update expression
          const updateResult = this.buildUpdateExpression(validatedUpdates)
          updateItem.Update.UpdateExpression = updateResult.expression
          updateItem.Update.ExpressionAttributeNames = updateResult.names
          updateItem.Update.ExpressionAttributeValues = updateResult.values

          // Add condition expression if specified
          if (op.condition) {
            const conditionResult = this.buildConditionExpression(op.condition)
            updateItem.Update.ConditionExpression = conditionResult.expression

            // Merge expression attribute names and values
            if (conditionResult.names) {
              updateItem.Update.ExpressionAttributeNames = {
                ...updateItem.Update.ExpressionAttributeNames,
                ...conditionResult.names,
              }
            }
            if (conditionResult.values) {
              updateItem.Update.ExpressionAttributeValues = {
                ...updateItem.Update.ExpressionAttributeValues,
                ...conditionResult.values,
              }
            }
          }

          return updateItem
        }

        if (op.type === 'delete') {
          const deleteItem: any = {
            Delete: {
              TableName: this.tableName,
              Key: op.key,
            },
          }

          // Add condition expression if specified
          if (op.condition) {
            const conditionResult = this.buildConditionExpression(op.condition)
            deleteItem.Delete.ConditionExpression = conditionResult.expression
            if (conditionResult.names) {
              deleteItem.Delete.ExpressionAttributeNames = conditionResult.names
            }
            if (conditionResult.values) {
              deleteItem.Delete.ExpressionAttributeValues = conditionResult.values
            }
          }

          return deleteItem
        }

        // conditionCheck
        const conditionCheckItem: any = {
          ConditionCheck: {
            TableName: this.tableName,
            Key: op.key,
          },
        }

        // Condition is required for conditionCheck
        const conditionResult = this.buildConditionExpression(op.condition)
        conditionCheckItem.ConditionCheck.ConditionExpression = conditionResult.expression
        if (conditionResult.names) {
          conditionCheckItem.ConditionCheck.ExpressionAttributeNames = conditionResult.names
        }
        if (conditionResult.values) {
          conditionCheckItem.ConditionCheck.ExpressionAttributeValues = conditionResult.values
        }

        return conditionCheckItem
      })

      const params: any = {
        TransactItems: transactItems,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      // Add client request token if specified (for idempotency)
      if (options?.clientRequestToken) {
        params.ClientRequestToken = options.clientRequestToken
      }

      const command = new TransactWriteCommand(params)
      const response = await this.docClient.send(command)

      // Record stats
      if (this.statsCollector) {
        const latencyMs = Date.now() - startTime
        const totalWCU = response.ConsumedCapacity?.reduce(
          (sum, cc) => sum + (cc.CapacityUnits || 0),
          0
        )
        this.statsCollector.record({
          operation: 'transactWrite',
          timestamp: startTime,
          latencyMs,
          wcu: totalWCU,
          itemCount: operations.length,
        }, this.tableName)
      }
    })
  }

  /**
   * Get multiple items as a single atomic transaction
   * All reads are performed at the same point in time (up to 100 items)
   * 
   * @param keys - Array of keys to retrieve (max 100)
   * @param options - Optional transaction get options
   * @returns Array of items (in the same order as keys, null for missing items)
   * 
   * @example
   * ```typescript
   * const items = await client.transactGet([
   *   { pk: 'USER#1', sk: 'PROFILE' },
   *   { pk: 'ACCOUNT#1', sk: 'BALANCE' },
   *   { pk: 'ORDER#1', sk: 'DETAILS' }
   * ])
   * ```
   */
  async transactGet(keys: Key[], options?: TransactGetOptions): Promise<(TItem | null)[]> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      if (keys.length === 0) {
        return []
      }

      if (keys.length > 100) {
        throw new Error(
          `TransactGet supports a maximum of 100 items, but ${keys.length} were provided`
        )
      }

      // Build transaction items
      const transactItems = keys.map((key) => {
        const getItem: any = {
          Get: {
            TableName: this.tableName,
            Key: key,
          },
        }

        // Add projection expression if specified
        if (options?.projectionExpression && options.projectionExpression.length > 0) {
          const projection = this.buildProjectionExpression(options.projectionExpression)
          getItem.Get.ProjectionExpression = projection.expression
          if (projection.names) {
            getItem.Get.ExpressionAttributeNames = projection.names
          }
        }

        return getItem
      })

      const params: any = {
        TransactItems: transactItems,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      const command = new TransactGetCommand(params)
      const response = await this.docClient.send(command)

      // Extract items from response (maintaining order)
      const items = (response.Responses || []).map((r) => (r.Item as TItem) || null)

      // Record stats
      if (this.statsCollector) {
        const latencyMs = Date.now() - startTime
        const totalRCU = response.ConsumedCapacity?.reduce(
          (sum, cc) => sum + (cc.CapacityUnits || 0),
          0
        )
        this.statsCollector.record({
          operation: 'transactGet',
          timestamp: startTime,
          latencyMs,
          rcu: totalRCU,
          itemCount: items.filter((item) => item !== null).length,
        }, this.tableName)
      }

      return items
    })
  }

  /**
   * Query items from the table
   * @param params - Query parameters including key condition, filter, index, etc.
   * @returns Query result with items, count, and pagination info
   */
  async query(params: QueryParams): Promise<QueryResult<TItem>> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      const queryParams: any = {
        TableName: this.tableName,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      // Build key condition expression
      const keyConditionBuilder = new KeyConditionBuilder()
      const keyConditionResult = keyConditionBuilder.build(params.keyCondition)
      queryParams.KeyConditionExpression = keyConditionResult.expression
      queryParams.ExpressionAttributeNames = keyConditionResult.attributeNames
      queryParams.ExpressionAttributeValues = keyConditionResult.attributeValues

      // Build filter expression if provided
      if (params.filter) {
        const filterBuilder = new FilterExpressionBuilder()
        const filterResult = filterBuilder.build(params.filter)
        queryParams.FilterExpression = filterResult.expression

        // Merge expression attribute names and values
        queryParams.ExpressionAttributeNames = {
          ...queryParams.ExpressionAttributeNames,
          ...filterResult.attributeNames,
        }
        queryParams.ExpressionAttributeValues = {
          ...queryParams.ExpressionAttributeValues,
          ...filterResult.attributeValues,
        }
      }

      // Add index name if specified (for GSI/LSI queries)
      if (params.index) {
        queryParams.IndexName = params.index
      }

      // Add limit if specified
      if (params.limit !== undefined) {
        queryParams.Limit = params.limit
      }

      // Add scan direction if specified
      if (params.scanIndexForward !== undefined) {
        queryParams.ScanIndexForward = params.scanIndexForward
      }

      // Add exclusive start key for pagination
      if (params.exclusiveStartKey) {
        queryParams.ExclusiveStartKey = params.exclusiveStartKey
      }

      // Add consistent read if specified
      if (params.consistentRead) {
        queryParams.ConsistentRead = true
      }

      // Add projection expression if specified
      if (params.projectionExpression && params.projectionExpression.length > 0) {
        const projection = this.buildProjectionExpression(params.projectionExpression)
        queryParams.ProjectionExpression = projection.expression
        if (projection.names) {
          queryParams.ExpressionAttributeNames = {
            ...queryParams.ExpressionAttributeNames,
            ...projection.names,
          }
        }
      }

      const command = new QueryCommand(queryParams)
      const response = await this.docClient.send(command)

      // Record stats
      if (this.statsCollector) {
        const latencyMs = Date.now() - startTime
        const stats: OperationRecord = {
          operation: 'query',
          timestamp: startTime,
          latencyMs,
          rcu: response.ConsumedCapacity?.CapacityUnits,
          itemCount: response.Count || 0,
          scannedCount: response.ScannedCount || 0,
          indexName: params.index,
          metadata: {
            usedProjection: params.projectionExpression && params.projectionExpression.length > 0,
            projectedAttributeCount: params.projectionExpression?.length,
          },
        }
        this.statsCollector.record(stats, this.tableName)
      }

      return {
        items: (response.Items as TItem[]) || [],
        lastEvaluatedKey: response.LastEvaluatedKey as Key | undefined,
        count: response.Count || 0,
        scannedCount: response.ScannedCount || 0,
        consumedCapacity: response.ConsumedCapacity,
      }
    })
  }

  /**
   * Scan items from the table
   * WARNING: Scan operations are expensive and should be avoided when possible.
   * Consider using query with an appropriate index instead.
   * 
   * @param params - Scan parameters including filter, index, etc.
   * @returns Scan result with items, count, and pagination info
   */
  async scan(params?: ScanParams): Promise<ScanResult<TItem>> {
    return this.executeWithRetry(async () => {
      const startTime = Date.now()

      // Emit warning about scan usage
      console.warn(
        '⚠️  DynamoDB Scan operation detected. Scans read every item in the table and are expensive. ' +
        'Consider using query with an appropriate index for better performance.'
      )

      const scanParams: any = {
        TableName: this.tableName,
        ReturnConsumedCapacity: this.statsCollector ? 'TOTAL' : 'NONE',
      }

      // Build filter expression if provided
      if (params?.filter) {
        const filterBuilder = new FilterExpressionBuilder()
        const filterResult = filterBuilder.build(params.filter)
        scanParams.FilterExpression = filterResult.expression
        scanParams.ExpressionAttributeNames = filterResult.attributeNames
        scanParams.ExpressionAttributeValues = filterResult.attributeValues
      }

      // Add index name if specified (for GSI/LSI scans)
      if (params?.index) {
        scanParams.IndexName = params.index
      }

      // Add limit if specified
      if (params?.limit !== undefined) {
        scanParams.Limit = params.limit
      }

      // Add exclusive start key for pagination
      if (params?.exclusiveStartKey) {
        scanParams.ExclusiveStartKey = params.exclusiveStartKey
      }

      // Add consistent read if specified
      if (params?.consistentRead) {
        scanParams.ConsistentRead = true
      }

      // Add projection expression if specified
      if (params?.projectionExpression && params.projectionExpression.length > 0) {
        const projection = this.buildProjectionExpression(params.projectionExpression)
        scanParams.ProjectionExpression = projection.expression
        if (projection.names) {
          scanParams.ExpressionAttributeNames = {
            ...scanParams.ExpressionAttributeNames,
            ...projection.names,
          }
        }
      }

      const command = new ScanCommand(scanParams)
      const response = await this.docClient.send(command)

      // Record stats
      if (this.statsCollector) {
        const latencyMs = Date.now() - startTime
        const stats: OperationRecord = {
          operation: 'scan',
          timestamp: startTime,
          latencyMs,
          rcu: response.ConsumedCapacity?.CapacityUnits,
          itemCount: response.Count || 0,
          scannedCount: response.ScannedCount || 0,
          indexName: params?.index,
          metadata: {
            usedProjection: params?.projectionExpression && params.projectionExpression.length > 0,
            projectedAttributeCount: params?.projectionExpression?.length,
          },
        }
        this.statsCollector.record(stats, this.tableName)
      }

      return {
        items: (response.Items as TItem[]) || [],
        lastEvaluatedKey: response.LastEvaluatedKey as Key | undefined,
        count: response.Count || 0,
        scannedCount: response.ScannedCount || 0,
        consumedCapacity: response.ConsumedCapacity,
      }
    })
  }

  /**
   * Query items with automatic pagination using async iteration
   * This allows processing large result sets without loading everything into memory
   * 
   * @param params - Query parameters
   * @returns AsyncIterableIterator that yields items one at a time
   * 
   * @example
   * ```typescript
   * for await (const item of client.queryPaginated({ keyCondition: { pk: 'USER#123' } })) {
   *   console.log(item)
   * }
   * ```
   */
  async * queryPaginated(params: QueryParams): AsyncIterableIterator<TItem> {
    let lastEvaluatedKey: Key | undefined = params.exclusiveStartKey

    do {
      const result = await this.query({
        ...params,
        exclusiveStartKey: lastEvaluatedKey,
      })

      for (const item of result.items) {
        yield item
      }

      lastEvaluatedKey = result.lastEvaluatedKey
    } while (lastEvaluatedKey)
  }

  /**
   * Scan items with automatic pagination using async iteration
   * This allows processing large result sets without loading everything into memory
   * WARNING: Scan operations are expensive. Consider using queryPaginated with an index instead.
   * 
   * @param params - Scan parameters
   * @returns AsyncIterableIterator that yields items one at a time
   * 
   * @example
   * ```typescript
   * for await (const item of client.scanPaginated({ filter: { status: 'ACTIVE' } })) {
   *   console.log(item)
   * }
   * ```
   */
  async * scanPaginated(params?: ScanParams): AsyncIterableIterator<TItem> {
    let lastEvaluatedKey: Key | undefined = params?.exclusiveStartKey

    do {
      const result = await this.scan({
        ...params,
        exclusiveStartKey: lastEvaluatedKey,
      })

      for (const item of result.items) {
        yield item
      }

      lastEvaluatedKey = result.lastEvaluatedKey
    } while (lastEvaluatedKey)
  }

  /**
   * Execute a named access pattern with type-safe pattern names and parameters
   * @param patternName - Name of the access pattern to execute (type-checked against defined patterns)
   * @param params - Parameters for the access pattern (type-checked against pattern definition)
   * @returns Array of items matching the pattern
   * 
   * @example
   * ```typescript
   * const orders = await client.executePattern('getUserOrders', { userId: '123' })
   * ```
   */
  async executePattern<
    TPatternName extends keyof NonNullable<TableClientConfig<TItem>['accessPatterns']>,
    TParams = NonNullable<TableClientConfig<TItem>['accessPatterns']>[TPatternName] extends AccessPatternDefinition<TItem, infer P, any> ? P : never,
    TResult = NonNullable<TableClientConfig<TItem>['accessPatterns']>[TPatternName] extends AccessPatternDefinition<TItem, any, infer R> ? R : TItem
  >(
    patternName: TPatternName,
    params: TParams
  ): Promise<TResult[]> {
    const startTime = Date.now()

    // Check if access patterns are defined
    if (!this.accessPatterns) {
      throw new Error(
        `Access patterns not configured. Please provide accessPatterns in TableClientConfig.`
      )
    }

    // Look up the pattern definition
    const pattern = this.accessPatterns[patternName]
    if (!pattern) {
      const availablePatterns = Object.keys(this.accessPatterns).join(', ')
      throw new Error(
        `Access pattern '${patternName}' not found. Available patterns: ${availablePatterns}`
      )
    }

    // Execute the keyCondition function to get the key condition
    const keyCondition = pattern.keyCondition(params)

    // Validate multi-attribute keys against GSI configuration if provided
    if (pattern.gsiConfig) {
      this.validateMultiAttributeKeysAgainstConfig(keyCondition, pattern.gsiConfig)
    }

    // Build query parameters
    const queryParams: QueryParams = {
      keyCondition,
    }

    // Add index if specified
    if (pattern.index) {
      queryParams.index = pattern.index
    }

    // Add filter if specified
    if (pattern.filter) {
      queryParams.filter = pattern.filter(params)
    }

    // Execute the query (this will record its own stats)
    const result = await this.query(queryParams)

    // Record additional stats for the access pattern
    if (this.statsCollector) {
      const latencyMs = Date.now() - startTime
      const stats: OperationRecord = {
        operation: 'query',
        indexName: pattern.index,
        patternName: String(patternName),
        timestamp: startTime,
        latencyMs,
        rcu: result.consumedCapacity?.CapacityUnits,
        itemCount: result.count,
        scannedCount: result.scannedCount,
      }
      this.statsCollector.record(stats, this.tableName)
    }

    // Apply transform if specified
    if (pattern.transform) {
      return pattern.transform(result.items) as unknown as TResult[]
    }

    return result.items as unknown as TResult[]
  }

  /**
   * Validate multi-attribute keys against GSI configuration
   * @private
   */
  private validateMultiAttributeKeysAgainstConfig(
    keyCondition: KeyCondition,
    gsiConfig: GSIConfig
  ): void {
    // Validate partition key
    if (hasMultiAttributePartitionKey(keyCondition)) {
      if (!isMultiAttributePartitionKey(gsiConfig.partitionKey)) {
        throw new Error(
          `Access pattern uses multi-attribute partition key but GSI '${gsiConfig.indexName}' is configured with single-attribute partition key`
        )
      }

      validateMultiAttributeKeyValues(
        keyCondition.multiPk,
        gsiConfig.partitionKey,
        'partition'
      )
    }

    // Validate sort key
    if (hasMultiAttributeSortKey(keyCondition)) {
      if (!isMultiAttributeSortKey(gsiConfig.sortKey)) {
        throw new Error(
          `Access pattern uses multi-attribute sort key but GSI '${gsiConfig.indexName}' is configured with single-attribute sort key`
        )
      }

      // Extract values from sort key condition
      let sortKeyValues: Array<string | number | Uint8Array>

      if (isMultiAttributeSortKeyArray(keyCondition.multiSk)) {
        sortKeyValues = keyCondition.multiSk
      } else {
        // For conditions like { gte: [...] }, extract the values
        const condition = keyCondition.multiSk
        if ('eq' in condition && Array.isArray(condition.eq)) {
          sortKeyValues = condition.eq
        } else if ('lt' in condition && Array.isArray(condition.lt)) {
          sortKeyValues = condition.lt
        } else if ('lte' in condition && Array.isArray(condition.lte)) {
          sortKeyValues = condition.lte
        } else if ('gt' in condition && Array.isArray(condition.gt)) {
          sortKeyValues = condition.gt
        } else if ('gte' in condition && Array.isArray(condition.gte)) {
          sortKeyValues = condition.gte
        } else if ('between' in condition && Array.isArray(condition.between)) {
          // For between, validate both bounds
          sortKeyValues = condition.between[0]
          validateMultiAttributeKeyValues(
            condition.between[1],
            gsiConfig.sortKey,
            'sort'
          )
          validateMultiAttributeSortKeyOrder(condition.between[1], gsiConfig.sortKey)
        } else {
          // Unknown condition format
          return
        }
      }

      validateMultiAttributeKeyValues(sortKeyValues, gsiConfig.sortKey, 'sort')
      validateMultiAttributeSortKeyOrder(sortKeyValues, gsiConfig.sortKey)
    }
  }

  /**
   * Build an update expression from a partial item
   * @private
   */
  private buildUpdateExpression(updates: Partial<TItem>): {
    expression: string
    names: Record<string, string>
    values: Record<string, any>
  } {
    const setExpressions: string[] = []
    const names: Record<string, string> = {}
    const values: Record<string, any> = {}
    let nameCounter = 0
    let valueCounter = 0

    for (const [field, value] of Object.entries(updates)) {
      // Skip undefined values
      if (value === undefined) {
        continue
      }

      const nameKey = `#u${nameCounter++}`
      const valueKey = `:u${valueCounter++}`

      names[nameKey] = field
      values[valueKey] = value
      setExpressions.push(`${nameKey} = ${valueKey}`)
    }

    return {
      expression: `SET ${setExpressions.join(', ')}`,
      names,
      values,
    }
  }

  /**
   * Build a condition expression from a ConditionExpression object
   * @private
   */
  private buildConditionExpression(condition: ConditionExpression): {
    expression: string
    names?: Record<string, string>
    values?: Record<string, any>
  } {
    const builder = new ConditionExpressionBuilder()
    const result = builder.build(condition)

    return {
      expression: result.expression,
      names: Object.keys(result.attributeNames).length > 0 ? result.attributeNames : undefined,
      values: Object.keys(result.attributeValues).length > 0 ? result.attributeValues : undefined,
    }
  }

  /**
   * Build projection expression from attribute array
   * @private
   */
  private buildProjectionExpression(attributes: string[]): {
    expression: string
    names?: Record<string, string>
  } {
    if (!attributes || attributes.length === 0) {
      return { expression: '' }
    }

    const builder = new ProjectionExpressionBuilder()
    const result = builder.build(attributes)

    return {
      expression: result.expression,
      names: Object.keys(result.attributeNames).length > 0 ? result.attributeNames : undefined,
    }
  }

  /**
   * Handle DynamoDB errors and convert to wrapper errors
   * @private
   */
  private handleDynamoDBError(error: any, operation: string, condition?: ConditionExpression): never {
    // Handle conditional check failures
    if (error.name === 'ConditionalCheckFailedException') {
      const conditionStr = condition ? JSON.stringify(condition) : 'unknown'
      throw new ConditionalCheckError(
        `Conditional check failed for ${operation} operation`,
        conditionStr,
        error.Item
      )
    }

    // Re-throw other errors
    throw error
  }

  /**
   * Validate a full item against the schema
   * @private
   */
  private validateItem(item: TItem): TItem {
    if (!this.schema) {
      return item
    }

    return this.schema.parse(item)
  }

  /**
   * Validate a partial item (for updates) against the schema
   * @private
   */
  private validatePartialItem(updates: Partial<TItem>): Partial<TItem> {
    if (!this.schema) {
      return updates
    }

    // Use partial schema for update validation
    const partialSchema = this.schema.partial()
    return partialSchema.parse(updates)
  }
}
