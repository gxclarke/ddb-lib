---
title: Examples
description: Complete working examples for ddb-lib packages
---

# Examples

Complete, runnable examples demonstrating how to use ddb-lib in real-world scenarios.

## Repository examples

All examples are available in the [GitHub repository](https://github.com/yourusername/ddb-lib/tree/main/examples).

```bash
git clone https://github.com/yourusername/ddb-lib.git
cd ddb-lib/examples
npm install
```

## Standalone examples

Examples using `@ddb-lib/client` without AWS Amplify.

### [basic CRUD operations](standalone/basic-crud.md)

Learn the fundamentals of CRUD operations with TableClient.

**Topics Covered:**
- Creating items with `put()`
- Reading items with `get()`
- Updating items with `update()`
- Deleting items with `delete()`
- Error handling

**File:** `examples/standalone/basic-crud.ts`

### [single-table design](standalone/single-table-design.md)

Implement single-table design patterns with multiple entity types.

**Topics Covered:**
- Entity keys for different types
- Composite keys for relationships
- GSI for alternative access patterns
- Query patterns

**File:** `examples/standalone/single-table-design.ts`

### [statistics and monitoring](standalone/stats-monitoring/)

Monitor and optimize DynamoDB operations.

**Topics Covered:**
- Statistics collection
- Anti-pattern detection
- Optimization recommendations
- Performance metrics

**File:** `examples/standalone/stats-monitoring.ts`

## Amplify examples

Examples using `@ddb-lib/amplify` with AWS Amplify Gen 2.

### [basic Amplify usage](amplify/basic-usage.md)

Get started with Amplify integration.

**Topics Covered:**
- Amplify client setup
- Model operations
- Monitoring integration
- Pattern helpers

**File:** `examples/amplify/basic-usage.ts`

### [amplify monitoring](amplify/monitoring/)

Monitor Amplify data operations.

**Topics Covered:**
- AmplifyMonitor setup
- Statistics collection
- Recommendations
- Performance tracking

**File:** `examples/amplify/with-monitoring.ts`

### [pattern helpers](amplify/pattern-helpers.md)

Use pattern helpers with Amplify schemas.

**Topics Covered:**
- Entity keys in Amplify
- Composite keys for relationships
- Time-series patterns
- Multi-tenant patterns

**File:** `examples/amplify/pattern-helpers.ts`

## Running examples

### Prerequisites

```bash
# Install dependencies
npm install

# Configure AWS credentials
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

### Run standalone examples

```bash
# Basic CRUD
npx tsx examples/standalone/basic-crud.ts

# Single-table design
npx tsx examples/standalone/single-table-design.ts

# Statistics monitoring
npx tsx examples/standalone/stats-monitoring.ts
```

### Run Amplify examples

```bash
# Basic usage
npx tsx examples/amplify/basic-usage.ts

# With monitoring
npx tsx examples/amplify/with-monitoring.ts

# Pattern helpers
npx tsx examples/amplify/pattern-helpers.ts
```

## Example structure

Each example follows this structure:

```typescript
// 1. Imports
import { TableClient } from '@ddb-lib/client'

// 2. Configuration
const config = {
  tableName: 'ExampleTable',
  region: 'us-east-1'
}

// 3. Setup
const table = new TableClient(config)

// 4. Example operations
async function example() {
  // ... operations
}

// 5. Run
example().catch(console.error)
```

## Additional resources

- [Getting Started](../getting-started/) - Installation and setup
- [Guides](../guides/) - Feature-specific guides
- [API Reference](../api/) - Complete API documentation
- [Patterns](../patterns/) - DynamoDB design patterns
- [Best Practices](../best-practices/) - Optimization techniques

## Contributing examples

Have a great example to share? We'd love to include it!

1. Fork the repository
2. Add your example to `examples/`
3. Include a README with explanation
4. Submit a pull request

See the [Contributing Guide](../contributing/) for more details.

