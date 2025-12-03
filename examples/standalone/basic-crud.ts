/**
 * Basic CRUD Operations Example - Standalone Mode
 *
 * This example demonstrates how to use @ddb-lib/client for basic CRUD operations
 * with pattern helpers from @ddb-lib/core.
 *
 * Requirements: 7.2, 7.3
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

// Define a simple User type
interface User {
  pk: string
  sk: string
  userId: string
  name: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt?: string
}

/**
 * Example 1: Basic CRUD with Pattern Helpers
 */
async function basicCrudWithPatternHelpers() {
  console.log('\n=== Basic CRUD with Pattern Helpers ===\n')

  // Initialize TableClient
  const client = new TableClient<User>({
    tableName: 'my-app-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000', // DynamoDB Local
    }),
  })

  const userId = 'user-123'

  // CREATE: Use PatternHelpers to generate keys
  console.log('Creating user with pattern helpers...')
  const userKey = {
    pk: PatternHelpers.entityKey('USER', userId),
    sk: PatternHelpers.entityKey('PROFILE', userId),
  }

  await client.put({
    ...userKey,
    userId,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  })
  console.log('✓ User created with keys:', userKey)

  // READ: Get the user
  console.log('\nReading user...')
  const user = await client.get(userKey)
  console.log('✓ User retrieved:', user)

  // UPDATE: Update user fields
  console.log('\nUpdating user...')
  const updated = await client.update(userKey, {
    email: 'alice.johnson@example.com',
    updatedAt: new Date().toISOString(),
  })
  console.log('✓ User updated:', updated)

  // DELETE: Remove the user
  console.log('\nDeleting user...')
  await client.delete(userKey)
  console.log('✓ User deleted')

  // Verify deletion
  const deleted = await client.get(userKey)
  console.log('✓ User after deletion:', deleted) // Should be null
}

/**
 * Example 2: Composite Keys for Hierarchical Data
 */
async function compositeKeyExample() {
  console.log('\n=== Composite Keys for Hierarchical Data ===\n')

  const client = new TableClient({
    tableName: 'my-app-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  const orgId = 'org-456'
  const teamId = 'team-789'
  const memberId = 'member-101'

  // CREATE: Use composite keys for hierarchical relationships
  console.log('Creating team member with composite keys...')
  const memberKey = {
    pk: PatternHelpers.compositeKey(['ORG', orgId, 'TEAM', teamId]),
    sk: PatternHelpers.compositeKey(['MEMBER', memberId]),
  }

  await client.put({
    ...memberKey,
    orgId,
    teamId,
    memberId,
    name: 'Bob Smith',
    role: 'Developer',
    joinedAt: new Date().toISOString(),
  })
  console.log('✓ Team member created with composite keys:', memberKey)

  // READ: Get the team member
  const member = await client.get(memberKey)
  console.log('✓ Team member retrieved:', member)

  // Parse composite keys back
  const pkParts = PatternHelpers.parseCompositeKey(memberKey.pk)
  const skParts = PatternHelpers.parseCompositeKey(memberKey.sk)
  console.log('✓ Parsed PK parts:', pkParts)
  console.log('✓ Parsed SK parts:', skParts)

  // Cleanup
  await client.delete(memberKey)
}

/**
 * Example 3: Time Series Keys
 */
async function timeSeriesExample() {
  console.log('\n=== Time Series Keys ===\n')

  const client = new TableClient({
    tableName: 'my-app-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  const sensorId = 'sensor-001'
  const timestamp = new Date()

  // CREATE: Use time series keys for temporal data
  console.log('Creating sensor reading with time series key...')
  const readingKey = {
    pk: PatternHelpers.entityKey('SENSOR', sensorId),
    sk: PatternHelpers.timeSeriesKey(timestamp, 'hour'),
  }

  await client.put({
    ...readingKey,
    sensorId,
    temperature: 72.5,
    humidity: 45.2,
    timestamp: timestamp.toISOString(),
  })
  console.log('✓ Sensor reading created with time series key:', readingKey)

  // READ: Get the reading
  const reading = await client.get(readingKey)
  console.log('✓ Sensor reading retrieved:', reading)

  // Cleanup
  await client.delete(readingKey)
}

/**
 * Example 4: Adjacency List Pattern
 */
async function adjacencyListExample() {
  console.log('\n=== Adjacency List Pattern ===\n')

  const client = new TableClient({
    tableName: 'my-app-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  const userId = 'user-alice'
  const friendId = 'user-bob'

  // CREATE: Use adjacency keys for relationships
  console.log('Creating friendship relationship...')
  const friendshipKey = PatternHelpers.adjacencyKeys(userId, friendId)

  await client.put({
    ...friendshipKey,
    userId,
    friendId,
    status: 'ACCEPTED',
    createdAt: new Date().toISOString(),
  })
  console.log('✓ Friendship created with adjacency keys:', friendshipKey)

  // READ: Get the relationship
  const friendship = await client.get(friendshipKey)
  console.log('✓ Friendship retrieved:', friendship)

  // Cleanup
  await client.delete(friendshipKey)
}

/**
 * Example 5: Distributed Keys for Hot Partitions
 */
async function distributedKeyExample() {
  console.log('\n=== Distributed Keys for Hot Partitions ===\n')

  const client = new TableClient({
    tableName: 'my-app-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  const eventType = 'PAGE_VIEW'
  const shardCount = 10

  // CREATE: Use distributed keys to avoid hot partitions
  console.log('Creating events with distributed keys...')
  const events = []

  for (let i = 0; i < 5; i++) {
    const baseKey = PatternHelpers.entityKey('EVENT', eventType)
    const distributedPk = PatternHelpers.distributedKey(baseKey, shardCount)

    const eventKey = {
      pk: distributedPk,
      sk: PatternHelpers.timeSeriesKey(new Date(), 'hour'),
    }

    await client.put({
      ...eventKey,
      eventType,
      userId: `user-${i}`,
      page: '/home',
      timestamp: new Date().toISOString(),
    })

    events.push(eventKey)
    console.log(`✓ Event ${i + 1} created with distributed key:`, distributedPk)
  }

  // Cleanup
  for (const eventKey of events) {
    await client.delete(eventKey)
  }
}

/**
 * Example 6: Conditional Operations with Pattern Helpers
 */
async function conditionalOperationsExample() {
  console.log('\n=== Conditional Operations ===\n')

  const client = new TableClient({
    tableName: 'my-app-table',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  const userId = 'user-charlie'
  const userKey = {
    pk: PatternHelpers.entityKey('USER', userId),
    sk: 'PROFILE',
  }

  // CREATE: Conditional put (create if not exists)
  console.log('Creating user with conditional put...')
  try {
    await client.put(
      {
        ...userKey,
        userId,
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        version: 1,
      },
      {
        condition: { pk: { attributeNotExists: true } },
      },
    )
    console.log('✓ User created (did not exist)')
  } catch (error) {
    console.log('✗ User already exists')
  }

  // UPDATE: Conditional update with version check
  console.log('\nUpdating user with version check...')
  try {
    await client.update(
      userKey,
      {
        email: 'charlie.brown@example.com',
        version: 2,
      },
      {
        condition: { version: { eq: 1 } },
      },
    )
    console.log('✓ Update succeeded (version matched)')
  } catch (error) {
    console.log('✗ Update failed (version mismatch)')
  }

  // Cleanup
  await client.delete(userKey)
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    await basicCrudWithPatternHelpers()
    await compositeKeyExample()
    await timeSeriesExample()
    await adjacencyListExample()
    await distributedKeyExample()
    await conditionalOperationsExample()

    console.log('\n✓ All basic CRUD examples completed successfully!\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Uncomment to run
// main()

export {
  basicCrudWithPatternHelpers,
  compositeKeyExample,
  timeSeriesExample,
  adjacencyListExample,
  distributedKeyExample,
  conditionalOperationsExample,
}
