/**
 * Basic Amplify Usage Example
 *
 * This example demonstrates how to set up and use AmplifyMonitor with
 * AWS Amplify Gen 2 data client for basic CRUD operations.
 *
 * Requirements: 7.1, 7.2, 7.3
 */

import { AmplifyMonitor } from '@ddb-lib/amplify'

/**
 * Example Amplify Gen 2 Schema
 * 
 * In a real Amplify Gen 2 project, you would define your schema like:
 * 
 * // amplify/data/resource.ts
 * import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
 * 
 * const schema = a.schema({
 *   Todo: a.model({
 *     title: a.string().required(),
 *     description: a.string(),
 *     completed: a.boolean().default(false),
 *     priority: a.enum(['LOW', 'MEDIUM', 'HIGH']),
 *     dueDate: a.date(),
 *   }).authorization(allow => [allow.publicApiKey()]),
 * })
 * 
 * export type Schema = ClientSchema<typeof schema>
 */

// Mock Amplify client for demonstration purposes
// In a real application, you would use: import { generateClient } from 'aws-amplify/data'
const mockAmplifyClient = {
  models: {
    Todo: {
      name: 'Todo',
      async get({ id }: { id: string }) {
        // Simulates Amplify's get operation
        return {
          id,
          title: 'Sample Todo',
          description: 'This is a sample todo item',
          completed: false,
          priority: 'MEDIUM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      },
      async list(options?: any) {
        // Simulates Amplify's list operation
        return [
          {
            id: '1',
            title: 'First Todo',
            completed: false,
            priority: 'HIGH',
          },
          {
            id: '2',
            title: 'Second Todo',
            completed: true,
            priority: 'LOW',
          },
        ]
      },
      async create(data: any) {
        // Simulates Amplify's create operation
        return {
          id: Math.random().toString(36).substring(7),
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      },
      async update({ id, ...data }: any) {
        // Simulates Amplify's update operation
        return {
          id,
          ...data,
          updatedAt: new Date().toISOString(),
        }
      },
      async delete({ id }: { id: string }) {
        // Simulates Amplify's delete operation
        console.log(`Deleted todo with id: ${id}`)
      },
    },
  },
}

/**
 * Example 1: Basic Setup and Wrapping
 */
async function basicSetup() {
  console.log('\n=== Basic AmplifyMonitor Setup ===\n')

  // Step 1: Create AmplifyMonitor instance
  console.log('Step 1: Creating AmplifyMonitor...')
  const monitor = new AmplifyMonitor({
    statsConfig: {
      enabled: true,
      sampleRate: 1.0, // Monitor 100% of operations
      thresholds: {
        slowQueryMs: 100,
        highRCU: 50,
        highWCU: 50,
      },
    },
    enableAutoInstrumentation: true,
  })
  console.log('✓ AmplifyMonitor created')

  // Step 2: Wrap the Amplify model
  console.log('\nStep 2: Wrapping Amplify Todo model...')
  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)
  console.log('✓ Todo model wrapped with monitoring')

  // Step 3: Use the wrapped model normally
  console.log('\nStep 3: Using wrapped model for operations...')
  console.log('All operations are automatically monitored!\n')

  return { monitor, monitoredTodos }
}

/**
 * Example 2: CRUD Operations with Monitoring
 */
async function crudOperations() {
  console.log('\n=== CRUD Operations with Monitoring ===\n')

  const { monitor, monitoredTodos } = await basicSetup()

  // CREATE
  console.log('Creating a new todo...')
  const newTodo = await monitoredTodos.create({
    title: 'Buy groceries',
    description: 'Milk, eggs, bread',
    completed: false,
    priority: 'HIGH',
  })
  console.log('✓ Todo created:', newTodo.id)

  // READ (get single item)
  console.log('\nGetting todo by ID...')
  const todo = await monitoredTodos.get(newTodo.id)
  console.log('✓ Todo retrieved:', todo?.title)

  // READ (list items)
  console.log('\nListing all todos...')
  const todos = await monitoredTodos.list()
  console.log(`✓ Retrieved ${todos.length} todos`)

  // UPDATE
  console.log('\nUpdating todo...')
  const updated = await monitoredTodos.update(newTodo.id, {
    completed: true,
    description: 'Milk, eggs, bread, cheese',
  })
  console.log('✓ Todo updated:', updated.id)

  // DELETE
  console.log('\nDeleting todo...')
  await monitoredTodos.delete(newTodo.id)
  console.log('✓ Todo deleted')

  // View statistics
  console.log('\n--- Operation Statistics ---')
  const stats = monitor.getStats()
  const totalOps = Object.values(stats.operations).reduce((sum: number, op: any) => sum + op.count, 0)
  console.log('Total operations:', totalOps)
  console.log('Operations breakdown:')
  for (const [opType, opStats] of Object.entries(stats.operations)) {
    const op = opStats as any
    console.log(`  ${opType}: ${op.count} operations, avg ${op.avgLatencyMs.toFixed(2)}ms`)
  }
}

/**
 * Example 3: Working with Multiple Models
 */
async function multipleModels() {
  console.log('\n=== Working with Multiple Models ===\n')

  // Create a single monitor for all models
  const monitor = new AmplifyMonitor({
    statsConfig: { enabled: true },
  })

  // Mock additional models
  const mockUserModel = {
    name: 'User',
    async get({ id }: { id: string }) {
      return { id, name: 'Alice', email: 'alice@example.com' }
    },
    async list() {
      return [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]
    },
    async create(data: any) {
      return { id: '123', ...data }
    },
    async update({ id, ...data }: any) {
      return { id, ...data }
    },
    async delete({ id }: { id: string }) {
      console.log(`Deleted user: ${id}`)
    },
  }

  // Wrap multiple models with the same monitor
  console.log('Wrapping multiple models...')
  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)
  const monitoredUsers = monitor.wrap(mockUserModel)
  console.log('✓ Both Todo and User models wrapped')

  // Perform operations on different models
  console.log('\nPerforming operations on Todo model...')
  await monitoredTodos.create({ title: 'Task 1' })
  await monitoredTodos.list()

  console.log('\nPerforming operations on User model...')
  await monitoredUsers.create({ name: 'Charlie', email: 'charlie@example.com' })
  await monitoredUsers.get('123')

  // View combined statistics
  console.log('\n--- Combined Statistics ---')
  const stats = monitor.getStats()
  const totalOps = Object.values(stats.operations).reduce((sum: number, op: any) => sum + op.count, 0)
  console.log('Total operations across all models:', totalOps)
}

/**
 * Example 4: Accessing Unwrapped Model
 */
async function unwrappedAccess() {
  console.log('\n=== Accessing Unwrapped Model ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Sometimes you might need the original model
  console.log('Getting unwrapped model...')
  const originalModel = monitoredTodos.unwrap()
  console.log('✓ Original model accessed')

  // Operations on unwrapped model are NOT monitored
  console.log('\nUsing unwrapped model (not monitored)...')
  await originalModel.get({ id: '123' })

  const stats = monitor.getStats()
  const totalOps = Object.values(stats.operations).reduce((sum: number, op: any) => sum + op.count, 0)
  console.log('Operations monitored:', totalOps)
  console.log('(Should be 0 since we used unwrapped model)')
}

/**
 * Example 5: Disabling and Re-enabling Monitoring
 */
async function toggleMonitoring() {
  console.log('\n=== Toggle Monitoring ===\n')

  // Create monitor with monitoring disabled
  const monitor = new AmplifyMonitor({
    statsConfig: { enabled: false },
  })

  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  console.log('Monitoring enabled:', monitor.isEnabled())

  // Operations still work, but aren't monitored
  console.log('\nPerforming operations with monitoring disabled...')
  await monitoredTodos.create({ title: 'Task 1' })
  await monitoredTodos.list()

  const stats = monitor.getStats()
  console.log('Operations recorded:',
    Object.values(stats.operations).reduce((sum, op) => sum + op.count, 0))
}

/**
 * Example 6: Resetting Statistics
 */
async function resetStats() {
  console.log('\n=== Resetting Statistics ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Perform some operations
  console.log('Performing operations...')
  await monitoredTodos.create({ title: 'Task 1' })
  await monitoredTodos.create({ title: 'Task 2' })
  await monitoredTodos.list()

  let stats = monitor.getStats()
  console.log('Operations before reset:',
    Object.values(stats.operations).reduce((sum, op) => sum + op.count, 0))

  // Reset statistics
  console.log('\nResetting statistics...')
  monitor.reset()

  stats = monitor.getStats()
  console.log('Operations after reset:',
    Object.values(stats.operations).reduce((sum, op) => sum + op.count, 0))
}

/**
 * Example 7: Exporting Raw Data
 */
async function exportData() {
  console.log('\n=== Exporting Raw Operation Data ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTodos = monitor.wrap(mockAmplifyClient.models.Todo)

  // Perform operations
  console.log('Performing operations...')
  await monitoredTodos.create({ title: 'Task 1' })
  await monitoredTodos.get('123')
  await monitoredTodos.list()

  // Export raw data
  console.log('\nExporting raw operation data...')
  const rawData = monitor.export()
  console.log(`✓ Exported ${rawData.length} operation records`)
  console.log('\nSample operation record:')
  console.log(JSON.stringify(rawData[0], null, 2))
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    await basicSetup()
    await crudOperations()
    await multipleModels()
    await unwrappedAccess()
    await toggleMonitoring()
    await resetStats()
    await exportData()

    console.log('\n✓ All basic Amplify usage examples completed successfully!\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Uncomment to run
// main()

export {
  basicSetup,
  crudOperations,
  multipleModels,
  unwrappedAccess,
  toggleMonitoring,
  resetStats,
  exportData,
}
