---
title: Build Your First Application
description: Complete tutorial for building a task management application with ddb-lib
---

In this tutorial, you'll build a complete task management application using ddb-lib. You'll learn how to implement single-table design, use pattern helpers, and monitor performance.

## What you'll build

A task management system with:
- Users and their profiles
- Tasks with assignments and priorities
- Projects to organize tasks
- Activity tracking
- Performance monitoring

## Prerequisites

- Node.js >= 18.0.0
- DynamoDB Local or AWS account
- Basic TypeScript knowledge

## Step 1: project setup

Create a new project:

**Initialize Project**

```bash
mkdir task-manager
cd task-manager
npm init -y
npm install typescript @types/node tsx --save-dev
npm install @ddb-lib/core @ddb-lib/client @ddb-lib/stats
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npx tsc --init
```

## Step 2: define your data model

Create the data model for your application:

**src/types.ts**

```typescript
export interface User {
  pk: string // USER#<userId>
  sk: string // PROFILE
  userId: string
  name: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  createdAt: string
}

export interface Task {
  pk: string // PROJECT#<projectId>
  sk: string // TASK#<taskId>
  taskId: string
  projectId: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  assigneeId?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  // GSI1: STATUS#<status> / <dueDate>
  gsi1pk?: string
  gsi1sk?: string
  // GSI2: USER#<assigneeId> / TASK#<taskId>
  gsi2pk?: string
  gsi2sk?: string
}

export interface Project {
  pk: string // PROJECT#<projectId>
  sk: string // METADATA
  projectId: string
  name: string
  description?: string
  ownerId: string
  status: 'ACTIVE' | 'ARCHIVED'
  createdAt: string
}

export interface Activity {
  pk: string // USER#<userId>
  sk: string // ACTIVITY#<timestamp>
  userId: string
  action: string
  entityType: string
  entityId: string
  timestamp: string
}
```

## Step 3: create the table client

Set up the TableClient with access patterns:

**src/db.ts**

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'
import type { AccessPatternDefinitions } from '@ddb-lib/client'

const accessPatterns: AccessPatternDefinitions = {
  // User patterns
  getUserById: {
    keyCondition: (params: { userId: string }) => ({
      pk: PatternHelpers.entityKey('USER', params.userId),
      sk: 'PROFILE',
    }),
  },

  getUserActivities: {
    keyCondition: (params: { userId: string; fromDate?: string }) => ({
      pk: PatternHelpers.entityKey('USER', params.userId),
      sk: params.fromDate 
        ? { beginsWith: `ACTIVITY#${params.fromDate}` }
        : { beginsWith: 'ACTIVITY#' },
    }),
  },

  // Project patterns
  getProjectById: {
    keyCondition: (params: { projectId: string }) => ({
      pk: PatternHelpers.entityKey('PROJECT', params.projectId),
      sk: 'METADATA',
    }),
  },

  getProjectTasks: {
    keyCondition: (params: { projectId: string }) => ({
      pk: PatternHelpers.entityKey('PROJECT', params.projectId),
      sk: { beginsWith: 'TASK#' },
    }),
  },

  // Task patterns
  getTasksByStatus: {
    index: 'GSI1',
    keyCondition: (params: { status: string; fromDate?: string }) => ({
      pk: PatternHelpers.entityKey('STATUS', params.status),
      sk: params.fromDate ? { gte: params.fromDate } : undefined,
    }),
  },

  getTasksByAssignee: {
    index: 'GSI2',
    keyCondition: (params: { assigneeId: string }) => ({
      pk: PatternHelpers.entityKey('USER', params.assigneeId),
      sk: { beginsWith: 'TASK#' },
    }),
  },
}

export const db = new TableClient({
  tableName: process.env.TABLE_NAME || 'task-manager',
  client: new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  }),
  accessPatterns,
  statsConfig: {
    enabled: true,
    sampleRate: 1.0,
    thresholds: {
      slowQueryMs: 100,
      highRCU: 50,
      highWCU: 50,
    },
  },
})
```

## Step 4: implement user operations

Create functions for user management:

**src/users.ts**

```typescript
import { db } from './db'
import { PatternHelpers } from '@ddb-lib/core'
import type { User } from './types'

export async function createUser(
  userId: string,
  name: string,
  email: string,
  role: 'ADMIN' | 'MEMBER' = 'MEMBER'
): Promise<User> {
  const user: User = {
    pk: PatternHelpers.entityKey('USER', userId),
    sk: 'PROFILE',
    userId,
    name,
    email,
    role,
    createdAt: new Date().toISOString(),
  }

  await db.put(user)
  return user
}

export async function getUser(userId: string): Promise<User | null> {
  return await db.executePattern('getUserById', { userId })
    .then(results => results[0] as User || null)
}

export async function updateUser(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'email' | 'role'>>
): Promise<User> {
  return await db.update(
    {
      pk: PatternHelpers.entityKey('USER', userId),
      sk: 'PROFILE',
    },
    updates
  ) as User
}

export async function deleteUser(userId: string): Promise<void> {
  await db.delete({
    pk: PatternHelpers.entityKey('USER', userId),
    sk: 'PROFILE',
  })
}
```

## Step 5: implement project operations

Create functions for project management:

**src/projects.ts**

```typescript
import { db } from './db'
import { PatternHelpers } from '@ddb-lib/core'
import type { Project } from './types'

export async function createProject(
  projectId: string,
  name: string,
  ownerId: string,
  description?: string
): Promise<Project> {
  const project: Project = {
    pk: PatternHelpers.entityKey('PROJECT', projectId),
    sk: 'METADATA',
    projectId,
    name,
    description,
    ownerId,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  }

  await db.put(project)
  return project
}

export async function getProject(projectId: string): Promise<Project | null> {
  return await db.executePattern('getProjectById', { projectId })
    .then(results => results[0] as Project || null)
}

export async function listProjects(): Promise<Project[]> {
  // In a real app, you'd use a GSI for this
  const result = await db.scan({
    filter: { sk: { eq: 'METADATA' } },
  })
  return result.items as Project[]
}

export async function archiveProject(projectId: string): Promise<void> {
  await db.update(
    {
      pk: PatternHelpers.entityKey('PROJECT', projectId),
      sk: 'METADATA',
    },
    { status: 'ARCHIVED' }
  )
}
```

## Step 6: implement task operations

Create functions for task management:

**src/tasks.ts**

```typescript
import { db } from './db'
import { PatternHelpers } from '@ddb-lib/core'
import type { Task } from './types'

export async function createTask(
  taskId: string,
  projectId: string,
  title: string,
  options: {
    description?: string
    priority?: 'LOW' | 'MEDIUM' | 'HIGH'
    assigneeId?: string
    dueDate?: string
  } = {}
): Promise<Task> {
  const now = new Date().toISOString()
  const status = 'TODO'

  const task: Task = {
    pk: PatternHelpers.entityKey('PROJECT', projectId),
    sk: PatternHelpers.entityKey('TASK', taskId),
    taskId,
    projectId,
    title,
    description: options.description,
    status,
    priority: options.priority || 'MEDIUM',
    assigneeId: options.assigneeId,
    dueDate: options.dueDate,
    createdAt: now,
    updatedAt: now,
    // GSI1 for querying by status
    gsi1pk: PatternHelpers.entityKey('STATUS', status),
    gsi1sk: options.dueDate || now,
    // GSI2 for querying by assignee
    gsi2pk: options.assigneeId 
      ? PatternHelpers.entityKey('USER', options.assigneeId)
      : undefined,
    gsi2sk: options.assigneeId 
      ? PatternHelpers.entityKey('TASK', taskId)
      : undefined,
  }

  await db.put(task)
  return task
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  return await db.executePattern('getProjectTasks', { projectId }) as Task[]
}

export async function getTasksByStatus(
  status: 'TODO' | 'IN_PROGRESS' | 'DONE',
  fromDate?: string
): Promise<Task[]> {
  return await db.executePattern('getTasksByStatus', { 
    status, 
    fromDate 
  }) as Task[]
}

export async function getTasksByAssignee(assigneeId: string): Promise<Task[]> {
  return await db.executePattern('getTasksByAssignee', { 
    assigneeId 
  }) as Task[]
}

export async function updateTask(
  projectId: string,
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate'>>
): Promise<Task> {
  const key = {
    pk: PatternHelpers.entityKey('PROJECT', projectId),
    sk: PatternHelpers.entityKey('TASK', taskId),
  }

  // Update GSI keys if status or assignee changed
  const gsiUpdates: any = {
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  if (updates.status) {
    gsiUpdates.gsi1pk = PatternHelpers.entityKey('STATUS', updates.status)
  }

  if (updates.assigneeId !== undefined) {
    gsiUpdates.gsi2pk = updates.assigneeId
      ? PatternHelpers.entityKey('USER', updates.assigneeId)
      : null
    gsiUpdates.gsi2sk = updates.assigneeId
      ? PatternHelpers.entityKey('TASK', taskId)
      : null
  }

  return await db.update(key, gsiUpdates) as Task
}

export async function deleteTask(
  projectId: string,
  taskId: string
): Promise<void> {
  await db.delete({
    pk: PatternHelpers.entityKey('PROJECT', projectId),
    sk: PatternHelpers.entityKey('TASK', taskId),
  })
}
```

## Step 7: add activity tracking

Track user activities:

**src/activities.ts**

```typescript
import { db } from './db'
import { PatternHelpers } from '@ddb-lib/core'
import type { Activity } from './types'

export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string
): Promise<void> {
  const timestamp = new Date().toISOString()

  const activity: Activity = {
    pk: PatternHelpers.entityKey('USER', userId),
    sk: `ACTIVITY#${timestamp}`,
    userId,
    action,
    entityType,
    entityId,
    timestamp,
  }

  await db.put(activity)
}

export async function getUserActivities(
  userId: string,
  fromDate?: string
): Promise<Activity[]> {
  return await db.executePattern('getUserActivities', { 
    userId, 
    fromDate 
  }) as Activity[]
}
```

## Step 8: put it all together

Create the main application:

**src/index.ts**

```typescript
import { createUser, getUser } from './users'
import { createProject, getProject } from './projects'
import { createTask, getProjectTasks, updateTask, getTasksByAssignee } from './tasks'
import { logActivity, getUserActivities } from './activities'
import { db } from './db'

async function main() {
  console.log('🚀 Task Manager Demo\n')

  // Create users
  console.log('Creating users...')
  const alice = await createUser('alice', 'Alice Johnson', 'alice@example.com', 'ADMIN')
  const bob = await createUser('bob', 'Bob Smith', 'bob@example.com', 'MEMBER')
  console.log('✓ Created users:', alice.name, bob.name)

  // Create project
  console.log('\nCreating project...')
  const project = await createProject(
    'proj-1',
    'Website Redesign',
    alice.userId,
    'Redesign company website'
  )
  console.log('✓ Created project:', project.name)
  await logActivity(alice.userId, 'CREATE_PROJECT', 'PROJECT', project.projectId)

  // Create tasks
  console.log('\nCreating tasks...')
  const task1 = await createTask('task-1', project.projectId, 'Design mockups', {
    priority: 'HIGH',
    assigneeId: alice.userId,
    dueDate: '2025-12-10',
  })
  const task2 = await createTask('task-2', project.projectId, 'Implement homepage', {
    priority: 'MEDIUM',
    assigneeId: bob.userId,
    dueDate: '2025-12-15',
  })
  console.log('✓ Created tasks:', task1.title, task2.title)
  await logActivity(alice.userId, 'CREATE_TASK', 'TASK', task1.taskId)
  await logActivity(alice.userId, 'CREATE_TASK', 'TASK', task2.taskId)

  // Update task status
  console.log('\nUpdating task status...')
  await updateTask(project.projectId, task1.taskId, { status: 'IN_PROGRESS' })
  console.log('✓ Task updated to IN_PROGRESS')
  await logActivity(alice.userId, 'UPDATE_TASK', 'TASK', task1.taskId)

  // Query tasks
  console.log('\nQuerying tasks...')
  const projectTasks = await getProjectTasks(project.projectId)
  console.log(`✓ Found ${projectTasks.length} tasks in project`)

  const bobsTasks = await getTasksByAssignee(bob.userId)
  console.log(`✓ Bob has ${bobsTasks.length} assigned tasks`)

  // View activities
  console.log('\nViewing activities...')
  const activities = await getUserActivities(alice.userId)
  console.log(`✓ Alice has ${activities.length} activities:`)
  activities.forEach(a => {
    console.log(`  - ${a.action} ${a.entityType} at ${a.timestamp}`)
  })

  // Get statistics
  console.log('\n📊 Performance Statistics')
  const stats = db.getStats()
  const totalOps = Object.values(stats.operations)
    .reduce((sum, op) => sum + op.count, 0)
  console.log(`Total operations: ${totalOps}`)
  
  for (const [opType, opStats] of Object.entries(stats.operations)) {
    console.log(`  ${opType}: ${opStats.count} ops, avg ${opStats.avgLatencyMs.toFixed(2)}ms`)
  }

  // Get recommendations
  console.log('\n💡 Recommendations')
  const recommendations = db.getRecommendations()
  if (recommendations.length === 0) {
    console.log('✓ No issues detected - great job!')
  } else {
    recommendations.forEach(rec => {
      console.log(`  [${rec.severity}] ${rec.message}`)
    })
  }

  console.log('\n✅ Demo complete!')
}

main().catch(console.error)
```

## Step 9: run the application

**Run the Application**

```bash
# Start DynamoDB local
docker run -p 8000:8000 amazon/dynamodb-local

# Create the table
aws dynamodb create-table \
  --table-name task-manager \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=gsi1pk,AttributeType=S \
    AttributeName=gsi1sk,AttributeType=S \
    AttributeName=gsi2pk,AttributeType=S \
    AttributeName=gsi2sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    "[{\"IndexName\":\"GSI1\",\"KeySchema\":[{\"AttributeName\":\"gsi1pk\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"gsi1sk\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"GSI2\",\"KeySchema\":[{\"AttributeName\":\"gsi2pk\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"gsi2sk\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

# Run the application
npx tsx src/index.ts
```

## What you learned

In this tutorial, you learned how to:

- ✅ Design a single-table schema for multiple entity types
- ✅ Use pattern helpers for consistent key construction
- ✅ Implement access patterns for efficient queries
- ✅ Use GSIs for secondary access patterns
- ✅ Track activities with time-series data
- ✅ Monitor performance with statistics collection
- ✅ Get optimization recommendations

## Next steps

- Explore [DynamoDB Patterns](../patterns/) for more design patterns
- Learn about [Best Practices](../best-practices/) for production applications
- Review [Anti-Patterns](../anti-patterns/) to avoid common mistakes
- Check out [Complete Examples](../examples/) for more complex scenarios

!!! success "Congratulations!"
    You've built a complete task management application with ddb-lib! You now have the foundation to build production-ready DynamoDB applications.
