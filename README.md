# ddb-lib

A modular TypeScript library for AWS DynamoDB that provides best practices, pattern helpers, and performance monitoring. Works seamlessly with both standalone DynamoDB and AWS Amplify Gen 2.

## 📖 Documentation

**[https://ddb-lib.dev](https://ddb-lib.dev)** - Complete documentation with guides, examples, and API reference

## 📦 Packages

This is a monorepo containing multiple packages that can be used independently or together:

| Package | Description | Use Case |
|---------|-------------|----------|
| [@ddb-lib/core](./packages/core) | Pure utility functions for DynamoDB patterns | Pattern helpers, multi-attribute keys, expression builders |
| [@ddb-lib/stats](./packages/stats) | Performance monitoring and recommendations | Statistics collection, anti-pattern detection |
| [@ddb-lib/client](./packages/client) | Full-featured DynamoDB client | Standalone DynamoDB applications |
| [@ddb-lib/amplify](./packages/amplify) | AWS Amplify Gen 2 integration | Amplify applications with monitoring |

## 🚀 Quick start

### For standalone DynamoDB

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

### Using core utilities only

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

### Core utilities (@ddb-lib/core)
- **Pattern helpers**: Entity keys, composite keys, time-series keys, hierarchical keys
- **Multi-attribute keys**: Native support for DynamoDB's multi-attribute composite keys
- **Expression builders**: Type-safe builders for key conditions, filters, and conditions
- **Type guards**: Runtime type checking utilities
- **Zero dependencies**: Pure TypeScript with no external dependencies

### Statistics and monitoring (@ddb-lib/stats)
- **Performance tracking**: Automatic latency and capacity monitoring
- **Anti-pattern detection**: Identifies scans, hot partitions, inefficient queries
- **Recommendations**: Actionable suggestions for optimization
- **Framework agnostic**: Works with any data access layer

### Standalone client (@ddb-lib/client)
- **Complete DynamoDB API**: All operations with simplified interface
- **Automatic batching**: Intelligent chunking for batch operations
- **Retry logic**: Configurable exponential backoff
- **Access patterns**: Named, reusable query patterns
- **Type safety**: Full TypeScript support with inference

### Amplify integration (@ddb-lib/amplify)
- **Seamless integration**: Works with Amplify Gen 2 data client
- **Automatic monitoring**: Zero-config operation tracking
- **Pattern helpers**: Use DynamoDB best practices with Amplify
- **Type safe**: Preserves Amplify's type definitions

## 📚 Full documentation

Visit **[https://ddb-lib.dev](https://ddb-lib.dev)** for comprehensive documentation including:

- **Getting started** - Installation and setup guides
- **Usage guides** - Core operations, queries, batch operations, transactions
- **DynamoDB patterns** - Entity keys, composite keys, time-series, hierarchical data
- **Best practices** - Query optimization, key design, capacity planning
- **Anti-patterns** - Common mistakes and how to avoid them
- **API reference** - Complete API documentation for all packages
- **Examples** - Real-world code examples for standalone and Amplify

### Package documentation

- **[Core package documentation](./packages/core/README.md)** - Pattern helpers and utilities
- **[Stats package documentation](./packages/stats/README.md)** - Monitoring and recommendations
- **[Client package documentation](./packages/client/README.md)** - Standalone TableClient
- **[Amplify package documentation](./packages/amplify/README.md)** - Amplify Gen 2 integration
- **[Complete API reference](./API.md)** - Detailed API documentation

### Building documentation locally

The documentation is built with MkDocs and Material theme:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Serve documentation locally
python3 -m mkdocs serve

# Build static site
python3 -m mkdocs build
```

## 📖 Examples

### Standalone examples
- [Basic CRUD operations](./examples/standalone/basic-crud.ts)
- [Single-table design](./examples/standalone/single-table-design.ts)
- [Statistics monitoring](./examples/standalone/stats-monitoring.ts)

### Amplify examples
- [Basic Amplify usage](./examples/amplify/basic-usage.ts)
- [Amplify with monitoring](./examples/amplify/with-monitoring.ts)
- [Pattern helpers with Amplify](./examples/amplify/pattern-helpers.ts)

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

## 🎯 Use cases

### When to use each package

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

- **[Documentation](https://ddb-lib.dev)** - Complete guides and API reference
- [GitHub repository](https://github.com/gxclarke/ddb-lib)
- [npm organization](https://www.npmjs.com/org/ddb-lib)
- [Examples](./examples)

## 💡 Why modular?

The modular architecture allows you to:

1. **Minimize bundle size**: Install only what you need
2. **Mix and match**: Use utilities with any data access layer
3. **Framework agnostic**: Core utilities work everywhere
4. **Easy migration**: Move between standalone and Amplify easily
5. **Tree-shaking**: Unused code is eliminated from your bundle

## 🆚 Comparison

| Feature | @ddb-lib/client | @ddb-lib/amplify | Raw DynamoDB SDK | Amplify Data |
|---------|----------------|------------------|------------------|--------------|
| Type safety | ✅ | ✅ | ⚠️ Partial | ✅ |
| Pattern helpers | ✅ | ✅ | ❌ | ❌ |
| Performance monitoring | ✅ | ✅ | ❌ | ❌ |
| Anti-Pattern detection | ✅ | ✅ | ❌ | ❌ |
| Simplified API | ✅ | ✅ | ❌ | ✅ |
| Multi-attribute keys | ✅ | ✅ | ⚠️ Manual | ⚠️ Manual |
| GraphQL integration | ❌ | ✅ | ❌ | ✅ |
| Authorization rules | ❌ | ✅ | ❌ | ✅ |

## 🎓 Learn more

Visit **[https://ddb-lib.dev](https://ddb-lib.dev)** for:

- [DynamoDB best practices](https://ddb-lib.dev/best-practices/)
- [Design patterns](https://ddb-lib.dev/patterns/)
- [Multi-attribute keys](https://ddb-lib.dev/guides/multi-attribute-keys/)
- [Performance optimization](https://ddb-lib.dev/guides/monitoring/)
- [Complete API reference](https://ddb-lib.dev/api/)
