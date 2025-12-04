---
title: Amplify Quick Start
description: Get started with ddb-lib in an AWS Amplify Gen 2 application
---

This guide will help you integrate ddb-lib with your AWS Amplify Gen 2 application to add monitoring, statistics, and pattern helpers to your Amplify Data operations.

## Prerequisites

- Node.js >= 18.0.0
- Existing Amplify Gen 2 project
- Amplify CLI installed (`npm install -g @aws-amplify/cli`)

## Installation

Install the Amplify integration package:

```bash
# Amplify integration (includes core and stats)
npm install @ddb-lib/amplify

# Amplify Gen 2 dependencies (if not already installed)
npm install aws-amplify @aws-amplify/backend
```

## Define your schema

First, define your Amplify Gen 2 schema:

**amplify/data/resource.ts**

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
  Todo: a.model({
    title: a.string().required(),
    description: a.string(),
    completed: a.boolean().default(false),
    priority: a.enum(['LOW', 'MEDIUM', 'HIGH']),
    dueDate: a.date(),
  }).authorization(allow => [allow.publicApiKey()]),
  
  User: a.model({
    name: a.string().required(),
    email: a.string().required(),
    status: a.enum(['ACTIVE', 'INACTIVE']),
  }).authorization(allow => [allow.publicApiKey()]),
})

export type Schema = ClientSchema<typeof schema>
export const data = defineData({ schema })
```

## Basic setup with monitoring

Wrap your Amplify models with AmplifyMonitor to enable statistics collection:

**Setup AmplifyMonitor**

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import type { Schema } from './amplify/data/resource'

// Create Amplify client
const amplifyClient = generateClient<Schema>()

// Create monitor
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
})

// Wrap your models
const Todo = monitor.wrap(amplifyClient.models.Todo)
const User = monitor.wrap(amplifyClient.models.User)

// Now use Todo and User instead of amplifyClient.models.Todo
```

## CRUD operations with monitoring

All operations are automatically monitored:

### Create

**Create Item**

```typescript
const newTodo = await Todo.create({
  title: 'Buy groceries',
  description: 'Milk, eggs, bread',
  completed: false,
  priority: 'HIGH',
})

console.log('Created:', newTodo.data)
```

### Read

**Get Item**

```typescript
// Get single item
const todo = await Todo.get({ id: newTodo.data.id })
console.log('Todo:', todo.data)

// List all items
const todos = await Todo.list()
console.log('All todos:', todos.data)

// List with filter
const highPriority = await Todo.list({
  filter: { priority: { eq: 'HIGH' } }
})
```

### Update

**Update Item**

```typescript
const updated = await Todo.update({
  id: newTodo.data.id,
  completed: true,
})

console.log('Updated:', updated.data)
```

### Delete

**Delete Item**

```typescript
await Todo.delete({ id: newTodo.data.id })
console.log('Deleted')
```

## View statistics

Get insights into your Amplify Data operations:

**Get Statistics**

```typescript
// Perform some operations
await Todo.create({ title: 'Task 1' })
await Todo.create({ title: 'Task 2' })
await Todo.list()

// Get statistics
const stats = monitor.getStats()

// Total operations
const totalOps = Object.values(stats.operations)
  .reduce((sum, op) => sum + op.count, 0)
console.log('Total operations:', totalOps)

// Per-operation stats
for (const [opType, opStats] of Object.entries(stats.operations)) {
  console.log(`${opType}:`)
  console.log(`  Count: ${opStats.count}`)
  console.log(`  Avg latency: ${opStats.avgLatencyMs.toFixed(2)}ms`)
}
```

## Get recommendations

Receive optimization suggestions:

**Get Recommendations**

```typescript
const recommendations = monitor.getRecommendations()

recommendations.forEach(rec => {
  console.log(`[${rec.severity}] ${rec.category}`)
  console.log(`  ${rec.message}`)
  if (rec.suggestedAction) {
    console.log(`  Action: ${rec.suggestedAction}`)
  }
})
```

## Using pattern helpers

Use pattern helpers to construct consistent keys for custom identifiers:

**Pattern Helpers with Amplify**

```typescript
import { PatternHelpers, AmplifyHelpers } from '@ddb-lib/amplify'

// For models with custom identifiers
const schema = a.schema({
  Task: a.model({
    organizationId: a.string().required(),
    taskId: a.string().required(),
    title: a.string().required(),
  })
  .identifier(['organizationId', 'taskId'])
  .authorization(allow => [allow.publicApiKey()]),
})

// Use pattern helpers for keys
const Task = monitor.wrap(amplifyClient.models.Task)

await Task.create({
  organizationId: PatternHelpers.entityKey('ORG', 'acme'),
  taskId: PatternHelpers.entityKey('TASK', '12345'),
  title: 'Implement feature',
})

// Composite keys for hierarchical data
await Task.create({
  organizationId: AmplifyHelpers.amplifyCompositeKey([
    'ORG', 'acme',
    'TEAM', 'engineering'
  ]),
  taskId: PatternHelpers.entityKey('TASK', '12345'),
  title: 'Team task',
})

// Time series keys
await Task.create({
  organizationId: PatternHelpers.entityKey('ORG', 'acme'),
  taskId: AmplifyHelpers.amplifyTimeSeriesKey(new Date(), 'day'),
  title: 'Daily report',
})
```

## Multi-tenant pattern

Implement multi-tenancy with pattern helpers:

**Multi-Tenant Keys**

```typescript
import { multiTenantKey } from '@ddb-lib/core'

const schema = a.schema({
  Document: a.model({
    tenantKey: a.string().required(),
    documentId: a.string().required(),
    title: a.string().required(),
  })
  .identifier(['tenantKey', 'documentId'])
  .authorization(allow => [allow.publicApiKey()]),
})

const Document = monitor.wrap(amplifyClient.models.Document)

// Create document with multi-tenant key
const tenantParts = multiTenantKey('tenant-123', 'customer-456', 'dept-sales')

await Document.create({
  tenantKey: tenantParts.join('#'),
  documentId: PatternHelpers.entityKey('DOC', 'report-q4'),
  title: 'Q4 Sales Report',
})

// Query documents for a tenant
const docs = await Document.list({
  filter: { tenantKey: { eq: tenantParts.join('#') } }
})
```

## Complete example

Here's a complete React component with monitoring:

**React Component with Monitoring**

```typescript
import { useEffect, useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import type { Schema } from './amplify/data/resource'

// Setup (do this once, outside component or in a context)
const amplifyClient = generateClient<Schema>()
const monitor = new AmplifyMonitor({ statsConfig: { enabled: true } })
const Todo = monitor.wrap(amplifyClient.models.Todo)

function TodoList() {
  const [todos, setTodos] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadTodos()
  }, [])

  async function loadTodos() {
    const result = await Todo.list()
    setTodos(result.data)
    
    // Update stats
    setStats(monitor.getStats())
  }

  async function createTodo(title: string) {
    await Todo.create({
      title,
      completed: false,
      priority: 'MEDIUM',
    })
    await loadTodos()
  }

  async function toggleTodo(id: string, completed: boolean) {
    await Todo.update({ id, completed: !completed })
    await loadTodos()
  }

  async function deleteTodo(id: string) {
    await Todo.delete({ id })
    await loadTodos()
  }

  return (
    
      <h1>Todos</h1>
      
      {/* Todo list */}
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id, todo.completed)}
            />
            {todo.title}
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      {/* Add todo */}
      <button onClick={() => createTodo('New task')}>
        Add Todo
      </button>

      {/* Statistics */}
      {stats && (
        
          <h2>Statistics</h2>
          <p>Total operations: {
            Object.values(stats.operations)
              .reduce((sum, op) => sum + op.count, 0)
          }</p>
        
      )}
    
  )
}

export default TodoList
```

## Sampling for production

In production, use sampling to reduce overhead:

**Production Configuration**

```typescript
const monitor = new AmplifyMonitor({
  statsConfig: {
    enabled: true,
    sampleRate: 0.1, // Monitor only 10% of operations
    thresholds: {
      slowQueryMs: 100,
      highRCU: 100,
      highWCU: 100,
    },
  },
})
```

## Exporting statistics

Export statistics for external analysis:

**Export Statistics**

```typescript
// Get raw operation data
const rawData = monitor.export()

// Send to logging service
await sendToCloudWatch(rawData)

// Or save to file
import fs from 'fs'
fs.writeFileSync('stats.json', JSON.stringify(rawData, null, 2))

// Reset after export
monitor.reset()
```

## Next steps

- Learn about [Pattern Helpers](../guides/multi-attribute-keys/) for advanced key structures
- Explore [Amplify Examples](../examples/amplify/) for more complex scenarios
- Review [Best Practices](../best-practices/) for optimal performance
- Check out [Monitoring Guide](../guides/monitoring/) for detailed statistics usage

## Troubleshooting

### Monitor not recording operations

Make sure you're using the wrapped model:



### TypeScript errors

Ensure you have the correct types:

```typescript
import type { Schema } from './amplify/data/resource'
const client = generateClient<Schema>()
```

### Statistics show zero operations

Check that monitoring is enabled:

```typescript
console.log('Monitoring enabled:', monitor.isEnabled())
```

!!! info "Need Help?"
    Check out the [Amplify examples](../examples/amplify/) or visit the [GitHub repository](https://github.com/gxclarke/ddb-lib) for more information.
