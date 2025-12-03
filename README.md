# ddb-lib

A modular TypeScript library for AWS DynamoDB that provides best practices, pattern helpers, and performance monitoring. Works seamlessly with both standalone DynamoDB and AWS Amplify Gen 2.

## 📦 Packages

This is a monorepo containing multiple packages that can be used independently or together:

| Package | Description | Use Case |
|---------|-------------|----------|
| [@ddb-lib/core](./packages/core) | Pure utility functions for DynamoDB patterns | Pattern helpers, multi-attribute keys, expression builders |
| [@ddb-lib/stats](./packages/stats) | Performance monitoring and recommendations | Statistics collection, anti-pattern detection |
| [@ddb-lib/client](./packages/client) | Full-featured DynamoDB client | Standalone DynamoDB applications |
| [@ddb-lib/amplify](./packages/amplify) | AWS Amplify Gen 2 integration | Amplify applications with monitoring |

## 🚀 Quick Start

### For Standalone DynamoDB

Install the client package (includes core and stats):

```bash
npm install @ddb-lib/client
```

```typescript
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'my-table',
  region: 'us-east-1',
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

### For AWS Amplify Gen 2

Install the Amplify integration package:

```bash
npm install @ddb-lib/amplify
```

```typescript
import { generateClient } from 'aws-amplify/data'
import { AmplifyMonitor } from '@ddb-lib/amplify'
import { PatternHelpers } from '@ddb-lib/core'
import type { Schema } from './amplify/data/resource'

const client = generateClient<Schema>()

// Create monitor
const monitor = new AmplifyMonitor({
  statsConfig: { enabled: true }
})

// Wrap your Amplify model
const monitoredTodos = monitor.wrap(client.models.Todo)

// Use as normal - operations are automatically monitored
await monitoredTodos.create({ title: 'Buy groceries', completed: false })

// Get statistics and recommendations
const stats = monitor.getStats()
const recommendations = monitor.getRecommendations()
```

### Using Core Utilities Only

If you only need pattern helpers without a client:

```bash
npm install @ddb-lib/core
```

```typescript
import { PatternHelpers, multiTenantKey } from '@ddb-lib/core'

// Use pattern helpers in your own code
const key = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456'])
const tenantKey = multiTenantKey('TENANT-1', 'CUST-123')
```

## ✨ Features

### Core Utilities (@ddb-lib/core)
- **Pattern Helpers**: Entity keys, composite keys, time-series keys, hierarchical keys
- **Multi-Attribute Keys**: Native support for DynamoDB's multi-attribute composite keys
- **Expression Builders**: Type-safe builders for key conditions, filters, and conditions
- **Type Guards**: Runtime type checking utilities
- **Zero Dependencies**: Pure TypeScript with no external dependencies

### Statistics & Monitoring (@ddb-lib/stats)
- **Performance Tracking**: Automatic latency and capacity monitoring
- **Anti-Pattern Detection**: Identifies scans, hot partitions, inefficient queries
- **Recommendations**: Actionable suggestions for optimization
- **Framework Agnostic**: Works with any data access layer

### Standalone Client (@ddb-lib/client)
- **Complete DynamoDB API**: All operations with simplified interface
- **Automatic Batching**: Intelligent chunking for batch operations
- **Retry Logic**: Configurable exponential backoff
- **Access Patterns**: Named, reusable query patterns
- **Type Safety**: Full TypeScript support with inference

### Amplify Integration (@ddb-lib/amplify)
- **Seamless Integration**: Works with Amplify Gen 2 data client
- **Automatic Monitoring**: Zero-config operation tracking
- **Pattern Helpers**: Use DynamoDB best practices with Amplify
- **Type Safe**: Preserves Amplify's type definitions

## 📚 Documentation

- **[Core Package Documentation](./packages/core/README.md)** - Pattern helpers and utilities
- **[Stats Package Documentation](./packages/stats/README.md)** - Monitoring and recommendations
- **[Client Package Documentation](./packages/client/README.md)** - Standalone TableClient
- **[Amplify Package Documentation](./packages/amplify/README.md)** - Amplify Gen 2 integration
- **[Complete API Reference](./API.md)** - Detailed API documentation

## 📖 Examples

### Standalone Examples
- [Basic CRUD Operations](./examples/standalone/basic-crud.ts)
- [Single-Table Design](./examples/standalone/single-table-design.ts)
- [Statistics Monitoring](./examples/standalone/stats-monitoring.ts)

### Amplify Examples
- [Basic Amplify Usage](./examples/amplify/basic-usage.ts)
- [Amplify with Monitoring](./examples/amplify/with-monitoring.ts)
- [Pattern Helpers with Amplify](./examples/amplify/pattern-helpers.ts)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────┐              ┌──────────────────────┐
│  @ddb-lib/client  │              │  @ddb-lib/amplify    │
│  (Standalone)     │              │  (Amplify Gen 2)     │
└───────────────────┘              └──────────────────────┘
        │                                     │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────┐              ┌──────────────────────┐
│   @ddb-lib/core   │              │   @ddb-lib/stats     │
│  (Utilities)      │◄─────────────│   (Monitoring)       │
└───────────────────┘              └──────────────────────┘
```

## 🎯 Use Cases

### When to Use Each Package

**@ddb-lib/core**
- You need pattern helpers for key construction
- You want multi-attribute key utilities
- You're building your own DynamoDB abstraction
- You need expression builders

**@ddb-lib/stats**
- You want to monitor DynamoDB performance
- You need anti-pattern detection
- You want optimization recommendations
- You're using a custom data access layer

**@ddb-lib/client**
- You're building a standalone Node.js application
- You want a simplified DynamoDB interface
- You need built-in monitoring and best practices
- You're not using Amplify

**@ddb-lib/amplify**
- You're using AWS Amplify Gen 2
- You want to monitor Amplify operations
- You need DynamoDB best practices with Amplify
- You want pattern helpers for Amplify keys

## 🔧 Development

This is a monorepo managed with npm workspaces.

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm run test

# Run tests for a specific package
npm run test -w @ddb-lib/core

# Type check
npm run typecheck

# Lint
npm run lint
```

## 📋 Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- AWS SDK v3 (peer dependency for @ddb-lib/client)
- aws-amplify (peer dependency for @ddb-lib/amplify)

## 🤝 Contributing

Contributions are welcome! Please see our contributing guidelines.

## 📄 License

MIT

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/ddb-lib)
- [npm Organization](https://www.npmjs.com/org/ddb-lib)
- [Documentation](./docs)
- [Examples](./examples)

## 💡 Why Modular?

The modular architecture allows you to:

1. **Minimize Bundle Size**: Install only what you need
2. **Mix and Match**: Use utilities with any data access layer
3. **Framework Agnostic**: Core utilities work everywhere
4. **Easy Migration**: Move between standalone and Amplify easily
5. **Tree-Shaking**: Unused code is eliminated from your bundle

## 🆚 Comparison

| Feature | @ddb-lib/client | @ddb-lib/amplify | Raw DynamoDB SDK | Amplify Data |
|---------|----------------|------------------|------------------|--------------|
| Type Safety | ✅ | ✅ | ⚠️ Partial | ✅ |
| Pattern Helpers | ✅ | ✅ | ❌ | ❌ |
| Performance Monitoring | ✅ | ✅ | ❌ | ❌ |
| Anti-Pattern Detection | ✅ | ✅ | ❌ | ❌ |
| Simplified API | ✅ | ✅ | ❌ | ✅ |
| Multi-Attribute Keys | ✅ | ✅ | ⚠️ Manual | ⚠️ Manual |
| GraphQL Integration | ❌ | ✅ | ❌ | ✅ |
| Authorization Rules | ❌ | ✅ | ❌ | ✅ |

## 🎓 Learn More

- [DynamoDB Best Practices](./docs/best-practices.md)
- [Single-Table Design Guide](./docs/single-table-design.md)
- [Multi-Attribute Keys](./docs/multi-attribute-keys.md)
- [Performance Optimization](./docs/performance.md)
- [Migration Guide](./docs/migration.md)
