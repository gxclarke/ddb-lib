---
title: "ddb-lib Documentation"
description: "Modular TypeScript library for AWS DynamoDB with best practices, pattern helpers, and performance monitoring"
---

## Welcome to ddb-lib

A modular TypeScript library that makes working with AWS DynamoDB easier, faster, and more reliable. Whether you're building with standalone DynamoDB or AWS Amplify Gen 2, ddb-lib provides the tools you need to implement best practices and avoid common pitfalls.

## Quick Links

<div class="quick-links">
  <a href="/getting-started/" class="quick-link-card">
    <i class="fas fa-rocket"></i>
    <h3>Getting Started</h3>
    <p>Install and configure ddb-lib in minutes</p>
  </a>
  
  <a href="/patterns/" class="quick-link-card">
    <i class="fas fa-puzzle-piece"></i>
    <h3>Patterns</h3>
    <p>Learn DynamoDB design patterns</p>
  </a>
  
  <a href="/best-practices/" class="quick-link-card">
    <i class="fas fa-star"></i>
    <h3>Best Practices</h3>
    <p>Optimize performance and cost</p>
  </a>
  
  <a href="/api/" class="quick-link-card">
    <i class="fas fa-book"></i>
    <h3>API Reference</h3>
    <p>Complete API documentation</p>
  </a>
</div>

## Why ddb-lib?

### 🎯 Modular Architecture

Install only what you need. Use core utilities standalone, add monitoring, or integrate with Amplify.

### 📊 Performance Monitoring

Built-in statistics collection, anti-pattern detection, and actionable recommendations.

### 🛡️ Best Practices Built-In

Pattern helpers, multi-attribute keys, and utilities that guide you toward optimal DynamoDB usage.

### 🔒 Type Safe

Full TypeScript support with type inference and validation throughout.

## Package Overview

| Package | Purpose | Install |
|---------|---------|---------|
| [@ddb-lib/core](/api/core/) | Pattern helpers and utilities | `npm install @ddb-lib/core` |
| [@ddb-lib/stats](/api/stats/) | Performance monitoring | `npm install @ddb-lib/stats` |
| [@ddb-lib/client](/api/client/) | Standalone DynamoDB client | `npm install @ddb-lib/client` |
| [@ddb-lib/amplify](/api/amplify/) | Amplify Gen 2 integration | `npm install @ddb-lib/amplify` |

## Quick Example

### Standalone Usage

```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'users',
  statsConfig: { enabled: true }
})

// Use pattern helpers
const userKey = PatternHelpers.entityKey('USER', '123')

// Perform operations
await table.put({ pk: userKey, sk: 'PROFILE', name: 'Alice' })
const user = await table.get({ pk: userKey, sk: 'PROFILE' })

// Get recommendations
const recommendations = table.getRecommendations()
```

### Amplify Integration

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'

const client = generateClient()
const monitor = new AmplifyMonitor({ statsConfig: { enabled: true } })

// Wrap your model
const monitoredTodos = monitor.wrap(client.models.Todo)

// Operations are automatically monitored
await monitoredTodos.create({ title: 'Buy groceries' })

// Get insights
const stats = monitor.getStats()
const recommendations = monitor.getRecommendations()
```

## What's Next?

- **New to DynamoDB?** Start with our [Getting Started Guide](/getting-started/)
- **Want to learn patterns?** Explore [DynamoDB Patterns](/patterns/)
- **Need API docs?** Check the [API Reference](/api/)
- **Looking for examples?** Browse [Code Examples](/examples/)

<style>
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.quick-link-card {
  padding: 2rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s;
}

.quick-link-card:hover {
  border-color: #4CAF50;
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.quick-link-card i {
  font-size: 2.5rem;
  color: #4CAF50;
  margin-bottom: 1rem;
}

.quick-link-card h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.quick-link-card p {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}
</style>
