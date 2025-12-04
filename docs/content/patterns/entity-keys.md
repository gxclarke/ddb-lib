---
title: "Entity Keys Pattern"
description: "Type-safe entity identification with prefixed keys"
type: docs
weight: 10
---

# Entity Keys Pattern

## What is it?

Entity keys are a foundational pattern for creating type-safe, self-documenting partition and sort keys by prefixing them with the entity type. This pattern is essential for single-table design where multiple entity types coexist in the same DynamoDB table.

The pattern uses a simple format: `ENTITY_TYPE#ID`

For example:
- `USER#123` - A user with ID 123
- `ORDER#abc-def` - An order with ID abc-def
- `PRODUCT#SKU-789` - A product with SKU 789

## Why is it important?

### Type Safety
Entity keys prevent accidentally mixing different entity types. When you see `USER#123`, you immediately know it's a user, not an order or product.

### Self-Documenting
Keys are human-readable and self-explanatory. This makes debugging, monitoring, and understanding your data model much easier.

### Query Efficiency
You can easily query all entities of a specific type by using key conditions with `beginsWith`:

```typescript
// Get all orders for a user
keyCondition: {
  pk: 'USER#123',
  sk: { beginsWith: 'ORDER#' }
}
```

### Single-Table Design
Entity keys are essential for organizing multiple entity types in a single table while maintaining clarity and preventing collisions.

## Visual Representation

{{< pattern-diagram mermaid="true" caption="Entity Key Structure" >}}
graph LR
    A[Entity Type] -->|#| B[Unique ID]
    B --> C[USER#123]
    D[Entity Type] -->|#| E[Unique ID]
    E --> F[ORDER#abc-def]
    style C fill:#4CAF50
    style F fill:#2196F3
{{< /pattern-diagram >}}

### Single-Table Design Example

{{< pattern-diagram mermaid="true" caption="Multiple Entity Types in One Table" >}}
graph TD
    Table[DynamoDB Table]
    Table --> U1[USER#123]
    Table --> U2[USER#456]
    Table --> O1[ORDER#abc]
    Table --> O2[ORDER#def]
    Table --> P1[PRODUCT#SKU-1]
    Table --> P2[PRODUCT#SKU-2]
    style U1 fill:#4CAF50
    style U2 fill:#4CAF50
    style O1 fill:#2196F3
    style O2 fill:#2196F3
    style P1 fill:#FF9800
    style P2 fill:#FF9800
{{< /pattern-diagram >}}

## Implementation

The `@ddb-lib/core` package provides helper functions for working with entity keys:

### Creating Entity Keys

{{< code-example lang="typescript" title="Creating Entity Keys" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Create entity keys
const userKey = PatternHelpers.entityKey('USER', '123')
console.log(userKey) // 'USER#123'

const orderKey = PatternHelpers.entityKey('ORDER', 'abc-def')
console.log(orderKey) // 'ORDER#abc-def'

const productKey = PatternHelpers.entityKey('PRODUCT', 'SKU-789')
console.log(productKey) // 'PRODUCT#SKU-789'
{{< /code-example >}}

### Parsing Entity Keys

{{< code-example lang="typescript" title="Parsing Entity Keys" >}}
import { PatternHelpers } from '@ddb-lib/core'

// Parse an entity key
const parsed = PatternHelpers.parseEntityKey('USER#123')
console.log(parsed)
// { entityType: 'USER', id: '123' }

// Handle IDs with special characters
const complexParsed = PatternHelpers.parseEntityKey('ORDER#2024-01-15#abc')
console.log(complexParsed)
// { entityType: 'ORDER', id: '2024-01-15#abc' }
{{< /code-example >}}

### Using with TableClient

{{< code-example lang="typescript" title="Entity Keys with TableClient" >}}
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'MyTable',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// Store a user
await table.put({
  pk: PatternHelpers.entityKey('USER', '123'),
  sk: PatternHelpers.entityKey('USER', '123'),
  name: 'Alice',
  email: 'alice@example.com'
})

// Store user's orders
await table.put({
  pk: PatternHelpers.entityKey('USER', '123'),
  sk: PatternHelpers.entityKey('ORDER', 'abc'),
  total: 99.99,
  status: 'pending'
})

// Query all orders for a user
const orders = await table.query({
  keyCondition: {
    pk: PatternHelpers.entityKey('USER', '123'),
    sk: { beginsWith: 'ORDER#' }
  }
})
{{< /code-example >}}

### Single-Table Design Example

{{< code-example lang="typescript" title="Complete Single-Table Design" >}}
import { TableClient } from '@ddb-lib/client'
import { PatternHelpers } from '@ddb-lib/core'

const table = new TableClient({
  tableName: 'AppData',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// User entity
await table.put({
  pk: PatternHelpers.entityKey('USER', '123'),
  sk: PatternHelpers.entityKey('USER', '123'),
  entityType: 'USER',
  name: 'Alice',
  email: 'alice@example.com'
})

// User's profile
await table.put({
  pk: PatternHelpers.entityKey('USER', '123'),
  sk: 'PROFILE',
  bio: 'Software engineer',
  avatar: 'https://...'
})

// User's orders
await table.put({
  pk: PatternHelpers.entityKey('USER', '123'),
  sk: PatternHelpers.entityKey('ORDER', 'order-1'),
  entityType: 'ORDER',
  total: 99.99,
  items: ['item1', 'item2']
})

// Product entity (different partition)
await table.put({
  pk: PatternHelpers.entityKey('PRODUCT', 'SKU-789'),
  sk: PatternHelpers.entityKey('PRODUCT', 'SKU-789'),
  entityType: 'PRODUCT',
  name: 'Widget',
  price: 29.99
})

// Query all data for a user
const userData = await table.query({
  keyCondition: {
    pk: PatternHelpers.entityKey('USER', '123')
  }
})
// Returns: user entity, profile, and all orders
{{< /code-example >}}

## When to Use

### ✅ Use Entity Keys When:

- **Single-table design**: You're storing multiple entity types in one table
- **Human-readable keys**: You want keys that are easy to understand and debug
- **Type safety**: You want to prevent mixing different entity types
- **Querying by type**: You need to query all entities of a specific type
- **Monitoring**: You want to easily identify entity types in logs and metrics

### ❌ Avoid Entity Keys When:

- **DynamoDB Streams**: If you're using streams and need to hide entity structure, consider UUIDs
- **External exposure**: If keys are exposed in URLs, consider using opaque identifiers
- **Very high cardinality**: If entity types change frequently, this adds complexity

### ⚠️ Considerations:

- **Separator choice**: The `#` separator is conventional but ensure your IDs don't contain it
- **Case sensitivity**: DynamoDB keys are case-sensitive; establish a convention (e.g., UPPERCASE for types)
- **ID format**: Choose a consistent ID format (UUIDs, sequential numbers, etc.)

## Best Practices

### 1. Use Consistent Naming

```typescript
// ✅ Good: Consistent uppercase entity types
PatternHelpers.entityKey('USER', '123')
PatternHelpers.entityKey('ORDER', 'abc')
PatternHelpers.entityKey('PRODUCT', 'xyz')

// ❌ Bad: Inconsistent casing
PatternHelpers.entityKey('user', '123')
PatternHelpers.entityKey('Order', 'abc')
PatternHelpers.entityKey('PRODUCT', 'xyz')
```

### 2. Store Entity Type as Attribute

```typescript
// ✅ Good: Include entityType for filtering and clarity
await table.put({
  pk: PatternHelpers.entityKey('USER', '123'),
  sk: PatternHelpers.entityKey('USER', '123'),
  entityType: 'USER', // Explicit type attribute
  name: 'Alice'
})
```

### 3. Validate IDs Don't Contain Separator

```typescript
// ✅ Good: Validate before creating keys
function createUserKey(userId: string): string {
  if (userId.includes('#')) {
    throw new Error('User ID cannot contain # character')
  }
  return PatternHelpers.entityKey('USER', userId)
}
```

### 4. Use Type Guards

```typescript
// ✅ Good: Type-safe entity checking
function isUserKey(key: string): boolean {
  const { entityType } = PatternHelpers.parseEntityKey(key)
  return entityType === 'USER'
}

function isOrderKey(key: string): boolean {
  const { entityType } = PatternHelpers.parseEntityKey(key)
  return entityType === 'ORDER'
}
```

## Common Patterns

### Pattern 1: User and Related Data

```typescript
// User entity
pk: 'USER#123', sk: 'USER#123'

// User's orders
pk: 'USER#123', sk: 'ORDER#abc'
pk: 'USER#123', sk: 'ORDER#def'

// User's profile
pk: 'USER#123', sk: 'PROFILE'

// User's settings
pk: 'USER#123', sk: 'SETTINGS'
```

### Pattern 2: Hierarchical Relationships

```typescript
// Organization
pk: 'ORG#acme', sk: 'ORG#acme'

// Teams in organization
pk: 'ORG#acme', sk: 'TEAM#engineering'
pk: 'ORG#acme', sk: 'TEAM#sales'

// Users in team
pk: 'TEAM#engineering', sk: 'USER#123'
pk: 'TEAM#engineering', sk: 'USER#456'
```

### Pattern 3: Many-to-Many Relationships

```typescript
// Student enrolled in courses
pk: 'STUDENT#123', sk: 'COURSE#math-101'
pk: 'STUDENT#123', sk: 'COURSE#physics-201'

// Course with enrolled students (inverted)
pk: 'COURSE#math-101', sk: 'STUDENT#123'
pk: 'COURSE#math-101', sk: 'STUDENT#456'
```

## Related Patterns

- [Composite Keys](/patterns/composite-keys/) - Combine multiple attributes into keys
- [Hierarchical Keys](/patterns/hierarchical/) - Model parent-child relationships
- [Multi-Attribute Keys](/patterns/multi-attribute-keys/) - Advanced composite key management
- [Adjacency List](/patterns/adjacency-list/) - Model graph relationships

## Additional Resources

- [Single-Table Design Guide](/guides/access-patterns/)
- [Core Operations](/guides/core-operations/)
- [Best Practices: Key Design](/best-practices/key-design/)
- [API Reference: PatternHelpers](/api/core/#patternhelpers-class)
