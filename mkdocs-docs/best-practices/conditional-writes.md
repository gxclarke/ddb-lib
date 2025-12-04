---
title: Conditional Writes
description: Use conditional expressions to ensure data integrity and implement optimistic locking
---

# Conditional writes: ensure data integrity

## The practice

**Use conditional expressions to ensure data integrity and prevent race conditions, rather than using read-before-write patterns.**

Conditional writes allow you to specify conditions that must be met for a write operation to succeed, enabling atomic operations and optimistic locking without the overhead of reading first.

## Why it matters

### Data integrity
- Prevent race conditions in concurrent environments
- Ensure business rules are enforced at the database level
- Avoid data corruption from simultaneous updates

### Performance
- Eliminate read-before-write patterns (50% fewer operations)
- Atomic operations reduce latency
- No need for distributed locks

### Cost efficiency
- Half the RCU consumption (no read required)
- Simpler code with fewer operations
- Reduced WCU waste from failed writes

## Visual comparison

| Aspect | Conditional writes | Read-before-write |
|--------|-------------------|-------------------|
| **Operations required** | 1 (write with condition) | 2 (read + write) |
| **Race condition safe** | Yes (atomic) | No (window between read/write) |
| **RCU consumed** | 0 | 1+ per read |
| **Latency** | Low (single operation) | High (two operations) |
| **Code complexity** | Simple | Complex (error handling) |

!!! info "Atomic Operations"
    Conditional writes are atomic - DynamoDB checks the condition and performs the write in a single operation. This eliminates race conditions that can occur with read-before-write patterns.

## Code examples

### ✅ good: using conditional writes

```typescript
import { TableClient } from '@ddb-lib/client'

const table = new TableClient({
  tableName: 'Users',
  partitionKey: 'pk',
  sortKey: 'sk'
})

// Prevent duplicate user creation
await table.put({
  item: {
    pk: 'USER#123',
    sk: 'PROFILE',
    email: 'user@example.com',
    createdAt: Date.now()
  },
  condition: {
    attribute_not_exists: 'pk'  // Only create if doesn't exist
  }
})

// Single atomic operation - fast and safe!
```

### ❌ bad: read-before-write pattern

```typescript
// DON'T DO THIS!
// Check if user exists
const existing = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' }
})

if (!existing) {
  // Race condition window here!
  // Another process could create the user between check and write
  await table.put({
    item: {
      pk: 'USER#123',
      sk: 'PROFILE',
      email: 'user@example.com',
      createdAt: Date.now()
    }
  })
}

// Two operations, race condition, more expensive!
```

## Common use cases

### Use case 1: prevent duplicate creation

```typescript
// Ensure item doesn't already exist
try {
  await table.put({
    item: { pk: 'ORDER#123', sk: 'DETAILS', status: 'PENDING' },
    condition: { attribute_not_exists: 'pk' }
  })
  console.log('Order created successfully')
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    console.log('Order already exists')
  }
}
```

### Use case 2: optimistic locking with version numbers

```typescript
// Update only if version matches (optimistic locking)
await table.update({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  updates: {
    name: 'New Name',
    version: { $add: 1 }  // Increment version
  },
  condition: {
    version: { eq: currentVersion }  // Only if version matches
  }
})

// Prevents lost updates in concurrent scenarios
```

### Use case 3: enforce business rules

```typescript
// Only allow status change if current status is valid
await table.update({
  key: { pk: 'ORDER#123', sk: 'DETAILS' },
  updates: {
    status: 'SHIPPED'
  },
  condition: {
    status: { eq: 'PENDING' }  // Only ship pending orders
  }
})
```

### Use case 4: prevent negative balances

```typescript
// Deduct from balance only if sufficient funds
await table.update({
  key: { pk: 'ACCOUNT#123', sk: 'BALANCE' },
  updates: {
    balance: { $add: -100 }  // Deduct 100
  },
  condition: {
    balance: { gte: 100 }  // Only if balance >= 100
  }
})
```

### Use case 5: idempotent operations

```typescript
// Process event only once
await table.put({
  item: {
    pk: 'EVENT#abc',
    sk: 'PROCESSED',
    processedAt: Date.now()
  },
  condition: {
    attribute_not_exists: 'pk'  // Only if not already processed
  }
})
```

## Conditional expression operators

### Comparison operators

```typescript
// Equal
condition: { status: { eq: 'ACTIVE' } }

// Not equal
condition: { status: { ne: 'DELETED' } }

// Less than
condition: { age: { lt: 18 } }

// Less than or equal
condition: { price: { lte: 100 } }

// Greater than
condition: { stock: { gt: 0 } }

// Greater than or equal
condition: { balance: { gte: 50 } }
```

### Existence checks

```typescript
// Attribute exists
condition: { attribute_exists: 'email' }

// Attribute doesn't exist
condition: { attribute_not_exists: 'pk' }
```

### Type checks

```typescript
// Check attribute type
condition: { 
  attribute_type: { 
    attr: 'tags', 
    type: 'L'  // List type
  } 
}
```

### String operations

```typescript
// Begins with
condition: { 
  sk: { beginsWith: 'ORDER#' } 
}

// Contains
condition: { 
  tags: { contains: 'urgent' } 
}
```

### Logical operators

```typescript
// AND condition
condition: {
  $and: [
    { status: { eq: 'ACTIVE' } },
    { balance: { gte: 100 } }
  ]
}

// OR condition
condition: {
  $or: [
    { status: { eq: 'PENDING' } },
    { status: { eq: 'PROCESSING' } }
  ]
}

// NOT condition
condition: {
  $not: { status: { eq: 'DELETED' } }
}
```

## Advanced patterns

### Pattern 1: optimistic locking

```typescript
// Read item with version
const item = await table.get({
  key: { pk: 'USER#123', sk: 'PROFILE' }
})

// User modifies data in UI
const updatedData = { ...item, name: 'New Name' }

// Update with version check
try {
  await table.put({
    item: {
      ...updatedData,
      version: item.version + 1
    },
    condition: {
      version: { eq: item.version }
    }
  })
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    // Item was modified by another process
    // Reload and retry or notify user
    console.log('Item was modified by another user')
  }
}
```

### Pattern 2: state machine transitions

```typescript
// Define valid state transitions
const validTransitions = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: ['PENDING'],
  CANCELLED: []
}

async function transitionState(
  orderId: string,
  newState: string
) {
  const order = await table.get({
    key: { pk: `ORDER#${orderId}`, sk: 'DETAILS' }
  })
  
  const currentState = order.status
  const allowed = validTransitions[currentState]
  
  if (!allowed.includes(newState)) {
    throw new Error(`Cannot transition from ${currentState} to ${newState}`)
  }
  
  // Enforce transition at database level
  await table.update({
    key: { pk: `ORDER#${orderId}`, sk: 'DETAILS' },
    updates: { status: newState },
    condition: {
      status: { eq: currentState }
    }
  })
}
```

### Pattern 3: inventory management

```typescript
// Reserve inventory atomically
async function reserveInventory(
  productId: string,
  quantity: number
) {
  try {
    await table.update({
      key: { pk: `PRODUCT#${productId}`, sk: 'INVENTORY' },
      updates: {
        available: { $add: -quantity },
        reserved: { $add: quantity }
      },
      condition: {
        available: { gte: quantity }  // Only if enough available
      }
    })
    return { success: true }
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return { success: false, reason: 'Insufficient inventory' }
    }
    throw error
  }
}
```

### Pattern 4: rate limiting

```typescript
// Implement rate limiting with conditional writes
async function checkRateLimit(
  userId: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  try {
    await table.update({
      key: { pk: `RATE_LIMIT#${userId}`, sk: 'COUNTER' },
      updates: {
        count: { $add: 1 },
        lastRequest: now
      },
      condition: {
        $or: [
          { attribute_not_exists: 'count' },
          { count: { lt: limit } },
          { lastRequest: { lt: windowStart } }
        ]
      }
    })
    return { allowed: true }
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return { allowed: false, reason: 'Rate limit exceeded' }
    }
    throw error
  }
}
```

## Error handling

### Handling conditional check failures

```typescript
try {
  await table.put({
    item: { pk: 'USER#123', sk: 'PROFILE' },
    condition: { attribute_not_exists: 'pk' }
  })
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    // Condition was not met - handle gracefully
    console.log('Condition failed: item already exists')
    // Decide: retry, return error, or take alternative action
  } else {
    // Other error - rethrow
    throw error
  }
}
```

### Retry strategies

```typescript
// Retry with exponential backoff for optimistic locking
async function updateWithRetry(
  key: Key,
  updateFn: (item: any) => any,
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Read current version
    const item = await table.get({ key })
    
    // Apply updates
    const updated = updateFn(item)
    
    try {
      // Try to write with version check
      await table.put({
        item: {
          ...updated,
          version: item.version + 1
        },
        condition: {
          version: { eq: item.version }
        }
      })
      return updated
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        // Retry with exponential backoff
        await sleep(Math.pow(2, attempt) * 100)
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}
```

## Performance considerations

### Conditional writes vs read-before-write

```typescript
// Scenario: Update user profile if email not taken

// ❌ Read-before-write: 2 operations
const existing = await table.query({
  indexName: 'EmailIndex',
  keyCondition: { email: newEmail }
})
if (existing.items.length === 0) {
  await table.update({
    key: { pk: 'USER#123', sk: 'PROFILE' },
    updates: { email: newEmail }
  })
}

// ✅ Conditional write: 1 operation
await table.update({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  updates: { email: newEmail },
  condition: {
    $or: [
      { attribute_not_exists: 'email' },
      { email: { ne: newEmail } }
    ]
  }
})
```

### Cost comparison

| Scenario | Read-Before-Write | Conditional Write | Savings |
|----------|------------------|-------------------|---------|
| **Operations** | 2 (read + write) | 1 (write) | 50% |
| **RCU** | 1+ | 0 | 100% |
| **WCU** | 1 | 1 | 0% |
| **Latency** | 2x network RTT | 1x network RTT | 50% |

## Common mistakes to avoid

### ❌ mistake 1: not handling conditional failures

```typescript
// Bad: Ignoring conditional check failures
await table.put({
  item: { pk: 'USER#123', sk: 'PROFILE' },
  condition: { attribute_not_exists: 'pk' }
})
// If condition fails, error is thrown but not handled!

// Good: Handle conditional failures
try {
  await table.put({
    item: { pk: 'USER#123', sk: 'PROFILE' },
    condition: { attribute_not_exists: 'pk' }
  })
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    // Handle gracefully
  }
}
```

### ❌ mistake 2: overly complex conditions

```typescript
// Bad: Complex nested conditions
condition: {
  $and: [
    { $or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] },
    { $or: [{ c: { eq: 3 } }, { d: { eq: 4 } }] },
    { $not: { e: { eq: 5 } } }
  ]
}

// Good: Simplify or split into multiple operations
condition: {
  status: { eq: 'ACTIVE' },
  balance: { gte: 0 }
}
```

### ❌ mistake 3: using conditions for authorization

```typescript
// Bad: Using conditions for access control
await table.update({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  updates: { name: 'New Name' },
  condition: { userId: { eq: currentUserId } }
})

// Good: Check authorization in application code
if (item.userId !== currentUserId) {
  throw new Error('Unauthorized')
}
await table.update({
  key: { pk: 'USER#123', sk: 'PROFILE' },
  updates: { name: 'New Name' }
})
```

## Key takeaways

1. **Use conditional writes** - eliminate read-before-write patterns
2. **Implement optimistic locking** - use version numbers for concurrent updates
3. **Enforce business rules** - validate at database level
4. **Handle failures gracefully** - catch ConditionalCheckFailedException
5. **Keep conditions simple** - complex conditions are hard to maintain

## Related best practices

- [Query vs scan](query-vs-scan.md) - Efficient data retrieval
- [Batch operations](batch-operations/) - Note: batches don't support conditions
- [Key design](key-design.md) - Design keys to support your conditions

## Related guides

- [Core operations](../guides/core-operations/) - Using conditions in basic operations
- [Transactions](../guides/transactions/) - When you need multiple conditional operations
- [Access patterns](../guides/access-patterns/) - Design patterns with conditional writes
