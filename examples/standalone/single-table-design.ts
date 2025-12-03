/**
 * Single-Table Design Example - Standalone Mode
 *
 * This example demonstrates how to implement single-table design patterns
 * using @ddb-lib/client with access patterns and pattern helpers from @ddb-lib/core.
 *
 * Requirements: 7.2, 7.3
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient, type AccessPatternDefinitions } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

// Define entity types for an e-commerce application
interface User {
  pk: string // USER#<userId>
  sk: string // PROFILE
  userId: string
  name: string
  email: string
  createdAt: string
}

interface Order {
  pk: string // USER#<userId>
  sk: string // ORDER#<orderId>
  orderId: string
  userId: string
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

type Entity = User | Order | Product

/**
 * Example 1: Define Access Patterns
 */
function defineAccessPatterns(): AccessPatternDefinitions<Entity> {
  return {
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
}

/**
 * Example 2: Populate Single Table with Multiple Entity Types
 */
async function populateSingleTable() {
  console.log('\n=== Populate Single Table ===\n')

  const accessPatterns = defineAccessPatterns()

  const client = new TableClient<Entity>({
    tableName: 'ecommerce-app',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000', // DynamoDB Local
    }),
    accessPatterns,
  })

  // Create a user
  console.log('Creating user...')
  const user: User = {
    pk: PatternHelpers.entityKey('USER', 'user-123'),
    sk: 'PROFILE',
    userId: 'user-123',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    createdAt: new Date().toISOString(),
  }
  await client.put(user)
  console.log('✓ User created:', user.pk)

  // Create products
  console.log('\nCreating products...')
  const products: Product[] = [
    {
      pk: PatternHelpers.entityKey('PRODUCT', 'laptop-001'),
      sk: 'METADATA',
      productId: 'laptop-001',
      name: 'Professional Laptop',
      category: 'electronics',
      price: 1299.99,
      stock: 25,
      gsi1pk: PatternHelpers.entityKey('CATEGORY', 'electronics'),
      gsi1sk: PatternHelpers.entityKey('PRODUCT', 'laptop-001'),
    },
    {
      pk: PatternHelpers.entityKey('PRODUCT', 'mouse-001'),
      sk: 'METADATA',
      productId: 'mouse-001',
      name: 'Wireless Mouse',
      category: 'electronics',
      price: 49.99,
      stock: 150,
      gsi1pk: PatternHelpers.entityKey('CATEGORY', 'electronics'),
      gsi1sk: PatternHelpers.entityKey('PRODUCT', 'mouse-001'),
    },
    {
      pk: PatternHelpers.entityKey('PRODUCT', 'desk-001'),
      sk: 'METADATA',
      productId: 'desk-001',
      name: 'Standing Desk',
      category: 'furniture',
      price: 599.99,
      stock: 10,
      gsi1pk: PatternHelpers.entityKey('CATEGORY', 'furniture'),
      gsi1sk: PatternHelpers.entityKey('PRODUCT', 'desk-001'),
    },
  ]

  for (const product of products) {
    await client.put(product)
    console.log(`✓ Product created: ${product.name}`)
  }

  // Create orders
  console.log('\nCreating orders...')
  const orders: Order[] = [
    {
      pk: PatternHelpers.entityKey('USER', 'user-123'),
      sk: PatternHelpers.entityKey('ORDER', 'order-001'),
      orderId: 'order-001',
      userId: 'user-123',
      status: 'COMPLETED',
      total: 1299.99,
      createdAt: '2025-12-01T10:00:00Z',
      gsi1pk: PatternHelpers.entityKey('STATUS', 'COMPLETED'),
      gsi1sk: '2025-12-01T10:00:00Z',
    },
    {
      pk: PatternHelpers.entityKey('USER', 'user-123'),
      sk: PatternHelpers.entityKey('ORDER', 'order-002'),
      orderId: 'order-002',
      userId: 'user-123',
      status: 'PENDING',
      total: 649.98,
      createdAt: '2025-12-03T14:30:00Z',
      gsi1pk: PatternHelpers.entityKey('STATUS', 'PENDING'),
      gsi1sk: '2025-12-03T14:30:00Z',
    },
  ]

  for (const order of orders) {
    await client.put(order)
    console.log(`✓ Order created: ${order.orderId} (${order.status})`)
  }

  console.log('\n✓ Single table populated with multiple entity types')
}

/**
 * Example 3: Query Using Access Patterns
 */
async function queryWithAccessPatterns() {
  console.log('\n=== Query Using Access Patterns ===\n')

  const accessPatterns = defineAccessPatterns()

  const client = new TableClient<Entity>({
    tableName: 'ecommerce-app',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
    accessPatterns,
  })

  // Get user by ID
  console.log('Getting user by ID...')
  const users = await client.executePattern<User>('getUserById', { userId: 'user-123' })
  console.log('✓ User found:', users[0]?.name)

  // Get all orders for a user
  console.log('\nGetting user orders...')
  const userOrders = await client.executePattern<Order>('getUserOrders', {
    userId: 'user-123',
  })
  console.log(`✓ Found ${userOrders.length} orders for user`)
  for (const order of userOrders) {
    console.log(`  - Order ${order.orderId}: $${order.total} (${order.status})`)
  }

  // Get specific order
  console.log('\nGetting specific order...')
  const order = await client.executePattern<Order>('getOrderById', {
    userId: 'user-123',
    orderId: 'order-001',
  })
  console.log('✓ Order found:', order[0]?.orderId)

  // Get orders by status using GSI
  console.log('\nGetting completed orders (using GSI)...')
  const completedOrders = await client.executePattern<Order>('getOrdersByStatus', {
    status: 'COMPLETED',
  })
  console.log(`✓ Found ${completedOrders.length} completed orders`)

  // Get products by category using GSI
  console.log('\nGetting electronics products (using GSI)...')
  const electronics = await client.executePattern<Product>('getProductsByCategory', {
    category: 'electronics',
  })
  console.log(`✓ Found ${electronics.length} electronics products`)
  for (const product of electronics) {
    console.log(`  - ${product.name}: $${product.price}`)
  }
}

/**
 * Example 4: Multi-Tenant Single-Table Design
 */
async function multiTenantSingleTable() {
  console.log('\n=== Multi-Tenant Single-Table Design ===\n')

  const client = new TableClient({
    tableName: 'multi-tenant-app',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Create items for multiple tenants using composite keys
  console.log('Creating multi-tenant data...')

  const tenants = ['acme-corp', 'globex-inc']
  const users = ['alice', 'bob']

  for (const tenantId of tenants) {
    for (const userId of users) {
      // User profile
      const profileKey = {
        pk: PatternHelpers.compositeKey(['TENANT', tenantId, 'USER', userId]),
        sk: 'PROFILE',
      }

      await client.put({
        ...profileKey,
        tenantId,
        userId,
        name: `${userId} at ${tenantId}`,
        email: `${userId}@${tenantId}.com`,
        createdAt: new Date().toISOString(),
      })

      console.log(`✓ Created profile for ${userId} in ${tenantId}`)

      // User settings
      const settingsKey = {
        pk: PatternHelpers.compositeKey(['TENANT', tenantId, 'USER', userId]),
        sk: 'SETTINGS',
      }

      await client.put({
        ...settingsKey,
        tenantId,
        userId,
        theme: 'dark',
        notifications: true,
        language: 'en',
      })
    }
  }

  console.log('\n✓ Multi-tenant data created')

  // Query tenant-specific data
  console.log('\nQuerying acme-corp users...')
  const acmeUsers = await client.query({
    keyCondition: {
      pk: PatternHelpers.compositeKey(['TENANT', 'acme-corp', 'USER', 'alice']),
    },
  })
  console.log(`✓ Found ${acmeUsers.items.length} items for alice@acme-corp`)

  // Parse composite keys
  const sampleKey = PatternHelpers.compositeKey(['TENANT', 'acme-corp', 'USER', 'alice'])
  const parts = PatternHelpers.parseCompositeKey(sampleKey)
  console.log('✓ Parsed composite key:', parts)
}

/**
 * Example 5: Hierarchical Data with Pattern Helpers
 */
async function hierarchicalDataExample() {
  console.log('\n=== Hierarchical Data Example ===\n')

  const client = new TableClient({
    tableName: 'org-hierarchy',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Create hierarchical organization structure
  console.log('Creating hierarchical organization data...')

  const orgId = 'org-001'
  const deptId = 'engineering'
  const teamId = 'backend'
  const memberId = 'alice'

  // Organization
  await client.put({
    pk: PatternHelpers.hierarchicalKey([orgId]),
    sk: 'METADATA',
    orgId,
    name: 'Tech Corp',
    type: 'organization',
  })

  // Department
  await client.put({
    pk: PatternHelpers.hierarchicalKey([orgId, deptId]),
    sk: 'METADATA',
    orgId,
    deptId,
    name: 'Engineering Department',
    type: 'department',
  })

  // Team
  await client.put({
    pk: PatternHelpers.hierarchicalKey([orgId, deptId, teamId]),
    sk: 'METADATA',
    orgId,
    deptId,
    teamId,
    name: 'Backend Team',
    type: 'team',
  })

  // Team member
  await client.put({
    pk: PatternHelpers.hierarchicalKey([orgId, deptId, teamId]),
    sk: PatternHelpers.entityKey('MEMBER', memberId),
    orgId,
    deptId,
    teamId,
    memberId,
    name: 'Alice Johnson',
    role: 'Senior Engineer',
    type: 'member',
  })

  console.log('✓ Hierarchical data created')

  // Query all items in a team
  console.log('\nQuerying backend team...')
  const teamItems = await client.query({
    keyCondition: {
      pk: PatternHelpers.hierarchicalKey([orgId, deptId, teamId]),
    },
  })
  console.log(`✓ Found ${teamItems.items.length} items in backend team`)

  // Parse hierarchical key
  const hierarchicalKey = PatternHelpers.hierarchicalKey([orgId, deptId, teamId])
  const hierarchy = PatternHelpers.parseHierarchicalKey(hierarchicalKey)
  console.log('✓ Parsed hierarchy:', hierarchy)
}

/**
 * Example 6: Time-Series Data Pattern
 */
async function timeSeriesDataExample() {
  console.log('\n=== Time-Series Data Pattern ===\n')

  const client = new TableClient({
    tableName: 'sensor-data',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  const sensorId = 'sensor-001'

  // Create time-series sensor readings
  console.log('Creating time-series sensor readings...')

  const baseTime = new Date('2025-12-03T10:00:00Z')
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 3600000) // Each hour

    await client.put({
      pk: PatternHelpers.entityKey('SENSOR', sensorId),
      sk: PatternHelpers.timeSeriesKey(timestamp, 'hour'),
      sensorId,
      temperature: 20 + Math.random() * 10,
      humidity: 40 + Math.random() * 20,
      timestamp: timestamp.toISOString(),
    })

    console.log(`✓ Reading created for ${timestamp.toISOString()}`)
  }

  // Query readings for a specific time range
  console.log('\nQuerying sensor readings...')
  const readings = await client.query({
    keyCondition: {
      pk: PatternHelpers.entityKey('SENSOR', sensorId),
      sk: { beginsWith: '2025-12-03' },
    },
  })
  console.log(`✓ Found ${readings.items.length} readings for sensor`)
}

/**
 * Example 7: Adjacency List for Relationships
 */
async function adjacencyListExample() {
  console.log('\n=== Adjacency List Pattern ===\n')

  const client = new TableClient({
    tableName: 'social-graph',
    client: new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
    }),
  })

  // Create users
  console.log('Creating users...')
  const userIds = ['alice', 'bob', 'charlie']

  for (const userId of userIds) {
    await client.put({
      pk: PatternHelpers.entityKey('USER', userId),
      sk: 'PROFILE',
      userId,
      name: userId.charAt(0).toUpperCase() + userId.slice(1),
      email: `${userId}@example.com`,
    })
  }
  console.log('✓ Users created')

  // Create relationships using adjacency pattern
  console.log('\nCreating relationships...')

  // Alice follows Bob and Charlie
  const aliceBob = PatternHelpers.adjacencyKeys(
    PatternHelpers.entityKey('USER', 'alice'),
    PatternHelpers.entityKey('USER', 'bob'),
  )
  await client.put({
    ...aliceBob,
    relationship: 'FOLLOWS',
    createdAt: new Date().toISOString(),
  })

  const aliceCharlie = PatternHelpers.adjacencyKeys(
    PatternHelpers.entityKey('USER', 'alice'),
    PatternHelpers.entityKey('USER', 'charlie'),
  )
  await client.put({
    ...aliceCharlie,
    relationship: 'FOLLOWS',
    createdAt: new Date().toISOString(),
  })

  // Bob follows Alice
  const bobAlice = PatternHelpers.adjacencyKeys(
    PatternHelpers.entityKey('USER', 'bob'),
    PatternHelpers.entityKey('USER', 'alice'),
  )
  await client.put({
    ...bobAlice,
    relationship: 'FOLLOWS',
    createdAt: new Date().toISOString(),
  })

  console.log('✓ Relationships created')

  // Query: Who does Alice follow?
  console.log('\nQuerying who Alice follows...')
  const aliceFollows = await client.query({
    keyCondition: {
      pk: PatternHelpers.entityKey('USER', 'alice'),
      sk: { beginsWith: 'USER#' },
    },
  })
  console.log(`✓ Alice follows ${aliceFollows.items.length} users`)
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    await populateSingleTable()
    await queryWithAccessPatterns()
    await multiTenantSingleTable()
    await hierarchicalDataExample()
    await timeSeriesDataExample()
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
  defineAccessPatterns,
  populateSingleTable,
  queryWithAccessPatterns,
  multiTenantSingleTable,
  hierarchicalDataExample,
  timeSeriesDataExample,
  adjacencyListExample,
}
