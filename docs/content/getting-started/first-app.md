---
title: "First Application"
description: "Build your first application with ddb-lib"
weight: 40
---

# Build Your First Application

Complete tutorial for building a todo application.

## What We'll Build

A simple todo application with:
- Create todos
- List todos  
- Update todo status
- Delete todos
- Performance monitoring

## Setup

```bash
npm install @ddb-lib/client
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Complete Code

```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'todos',
  region: 'us-east-1',
  statsConfig: { enabled: true }
})

// Create todo
async function createTodo(userId: string, title: string) {
  const todoId = crypto.randomUUID()
  const userKey = PatternHelpers.entityKey('USER', userId)
  const todoKey = PatternHelpers.entityKey('TODO', todoId)
  
  await table.put({
    pk: userKey,
    sk: todoKey,
    title,
    completed: false,
    createdAt: new Date().toISOString()
  })
  
  return todoId
}

// List todos
async function listTodos(userId: string) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  
  const result = await table.query({
    keyCondition: {
      pk: userKey,
      sk: { beginsWith: 'TODO#' }
    }
  })
  
  return result.items
}

// Update todo
async function updateTodo(userId: string, todoId: string, completed: boolean) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  const todoKey = PatternHelpers.entityKey('TODO', todoId)
  
  await table.update(
    { pk: userKey, sk: todoKey },
    { completed }
  )
}

// Delete todo
async function deleteTodo(userId: string, todoId: string) {
  const userKey = PatternHelpers.entityKey('USER', userId)
  const todoKey = PatternHelpers.entityKey('TODO', todoId)
  
  await table.delete({ pk: userKey, sk: todoKey })
}

// Get recommendations
async function getRecommendations() {
  return table.getRecommendations()
}
```

## Next Steps

- [Explore Patterns](../../patterns/)
- [Learn Best Practices](../../best-practices/)
- [View More Examples](../../examples/)
