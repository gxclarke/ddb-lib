/**
 * Amplify Pattern Helpers Example
 *
 * This example demonstrates how to use pattern helpers and multi-attribute
 * key helpers from @ddb-lib/core with AWS Amplify Gen 2 data client.
 *
 * Requirements: 7.1, 7.2, 7.3
 */

import { AmplifyMonitor, AmplifyHelpers } from '@ddb-lib/amplify'
import { PatternHelpers, multiTenantKey, hierarchicalMultiKey, timeSeriesMultiKey } from '@ddb-lib/core'

/**
 * Example Amplify Schema with Custom Keys
 * 
 * In Amplify Gen 2, you can define custom primary keys:
 * 
 * const schema = a.schema({
 *   Task: a.model({
 *     organizationId: a.string().required(),
 *     taskId: a.string().required(),
 *     title: a.string().required(),
 *     status: a.enum(['TODO', 'IN_PROGRESS', 'DONE']),
 *     assignee: a.string(),
 *   })
 *   .identifier(['organizationId', 'taskId'])
 *   .authorization(allow => [allow.publicApiKey()]),
 * })
 */

// Mock Amplify client
const mockAmplifyClient = {
  models: {
    Task: {
      name: 'Task',
      async get({ organizationId, taskId }: any) {
        return {
          organizationId,
          taskId,
          title: 'Sample Task',
          status: 'TODO',
        }
      },
      async list(options?: any) {
        return [
          { organizationId: 'org-1', taskId: 'task-1', title: 'Task 1' },
          { organizationId: 'org-1', taskId: 'task-2', title: 'Task 2' },
        ]
      },
      async create(data: any) {
        return { ...data, createdAt: new Date().toISOString() }
      },
      async update(data: any) {
        return { ...data, updatedAt: new Date().toISOString() }
      },
      async delete({ organizationId, taskId }: any) {
        console.log(`Deleted task: ${organizationId}/${taskId}`)
      },
    },
  },
}

/**
 * Example 1: Entity Keys with Amplify
 */
async function entityKeyPattern() {
  console.log('\n=== Entity Key Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use entity keys for consistent key structure
  const orgId = 'acme-corp'
  const taskId = '12345'

  console.log('Creating task with entity keys...')
  const task = await monitoredTasks.create({
    organizationId: PatternHelpers.entityKey('ORG', orgId),
    taskId: PatternHelpers.entityKey('TASK', taskId),
    title: 'Implement new feature',
    status: 'TODO',
  })
  console.log('✓ Task created with keys:')
  console.log(`  organizationId: ${task.organizationId}`)
  console.log(`  taskId: ${task.taskId}`)

  // Retrieve using the same pattern
  console.log('\nRetrieving task...')
  const retrieved = await monitoredTasks.get({
    organizationId: PatternHelpers.entityKey('ORG', orgId),
    taskId: PatternHelpers.entityKey('TASK', taskId),
  })
  console.log('✓ Task retrieved:', retrieved?.title)
}

/**
 * Example 2: Composite Keys for Hierarchical Data
 */
async function compositeKeyPattern() {
  console.log('\n=== Composite Key Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use composite keys for hierarchical relationships
  const orgId = 'acme-corp'
  const teamId = 'engineering'
  const projectId = 'project-alpha'
  const taskId = 'task-001'

  console.log('Creating task with composite keys...')
  const task = await monitoredTasks.create({
    // Composite key for organization hierarchy
    organizationId: AmplifyHelpers.amplifyCompositeKey(['ORG', orgId, 'TEAM', teamId, 'PROJECT', projectId]),
    taskId: AmplifyHelpers.amplifyCompositeKey(['TASK', taskId]),
    title: 'Design database schema',
    status: 'IN_PROGRESS',
  })
  console.log('✓ Task created with composite keys:')
  console.log(`  organizationId: ${task.organizationId}`)
  console.log(`  taskId: ${task.taskId}`)

  // Parse composite keys
  console.log('\nParsing composite keys...')
  const orgParts = PatternHelpers.parseCompositeKey(task.organizationId)
  const taskParts = PatternHelpers.parseCompositeKey(task.taskId)
  console.log('✓ Organization hierarchy:', orgParts)
  console.log('✓ Task parts:', taskParts)
}

/**
 * Example 3: Multi-Tenant Keys
 */
async function multiTenantPattern() {
  console.log('\n=== Multi-Tenant Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use multi-tenant keys for SaaS applications
  const tenantId = 'tenant-123'
  const customerId = 'customer-456'
  const departmentId = 'sales'

  console.log('Creating task with multi-tenant key...')
  const multiTenantParts = multiTenantKey(tenantId, customerId, departmentId)

  const task = await monitoredTasks.create({
    organizationId: multiTenantParts.join('#'),
    taskId: PatternHelpers.entityKey('TASK', 'task-001'),
    title: 'Q4 Sales Report',
    status: 'TODO',
  })
  console.log('✓ Task created with multi-tenant key:')
  console.log(`  organizationId: ${task.organizationId}`)
  console.log('✓ Key structure: tenant#customer#department')
}

/**
 * Example 4: Hierarchical Multi-Attribute Keys
 */
async function hierarchicalMultiKeyPattern() {
  console.log('\n=== Hierarchical Multi-Attribute Keys with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use hierarchical multi-keys for nested structures
  const level1 = 'company'
  const level2 = 'division'
  const level3 = 'department'
  const level4 = 'team'

  console.log('Creating task with hierarchical multi-key...')
  const hierarchyParts = hierarchicalMultiKey(level1, level2, level3, level4)

  const task = await monitoredTasks.create({
    organizationId: hierarchyParts.join('#'),
    taskId: PatternHelpers.entityKey('TASK', 'task-001'),
    title: 'Team planning meeting',
    status: 'TODO',
  })
  console.log('✓ Task created with hierarchical key:')
  console.log(`  organizationId: ${task.organizationId}`)
  console.log('✓ Hierarchy levels:', hierarchyParts)
}

/**
 * Example 5: Time Series Keys
 */
async function timeSeriesPattern() {
  console.log('\n=== Time Series Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use time series keys for temporal data
  const projectId = 'project-alpha'
  const timestamp = new Date()

  console.log('Creating task with time series key...')
  const task = await monitoredTasks.create({
    organizationId: PatternHelpers.entityKey('PROJECT', projectId),
    taskId: AmplifyHelpers.amplifyTimeSeriesKey(timestamp, 'day'),
    title: 'Daily standup notes',
    status: 'DONE',
  })
  console.log('✓ Task created with time series key:')
  console.log(`  taskId: ${task.taskId}`)
  console.log('✓ Allows querying tasks by date range')
}

/**
 * Example 6: Time Series Multi-Attribute Keys
 */
async function timeSeriesMultiKeyPattern() {
  console.log('\n=== Time Series Multi-Attribute Keys with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use time series multi-keys for categorized temporal data
  const category = 'SPRINT'
  const timestamp = new Date()
  const subcategory = 'PLANNING'

  console.log('Creating task with time series multi-key...')
  const timeSeriesParts = timeSeriesMultiKey(category, timestamp, subcategory)

  const task = await monitoredTasks.create({
    organizationId: PatternHelpers.entityKey('PROJECT', 'project-alpha'),
    taskId: timeSeriesParts.map(String).join('#'),
    title: 'Sprint planning session',
    status: 'TODO',
  })
  console.log('✓ Task created with time series multi-key:')
  console.log(`  taskId: ${task.taskId}`)
  console.log('✓ Key parts:', timeSeriesParts)
}

/**
 * Example 7: Adjacency List Pattern
 */
async function adjacencyListPattern() {
  console.log('\n=== Adjacency List Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use adjacency keys for relationships
  const taskId = 'task-001'
  const dependsOnTaskId = 'task-002'

  console.log('Creating task dependency relationship...')
  const adjacencyKeys = AmplifyHelpers.amplifyAdjacencyKeys(
    PatternHelpers.entityKey('TASK', taskId),
    PatternHelpers.entityKey('TASK', dependsOnTaskId)
  )

  const dependency = await monitoredTasks.create({
    organizationId: adjacencyKeys.pk,
    taskId: adjacencyKeys.sk,
    title: 'Task dependency',
    status: 'TODO',
  })
  console.log('✓ Dependency created with adjacency keys:')
  console.log(`  pk: ${dependency.organizationId}`)
  console.log(`  sk: ${dependency.taskId}`)
  console.log('✓ Enables querying all dependencies of a task')
}

/**
 * Example 8: Hierarchical Keys for Folder Structure
 */
async function hierarchicalKeyPattern() {
  console.log('\n=== Hierarchical Key Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use hierarchical keys for folder-like structures
  const path = ['projects', 'web-app', 'frontend', 'components']

  console.log('Creating task with hierarchical path...')
  const task = await monitoredTasks.create({
    organizationId: PatternHelpers.entityKey('ORG', 'acme-corp'),
    taskId: AmplifyHelpers.amplifyHierarchicalKey(path),
    title: 'Refactor button component',
    status: 'IN_PROGRESS',
  })
  console.log('✓ Task created with hierarchical path:')
  console.log(`  taskId: ${task.taskId}`)
  console.log('✓ Path structure:', path.join('/'))
}

/**
 * Example 9: Sparse Index Pattern
 */
async function sparseIndexPattern() {
  console.log('\n=== Sparse Index Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use sparse index values for conditional GSI inclusion
  console.log('Creating tasks with sparse index...')

  // High priority task - included in priority index
  const highPriorityTask = await monitoredTasks.create({
    organizationId: PatternHelpers.entityKey('ORG', 'acme-corp'),
    taskId: PatternHelpers.entityKey('TASK', 'task-001'),
    title: 'Critical bug fix',
    status: 'TODO',
    // Only high priority tasks get this attribute
    priorityIndex: AmplifyHelpers.amplifySparseIndex(true, 'HIGH_PRIORITY'),
  })
  console.log('✓ High priority task created')
  console.log(`  priorityIndex: ${highPriorityTask.priorityIndex}`)

  // Normal priority task - excluded from priority index
  const normalTask = await monitoredTasks.create({
    organizationId: PatternHelpers.entityKey('ORG', 'acme-corp'),
    taskId: PatternHelpers.entityKey('TASK', 'task-002'),
    title: 'Update documentation',
    status: 'TODO',
    // Normal tasks don't get the priority index attribute
    priorityIndex: AmplifyHelpers.amplifySparseIndex(false, 'HIGH_PRIORITY'),
  })
  console.log('✓ Normal priority task created')
  console.log(`  priorityIndex: ${normalTask.priorityIndex}`)
  console.log('✓ Sparse index reduces storage and improves query performance')
}

/**
 * Example 10: GSI Key Pattern
 */
async function gsiKeyPattern() {
  console.log('\n=== GSI Key Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use GSI keys for secondary access patterns
  const status = 'IN_PROGRESS'
  const assignee = 'alice@example.com'

  console.log('Creating task with GSI keys...')
  const task = await monitoredTasks.create({
    organizationId: PatternHelpers.entityKey('ORG', 'acme-corp'),
    taskId: PatternHelpers.entityKey('TASK', 'task-001'),
    title: 'Implement authentication',
    status: 'IN_PROGRESS',
    // GSI keys for secondary queries
    statusIndex: AmplifyHelpers.amplifyGSIKey('byStatus', status),
    assigneeIndex: AmplifyHelpers.amplifyGSIKey('byAssignee', assignee),
  })
  console.log('✓ Task created with GSI keys:')
  console.log(`  statusIndex: ${task.statusIndex}`)
  console.log(`  assigneeIndex: ${task.assigneeIndex}`)
  console.log('✓ Enables efficient queries by status or assignee')
}

/**
 * Example 11: Parsing Amplify Keys
 */
async function parseAmplifyKeys() {
  console.log('\n=== Parsing Amplify Keys ===\n')

  // Parse various Amplify key formats
  console.log('Parsing Amplify-generated keys...')

  // Standard Amplify key format
  const key1 = 'Todo#123'
  const parsed1 = AmplifyHelpers.parseAmplifyKey(key1)
  console.log(`\nKey: ${key1}`)
  console.log(`  Model: ${parsed1.modelName}`)
  console.log(`  ID: ${parsed1.id}`)

  // Simple ID format
  const key2 = '456'
  const parsed2 = AmplifyHelpers.parseAmplifyKey(key2)
  console.log(`\nKey: ${key2}`)
  console.log(`  Model: ${parsed2.modelName || '(none)'}`)
  console.log(`  ID: ${parsed2.id}`)

  // Composite key format
  const key3 = 'User#org-123#user-456'
  const parsed3 = AmplifyHelpers.parseAmplifyKey(key3)
  console.log(`\nKey: ${key3}`)
  console.log(`  Model: ${parsed3.modelName}`)
  console.log(`  ID: ${parsed3.id}`)
}

/**
 * Example 12: Distributed Keys for Hot Partitions
 */
async function distributedKeyPattern() {
  console.log('\n=== Distributed Key Pattern with Amplify ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Use distributed keys to avoid hot partitions
  const eventType = 'TASK_CREATED'
  const shardCount = 10

  console.log('Creating events with distributed keys...')
  for (let i = 0; i < 3; i++) {
    const baseKey = PatternHelpers.entityKey('EVENT', eventType)
    const distributedKey = PatternHelpers.distributedKey(baseKey, shardCount)

    const event = await monitoredTasks.create({
      organizationId: distributedKey,
      taskId: PatternHelpers.timeSeriesKey(new Date(), 'hour'),
      title: `Event ${i + 1}`,
      status: 'TODO',
    })
    console.log(`✓ Event ${i + 1} created with distributed key: ${event.organizationId}`)
  }
  console.log('✓ Distributed keys prevent hot partition issues')
}

/**
 * Example 13: Combining Multiple Patterns
 */
async function combinedPatterns() {
  console.log('\n=== Combining Multiple Patterns ===\n')

  const monitor = new AmplifyMonitor()
  const monitoredTasks = monitor.wrap(mockAmplifyClient.models.Task)

  // Real-world example combining multiple patterns
  const tenantId = 'tenant-acme'
  const customerId = 'customer-123'
  const departmentId = 'engineering'
  const timestamp = new Date()
  const priority = 'HIGH'

  console.log('Creating task with combined patterns...')

  // Multi-tenant + hierarchical organization
  const orgKey = multiTenantKey(tenantId, customerId, departmentId).join('#')

  // Time series + entity key for task ID
  const taskKey = AmplifyHelpers.amplifyCompositeKey([
    PatternHelpers.timeSeriesKey(timestamp, 'day'),
    'TASK',
    'sprint-planning',
  ])

  const task = await monitoredTasks.create({
    organizationId: orgKey,
    taskId: taskKey,
    title: 'Sprint planning for Q1',
    status: 'TODO',
    // GSI for priority queries
    priorityIndex: AmplifyHelpers.amplifyGSIKey('byPriority', priority),
    // Sparse index for high priority items
    highPriorityIndex: AmplifyHelpers.amplifySparseIndex(priority === 'HIGH', 'HIGH'),
  })

  console.log('✓ Task created with combined patterns:')
  console.log(`  organizationId: ${task.organizationId}`)
  console.log(`  taskId: ${task.taskId}`)
  console.log(`  priorityIndex: ${task.priorityIndex}`)
  console.log(`  highPriorityIndex: ${task.highPriorityIndex}`)
  console.log('\n✓ Enables multiple access patterns:')
  console.log('  - Query by tenant/customer/department')
  console.log('  - Query by date range')
  console.log('  - Query by priority')
  console.log('  - Efficient high-priority item queries')
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    await entityKeyPattern()
    await compositeKeyPattern()
    await multiTenantPattern()
    await hierarchicalMultiKeyPattern()
    await timeSeriesPattern()
    await timeSeriesMultiKeyPattern()
    await adjacencyListPattern()
    await hierarchicalKeyPattern()
    await sparseIndexPattern()
    await gsiKeyPattern()
    await parseAmplifyKeys()
    await distributedKeyPattern()
    await combinedPatterns()

    console.log('\n✓ All pattern helper examples completed successfully!\n')
  } catch (error) {
    console.error('Error running examples:', error)
    process.exit(1)
  }
}

// Uncomment to run
// main()

export {
  entityKeyPattern,
  compositeKeyPattern,
  multiTenantPattern,
  hierarchicalMultiKeyPattern,
  timeSeriesPattern,
  timeSeriesMultiKeyPattern,
  adjacencyListPattern,
  hierarchicalKeyPattern,
  sparseIndexPattern,
  gsiKeyPattern,
  parseAmplifyKeys,
  distributedKeyPattern,
  combinedPatterns,
}
