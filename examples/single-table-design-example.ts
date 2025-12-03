/**
 * Single-Table Design Example
 *
 * This example demonstrates how to implement single-table design patterns
 * with multiple entity types, access patterns, and pattern helpers.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '../src/table-client'
import { PatternHelpers } from '../src/pattern-helpers'
import type { AccessPatternDefinitions } from '../src/types'

// Define entity types for a multi-tenant e-commerce application
interface User {
  pk: string // USER#<userId>
  sk: string // PROFILE
  userId: string
  name: string
  email: string
  tenantId: string
  createdAt: string
}

interface Order {
  pk: string // USER#<userId>
  sk: string // ORDER#<orderId>
  orderId: string
  userId: string
  tenantId: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  total: number
  createdAt: string
  // GSI1: STATUS#<status> / <createdAt>
  gsi1pk?: string
  gsi1sk?: string
}

interface Product {
  pk: string // PRODUCT#<productId>
  sk: string // METADATA
  productId: string
  name: string
  category: string
  price: number
  stock: number
  // GSI1: CATEGORY#<category> / PRODUCT#<productId>
  gsi1pk?: string
  gsi1sk?: string
}

// Define access patterns for the single table
const accessPatterns: AccessPatternDefinitions<User | Order | Product> = {
  // User patterns
  getUserById: {
    keyCondition: (params: { userId: string }) => ({
      pk: PatternHelpers.entityKey('USER', params.userId),
      sk: 'PROFILE',
    }),
  },

  getUserOrders: {
    keyCondition: (params: { userId: string }) => ({
      pk: PatternHelpers.entityKey('USER', params.userId),
      sk: { beginsWith: 'ORDER#' },
    }),
  },

  // Order patterns
  getOrderById: {
    keyCondition: (params: { userId: string; orderId: string }) => ({
      pk: PatternHelpers.entityKey('USER', params.userId),
      sk: PatternHelpers.entityKey('ORDER', params.orderId),
    }),
  },

  getOrdersByStatus: {
    index: 'GSI1',
    keyCondition: (params: { status: string; fromDate?: string }) => ({
      pk: PatternHelpers.entityKey('STATUS', params.status),
      sk: params.fromDate ? { gte: params.fromDate } : undefined,
    }),
  },

  // Product patterns
  getProductById: {
    keyCondition: (params: { productId: string }) => ({
      pk: PatternHelpers.entityKey('PRODUCT', params.productId),
      sk: 'METADATA',
    }),
  },

  getProductsByCategory: {
    index: 'GSI1',
    keyCondition: (params: { category: string }) => ({
      pk: PatternHelpers.entityKey('CATEGORY', params.category),
      sk: { beginsWith: 'PRODUCT#' },
    }),
  },
}

// Example 1: Basic single-table operations
async function basicSingleTableOperations() {
  console.log('\n=== Basic Single-Table Operations ===\n')

  const table = new TableClient({
    tableName: 'ecommerce',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    accessPatterns,
  })

  // Create a user
  console.log('Creating user...')
  const user: User = {
    pk: PatternHelpers.entityKey('USER', 'user123'),
    sk: 'PROFILE',
    userId: 'user123',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    tenantId: 'tenant1',
    createdAt: new Date().toISOString(),
  }
  await table.put(user)
  console.log('✓ User created')

  // Create products
  console.log('\nCreating products...')
  const products: Product[] = [
    {
      pk: PatternHelpers.entityKey('PRODUCT', 'prod1'),
      sk: 'METADATA',
      productId: 'prod1',
      name: 'Laptop',
      category: 'electronics',
      price: 999.99,
      stock: 50,
      gsi1pk: PatternHelpers.entityKey('CATEGORY', 'electronics'),
      gsi1sk: PatternHelpers.entityKey('PRODUCT', 'prod1'),
    },
    {
      pk: PatternHelpers.entityKey('PRODUCT', 'prod2'),
      sk: 'METADATA',
      productId: 'prod2',
      name: 'Mouse',
      category: 'electronics',
      price: 29.99,
      stock: 200,
      gsi1pk: PatternHelpers.entityKey('CATEGORY', 'electronics'),
      gsi1sk: PatternHelpers.entityKey('PRODUCT', 'prod2'),
    },
  ]

  for (const product of products) {
    await table.put(product)
  }
  console.log('✓ Products created')

  // Create orders
  console.log('\nCreating orders...')
  const orders: Order[] = [
    {
      pk: PatternHelpers.entityKey('USER', 'user123'),
      sk: PatternHelpers.entityKey('ORDER', 'order1'),
      orderId: 'order1',
      userId: 'user123',
      tenantId: 'tenant1',
      status: 'COMPLETED',
      total: 999.99,
      createdAt: '2025-12-01T10:00:00Z',
      gsi1pk: PatternHelpers.entityKey('STATUS', 'COMPLETED'),
      gsi1sk: '2025-12-01T10:00:00Z',
    },
    {
      pk: PatternHelpers.entityKey('USER', 'user123'),
      sk: PatternHelpers.entityKey('ORDER', 'order2'),
      orderId: 'order2',
      userId: 'user123',
      tenantId: 'tenant1',
      status: 'PENDING',
      total: 29.99,
      createdAt: '2025-12-03T14:30:00Z',
      gsi1pk: PatternHelpers.entityKey('STATUS', 'PENDING'),
      gsi1sk: '2025-12-03T14:30:00Z',
    },
  ]

  for (const order of orders) {
    await table.put(order)
  }
  console.log('✓ Orders created')

  console.log('\n✓ Single table populated with multiple entity types')
}

// Example 2: Query using access patterns
async function queryWithAccessPatterns() {
  console.log('\n=== Query Using Access Patterns ===\n')

  const table = new TableClient({
    tableName: 'ecommerce',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    accessPatterns,
  })

  // Get user by ID
  console.log('Getting user by ID...')
  const users = await table.executePattern('getUserById', { userId: 'user123' })
  console.log('✓ User:', users[0])

  // Get all orders for a user
  console.log('\nGetting user orders...')
  const userOrders = await table.executePattern('getUserOrders', {
    userId: 'user123',
  })
  console.log(`✓ Found ${userOrders.length} orders for user`)

  // Get specific order
  console.log('\nGetting specific order...')
  const order = await table.executePattern('getOrderById', {
    userId: 'user123',
    orderId: 'order1',
  })
  console.log('✓ Order:', order[0])

  // Get orders by status
  console.log('\nGetting completed orders...')
  const completedOrders = await table.executePattern('getOrdersByStatus', {
    status: 'COMPLETED',
  })
  console.log(`✓ Found ${completedOrders.length} completed orders`)

  // Get products by category
  console.log('\nGetting electronics products...')
  const electronics = await table.executePattern('getProductsByCategory', {
    category: 'electronics',
  })
  console.log(`✓ Found ${electronics.length} electronics products`)
}

// Example 3: Pattern helpers for key construction
async function patternHelpersExample() {
  console.log('\n=== Pattern Helpers Example ===\n')

  const table = new TableClient({
    tableName: 'ecommerce',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Entity keys
  console.log('Entity key examples:')
  const userKey = PatternHelpers.entityKey('USER', 'user456')
  console.log(`  User key: ${userKey}`)

  const orderKey = PatternHelpers.entityKey('ORDER', 'order789')
  console.log(`  Order key: ${orderKey}`)

  const parsed = PatternHelpers.parseEntityKey(userKey)
  console.log(`  Parsed: entityType="${parsed.entityType}", id="${parsed.id}"`)

  // Composite keys
  console.log('\nComposite key examples:')
  const compositeKey = PatternHelpers.compositeKey(['TENANT', 'tenant1', 'USER', 'user456'])
  console.log(`  Composite key: ${compositeKey}`)

  const compositeParts = PatternHelpers.parseCompositeKey(compositeKey)
  console.log(`  Parsed parts: [${compositeParts.join(', ')}]`)

  // Hierarchical keys
  console.log('\nHierarchical key examples:')
  const hierarchical = PatternHelpers.hierarchicalKey(['org', 'dept', 'team', 'user'])
  console.log(`  Hierarchical key: ${hierarchical}`)

  const hierarchicalParts = PatternHelpers.parseHierarchicalKey(hierarchical)
  console.log(`  Parsed hierarchy: [${hierarchicalParts.join(', ')}]`)

  // Time-series keys
  console.log('\nTime-series key examples:')
  const now = new Date('2025-12-03T15:30:00Z')
  const dayKey = PatternHelpers.timeSeriesKey(now, 'day')
  const hourKey = PatternHelpers.timeSeriesKey(now, 'hour')
  console.log(`  Day key: ${dayKey}`)
  console.log(`  Hour key: ${hourKey}`)

  // TTL timestamp
  const expiresAt = new Date('2026-12-03T00:00:00Z')
  const ttl = PatternHelpers.ttlTimestamp(expiresAt)
  console.log(`  TTL timestamp: ${ttl}`)

  // Adjacency list pattern
  console.log('\nAdjacency list pattern:')
  const adjacency = PatternHelpers.adjacencyKeys('USER#user123', 'ORDER#order456')
  console.log(`  Forward edge: pk="${adjacency.pk}", sk="${adjacency.sk}"`)

  // Distributed keys for hot partition prevention
  console.log('\nDistributed key for hot partition prevention:')
  const distributed = PatternHelpers.distributedKey('POPULAR_ITEM', 10)
  console.log(`  Distributed key: ${distributed}`)
  const shardNumber = PatternHelpers.getShardNumber(distributed)
  console.log(`  Shard number: ${shardNumber}`)

  // GSI key construction
  console.log('\nGSI key construction:')
  const gsiKey = PatternHelpers.gsiKey('GSI1', 'STATUS', 'ACTIVE')
  console.log(`  GSI key: ${gsiKey}`)

  // Sparse index helper
  console.log('\nSparse index helper:')
  const emailVerified = true
  const sparseValue = PatternHelpers.sparseIndexValue(emailVerified, 'VERIFIED#USER')
  console.log(`  Sparse value (verified): ${sparseValue}`)

  const notVerified = false
  const noValue = PatternHelpers.sparseIndexValue(notVerified, 'VERIFIED#USER')
  console.log(`  Sparse value (not verified): ${noValue}`)
}

// Example 4: Multi-tenant single-table design
async function multiTenantExample() {
  console.log('\n=== Multi-Tenant Single-Table Design ===\n')

  const table = new TableClient({
    tableName: 'multi-tenant-app',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Create items for multiple tenants
  console.log('Creating multi-tenant data...')

  const tenants = ['tenant1', 'tenant2']
  const users = ['user1', 'user2']

  for (const tenantId of tenants) {
    for (const userId of users) {
      // User profile
      await table.put({
        pk: PatternHelpers.compositeKey(['TENANT', tenantId, 'USER', userId]),
        sk: 'PROFILE',
        tenantId,
        userId,
        name: `User ${userId} in ${tenantId}`,
        email: `${userId}@${tenantId}.com`,
      })

      // User settings
      await table.put({
        pk: PatternHelpers.compositeKey(['TENANT', tenantId, 'USER', userId]),
        sk: 'SETTINGS',
        tenantId,
        userId,
        theme: 'dark',
        notifications: true,
      })
    }
  }

  console.log('✓ Multi-tenant data created')

  // Query tenant-specific data
  console.log('\nQuerying tenant1 users...')
  const tenant1Users = await table.query({
    keyCondition: {
      pk: 'TENANT#tenant1#USER#user1',
    },
  })
  console.log(`✓ Found ${tenant1Users.items.length} items for tenant1`)

  // Query specific user across tenants
  console.log('\nQuerying user1 in tenant2...')
  const user = await table.get({
    pk: PatternHelpers.compositeKey(['TENANT', 'tenant2', 'USER', 'user1']),
    sk: 'PROFILE',
  })
  console.log('✓ User:', user)
}

// Example 5: Adjacency list pattern for relationships
async function adjacencyListExample() {
  console.log('\n=== Adjacency List Pattern ===\n')

  const table = new TableClient({
    tableName: 'social-network',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Create users
  console.log('Creating users...')
  await table.put({
    pk: 'USER#alice',
    sk: 'PROFILE',
    name: 'Alice',
    email: 'alice@example.com',
  })
  await table.put({
    pk: 'USER#bob',
    sk: 'PROFILE',
    name: 'Bob',
    email: 'bob@example.com',
  })
  await table.put({
    pk: 'USER#charlie',
    sk: 'PROFILE',
    name: 'Charlie',
    email: 'charlie@example.com',
  })

  // Create relationships using adjacency list pattern
  console.log('\nCreating relationships...')

  // Alice follows Bob
  const aliceBob = PatternHelpers.adjacencyKeys('USER#alice', 'USER#bob')
  await table.put({
    pk: aliceBob.pk,
    sk: aliceBob.sk,
    relationship: 'FOLLOWS',
    createdAt: new Date().toISOString(),
  })

  // Alice follows Charlie
  const aliceCharlie = PatternHelpers.adjacencyKeys('USER#alice', 'USER#charlie')
  await table.put({
    pk: aliceCharlie.pk,
    sk: aliceCharlie.sk,
    relationship: 'FOLLOWS',
    createdAt: new Date().toISOString(),
  })

  // Bob follows Alice
  const bobAlice = PatternHelpers.adjacencyKeys('USER#bob', 'USER#alice')
  await table.put({
    pk: bobAlice.pk,
    sk: bobAlice.sk,
    relationship: 'FOLLOWS',
    createdAt: new Date().toISOString(),
  })

  console.log('✓ Relationships created')

  // Query: Who does Alice follow?
  console.log('\nQuerying who Alice follows...')
  const aliceFollows = await table.query({
    keyCondition: {
      pk: 'USER#alice',
      sk: { beginsWith: 'USER#' },
    },
  })
  console.log(`✓ Alice follows ${aliceFollows.items.length} users`)

  // Query: Who follows Alice?
  console.log('\nQuerying who follows Alice...')
  const aliceFollowers = await table.query({
    keyCondition: {
      pk: 'USER#alice',
      sk: { beginsWith: 'USER#' },
    },
  })
  console.log(`✓ Alice has ${aliceFollowers.items.length} followers`)
}

// Run all examples
async function main() {
  try {
    await basicSingleTableOperations()
    await queryWithAccessPatterns()
    await patternHelpersExample()
    await multiTenantExample()
    await adjacencyListExample()

    console.log('\n✓ All single-table design examples completed successfully!\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Uncomment to run
// main()

export {
  basicSingleTableOperations,
  queryWithAccessPatterns,
  patternHelpersExample,
  multiTenantExample,
  adjacencyListExample,
}
