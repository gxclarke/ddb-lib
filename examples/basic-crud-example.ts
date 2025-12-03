/**
 * Basic CRUD Operations Example
 *
 * This example demonstrates basic Create, Read, Update, and Delete operations
 * with and without schema validation.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '../src/table-client'

// Example 1: Basic CRUD without schema validation
async function basicCrudWithoutSchema() {
  console.log('\n=== Basic CRUD without Schema ===\n')

  const table = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000', // DynamoDB Local
    }),
  })

  // CREATE: Put a new item
  console.log('Creating user...')
  await table.put({
    pk: 'USER#alice',
    sk: 'PROFILE',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    age: 28,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  })
  console.log('✓ User created')

  // READ: Get the item
  console.log('\nReading user...')
  const user = await table.get({ pk: 'USER#alice', sk: 'PROFILE' })
  console.log('✓ User retrieved:', user)

  // UPDATE: Update specific fields
  console.log('\nUpdating user email...')
  const updated = await table.update(
    { pk: 'USER#alice', sk: 'PROFILE' },
    {
      email: 'alice.johnson@example.com',
      updatedAt: new Date().toISOString(),
    },
  )
  console.log('✓ User updated:', updated)

  // READ with projection (only fetch specific attributes)
  console.log('\nReading user with projection...')
  const projected = await table.get(
    { pk: 'USER#alice', sk: 'PROFILE' },
    {
      projectionExpression: ['name', 'email'],
    },
  )
  console.log('✓ User retrieved (projected):', projected)

  // UPDATE with condition (optimistic locking)
  console.log('\nConditional update...')
  try {
    await table.update(
      { pk: 'USER#alice', sk: 'PROFILE' },
      { status: 'INACTIVE' },
      {
        condition: { status: { eq: 'ACTIVE' } },
      },
    )
    console.log('✓ Conditional update succeeded')
  } catch (error) {
    console.log('✗ Conditional update failed:', error)
  }

  // DELETE: Remove the item
  console.log('\nDeleting user...')
  await table.delete({ pk: 'USER#alice', sk: 'PROFILE' })
  console.log('✓ User deleted')

  // Verify deletion
  const deleted = await table.get({ pk: 'USER#alice', sk: 'PROFILE' })
  console.log('✓ User after deletion:', deleted) // Should be null
}

// Example 2: CRUD with schema validation
async function basicCrudWithSchema() {
  console.log('\n=== Basic CRUD with Schema Validation ===\n')

  // Note: Schema system would be imported from the library
  // For this example, we'll show the pattern without actual schema validation
  // since the schema builder is not yet implemented in this codebase

  const table = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    // schema: UserSchema, // Would be defined with schema builder
  })

  // CREATE with typed data
  console.log('Creating typed user...')
  await table.put({
    pk: 'USER#bob',
    sk: 'PROFILE',
    name: 'Bob Smith',
    email: 'bob@example.com',
    age: 35,
    status: 'ACTIVE',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
    tags: ['premium', 'verified'],
    createdAt: new Date().toISOString(),
  })
  console.log('✓ Typed user created')

  // READ typed data
  console.log('\nReading typed user...')
  const user = await table.get({ pk: 'USER#bob', sk: 'PROFILE' })
  console.log('✓ Typed user retrieved:', user)

  // UPDATE nested fields
  console.log('\nUpdating nested preferences...')
  await table.update({ pk: 'USER#bob', sk: 'PROFILE' }, {
    preferences: {
      theme: 'light',
      notifications: false,
    },
  })
  console.log('✓ Nested fields updated')

  // DELETE
  console.log('\nDeleting typed user...')
  await table.delete({ pk: 'USER#bob', sk: 'PROFILE' })
  console.log('✓ Typed user deleted')
}

// Example 3: Conditional operations
async function conditionalOperations() {
  console.log('\n=== Conditional Operations ===\n')

  const table = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Conditional PUT: Only create if doesn't exist
  console.log('Conditional put (create if not exists)...')
  try {
    await table.put(
      {
        pk: 'USER#charlie',
        sk: 'PROFILE',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        version: 1,
      },
      {
        condition: { pk: { attributeNotExists: true } },
      },
    )
    console.log('✓ Item created (did not exist)')
  } catch (error) {
    console.log('✗ Item already exists')
  }

  // Conditional UPDATE: Optimistic locking with version
  console.log('\nConditional update with version check...')
  try {
    await table.update(
      { pk: 'USER#charlie', sk: 'PROFILE' },
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

  // Conditional DELETE: Only delete if status is INACTIVE
  console.log('\nConditional delete...')
  try {
    await table.delete(
      { pk: 'USER#charlie', sk: 'PROFILE' },
      {
        condition: { status: { eq: 'INACTIVE' } },
      },
    )
    console.log('✓ Delete succeeded')
  } catch (error) {
    console.log('✗ Delete failed (condition not met)')
  }

  // Cleanup
  await table.delete({ pk: 'USER#charlie', sk: 'PROFILE' })
}

// Example 4: Batch operations
async function batchOperations() {
  console.log('\n=== Batch Operations ===\n')

  const table = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Batch write: Create multiple items
  console.log('Batch writing multiple users...')
  await table.batchWrite([
    {
      type: 'put',
      item: {
        pk: 'USER#user1',
        sk: 'PROFILE',
        name: 'User One',
        email: 'user1@example.com',
      },
    },
    {
      type: 'put',
      item: {
        pk: 'USER#user2',
        sk: 'PROFILE',
        name: 'User Two',
        email: 'user2@example.com',
      },
    },
    {
      type: 'put',
      item: {
        pk: 'USER#user3',
        sk: 'PROFILE',
        name: 'User Three',
        email: 'user3@example.com',
      },
    },
  ])
  console.log('✓ Batch write completed')

  // Batch get: Retrieve multiple items
  console.log('\nBatch getting multiple users...')
  const users = await table.batchGet([
    { pk: 'USER#user1', sk: 'PROFILE' },
    { pk: 'USER#user2', sk: 'PROFILE' },
    { pk: 'USER#user3', sk: 'PROFILE' },
  ])
  console.log(`✓ Retrieved ${users.length} users:`, users)

  // Batch write: Mix of puts and deletes
  console.log('\nBatch write with mixed operations...')
  await table.batchWrite([
    {
      type: 'put',
      item: {
        pk: 'USER#user4',
        sk: 'PROFILE',
        name: 'User Four',
        email: 'user4@example.com',
      },
    },
    { type: 'delete', key: { pk: 'USER#user1', sk: 'PROFILE' } },
    { type: 'delete', key: { pk: 'USER#user2', sk: 'PROFILE' } },
  ])
  console.log('✓ Mixed batch write completed')

  // Cleanup
  await table.batchWrite([
    { type: 'delete', key: { pk: 'USER#user3', sk: 'PROFILE' } },
    { type: 'delete', key: { pk: 'USER#user4', sk: 'PROFILE' } },
  ])
}

// Example 5: Transactional operations
async function transactionalOperations() {
  console.log('\n=== Transactional Operations ===\n')

  const table = new TableClient({
    tableName: 'users',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Setup: Create initial items
  await table.put({
    pk: 'USER#sender',
    sk: 'PROFILE',
    name: 'Sender',
    balance: 100,
  })
  await table.put({
    pk: 'USER#receiver',
    sk: 'PROFILE',
    name: 'Receiver',
    balance: 50,
  })

  // Transactional write: Transfer balance between users
  console.log('Performing transactional balance transfer...')
  try {
    await table.transactWrite([
      {
        type: 'update',
        key: { pk: 'USER#sender', sk: 'PROFILE' },
        updates: { balance: 80 },
        condition: { balance: { gte: 20 } }, // Ensure sufficient balance
      },
      {
        type: 'update',
        key: { pk: 'USER#receiver', sk: 'PROFILE' },
        updates: { balance: 70 },
      },
    ])
    console.log('✓ Transaction succeeded')
  } catch (error) {
    console.log('✗ Transaction failed:', error)
  }

  // Verify balances
  const sender = await table.get({ pk: 'USER#sender', sk: 'PROFILE' })
  const receiver = await table.get({ pk: 'USER#receiver', sk: 'PROFILE' })
  console.log('Sender balance:', sender?.balance)
  console.log('Receiver balance:', receiver?.balance)

  // Transactional get: Read multiple items atomically
  console.log('\nPerforming transactional get...')
  const items = await table.transactGet([
    { pk: 'USER#sender', sk: 'PROFILE' },
    { pk: 'USER#receiver', sk: 'PROFILE' },
  ])
  console.log(`✓ Retrieved ${items.length} items atomically`)

  // Cleanup
  await table.batchWrite([
    { type: 'delete', key: { pk: 'USER#sender', sk: 'PROFILE' } },
    { type: 'delete', key: { pk: 'USER#receiver', sk: 'PROFILE' } },
  ])
}

// Run all examples
async function main() {
  try {
    await basicCrudWithoutSchema()
    await basicCrudWithSchema()
    await conditionalOperations()
    await batchOperations()
    await transactionalOperations()

    console.log('\n✓ All examples completed successfully!\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Uncomment to run
// main()

export {
  basicCrudWithoutSchema,
  basicCrudWithSchema,
  conditionalOperations,
  batchOperations,
  transactionalOperations,
}
