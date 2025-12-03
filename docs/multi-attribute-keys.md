# Multi-Attribute Composite Keys

## Overview

DynamoDB supports multi-attribute composite keys in Global Secondary Indexes (GSIs), allowing up to 4 attributes for both partition keys and sort keys. This feature eliminates the need for manual string concatenation and preserves native data types, providing better type safety and more flexible querying.

## Benefits

### 1. Native Type Preservation
Each attribute retains its original type (string, number, or binary), avoiding the need to convert everything to strings.

```typescript
// ❌ Old way: Concatenated strings
const pk = `TENANT#${tenantId}#CUSTOMER#${customerId}` // Everything becomes a string

// ✅ New way: Multi-attribute keys
const pk = [tenantId, customerId, departmentId] // Types preserved
```

### 2. Improved Distribution
Multi-attribute partition keys can reduce hot partition risk by distributing data across more partition key combinations.

```typescript
// Better distribution with multi-attribute partition key
const gsiConfig = {
  indexName: 'TenantIndex',
  partitionKey: {
    attributes: [
      { name: 'tenantId', type: 'string' },
      { name: 'customerId', type: 'string' },
    ],
  },
}
```

### 3. Flexible Querying
Query on increasingly specific attribute combinations with left-to-right matching for sort keys.

```typescript
// Query by country only
multiSk: ['USA']

// Query by country and state
multiSk: ['USA', 'CA']

// Query by country, state, and city
multiSk: ['USA', 'CA', 'San Francisco']
```

### 4. Type Safety
Strongly typed multi-attribute key definitions catch errors at compile time.

```typescript
// TypeScript will enforce correct types
const key = multiTenantKey('TENANT-123', 'CUSTOMER-456') // ✓
const key = multiTenantKey(123, 456) // ✗ Type error
```

## Common Use Cases

### 1. Multi-Tenant Applications

Perfect for SaaS applications with hierarchical tenant structures.

```typescript
import { multiTenantKey } from 'ddb-lib'

const accessPatterns = {
  getUsersByTenant: {
    index: 'TenantIndex',
    gsiConfig: {
      indexName: 'TenantIndex',
      partitionKey: {
        attributes: [
          { name: 'tenantId', type: 'string' },
          { name: 'customerId', type: 'string' },
        ],
      },
    },
    keyCondition: (params: { tenantId: string; customerId: string }) => ({
      multiPk: multiTenantKey(params.tenantId, params.customerId),
    }),
  },
}

// Query all users for a specific tenant and customer
const users = await client.executePattern('getUsersByTenant', {
  tenantId: 'ACME-CORP',
  customerId: 'CUSTOMER-001',
})
```

### 2. Hierarchical Data (Location-Based)

Query data by increasingly specific geographic locations.

```typescript
import { hierarchicalMultiKey } from 'ddb-lib'

const accessPatterns = {
  getUsersByLocation: {
    index: 'LocationIndex',
    gsiConfig: {
      indexName: 'LocationIndex',
      partitionKey: {
        attributes: [{ name: 'tenantId', type: 'string' }],
      },
      sortKey: {
        attributes: [
          { name: 'country', type: 'string' },
          { name: 'state', type: 'string' },
          { name: 'city', type: 'string' },
        ],
      },
    },
    keyCondition: (params: {
      tenantId: string
      country?: string
      state?: string
      city?: string
    }) => ({
      multiPk: [params.tenantId],
      multiSk: hierarchicalMultiKey(
        params.country!,
        params.state,
        params.city
      ),
    }),
  },
}

// Query all users in USA
const usaUsers = await client.executePattern('getUsersByLocation', {
  tenantId: 'TENANT-123',
  country: 'USA',
})

// Query all users in California
const caUsers = await client.executePattern('getUsersByLocation', {
  tenantId: 'TENANT-123',
  country: 'USA',
  state: 'CA',
})

// Query all users in San Francisco
const sfUsers = await client.executePattern('getUsersByLocation', {
  tenantId: 'TENANT-123',
  country: 'USA',
  state: 'CA',
  city: 'San Francisco',
})
```

### 3. Time-Series with Categories

Combine categorical data with timestamps for efficient time-series queries.

```typescript
import { timeSeriesMultiKey } from 'ddb-lib'

const accessPatterns = {
  getEventsByCategory: {
    index: 'EventIndex',
    gsiConfig: {
      indexName: 'EventIndex',
      partitionKey: {
        attributes: [{ name: 'category', type: 'string' }],
      },
      sortKey: {
        attributes: [
          { name: 'timestamp', type: 'number' },
          { name: 'priority', type: 'number' },
        ],
      },
    },
    keyCondition: (params: {
      category: string
      timestampFrom?: number
      priority?: number
    }) => {
      const result: KeyCondition = {
        multiPk: [params.category],
      }

      if (params.timestampFrom !== undefined) {
        if (params.priority !== undefined) {
          result.multiSk = { gte: [params.timestampFrom, params.priority] }
        } else {
          result.multiSk = { gte: [params.timestampFrom] }
        }
      }

      return result
    },
  },
}

// Query all ERROR events
const allErrors = await client.executePattern('getEventsByCategory', {
  category: 'ERROR',
})

// Query ERROR events from a specific timestamp
const recentErrors = await client.executePattern('getEventsByCategory', {
  category: 'ERROR',
  timestampFrom: Date.now() - 3600000, // Last hour
})

// Query high-priority ERROR events from a specific timestamp
const criticalErrors = await client.executePattern('getEventsByCategory', {
  category: 'ERROR',
  timestampFrom: Date.now() - 3600000,
  priority: 1,
})
```

### 4. Product Categorization

Organize products with multiple levels of categorization.

```typescript
import { productCategoryMultiKey } from 'ddb-lib'

const accessPatterns = {
  getProductsByCategory: {
    index: 'CategoryIndex',
    gsiConfig: {
      indexName: 'CategoryIndex',
      partitionKey: {
        attributes: [
          { name: 'category', type: 'string' },
          { name: 'subcategory', type: 'string' },
        ],
      },
      sortKey: {
        attributes: [
          { name: 'brand', type: 'string' },
          { name: 'price', type: 'number' },
        ],
      },
    },
    keyCondition: (params: {
      category: string
      subcategory: string
      brand?: string
      minPrice?: number
    }) => ({
      multiPk: [params.category, params.subcategory],
      multiSk: params.brand
        ? params.minPrice
          ? { gte: [params.brand, params.minPrice] }
          : [params.brand]
        : undefined,
    }),
  },
}

// Query all laptops
const laptops = await client.executePattern('getProductsByCategory', {
  category: 'Electronics',
  subcategory: 'Laptops',
})

// Query Apple laptops
const appleLaptops = await client.executePattern('getProductsByCategory', {
  category: 'Electronics',
  subcategory: 'Laptops',
  brand: 'Apple',
})

// Query Apple laptops over $2000
const premiumAppleLaptops = await client.executePattern('getProductsByCategory', {
  category: 'Electronics',
  subcategory: 'Laptops',
  brand: 'Apple',
  minPrice: 2000,
})
```

## Helper Functions

The library provides several helper functions for common multi-attribute key patterns:

### multiAttributeKey()
Generic helper for creating multi-attribute keys.

```typescript
import { multiAttributeKey } from 'ddb-lib'

const key = multiAttributeKey('value1', 'value2', 'value3')
// Returns: ['value1', 'value2', 'value3']
```

### multiTenantKey()
For multi-tenant applications with tenant and customer hierarchy.

```typescript
import { multiTenantKey } from 'ddb-lib'

const key = multiTenantKey('TENANT-123', 'CUSTOMER-456')
// Returns: ['TENANT-123', 'CUSTOMER-456']

const keyWithDept = multiTenantKey('TENANT-123', 'CUSTOMER-456', 'DEPT-A')
// Returns: ['TENANT-123', 'CUSTOMER-456', 'DEPT-A']
```

### hierarchicalMultiKey()
For hierarchical data structures (up to 4 levels).

```typescript
import { hierarchicalMultiKey } from 'ddb-lib'

const key = hierarchicalMultiKey('USA', 'CA', 'San Francisco', 'Downtown')
// Returns: ['USA', 'CA', 'San Francisco', 'Downtown']
```

### timeSeriesMultiKey()
For time-series data with categories.

```typescript
import { timeSeriesMultiKey } from 'ddb-lib'

const key = timeSeriesMultiKey('ERROR', new Date('2025-12-02'))
// Returns: ['ERROR', 1733097600000]

const keyWithSubcategory = timeSeriesMultiKey('ERROR', 1733097600000, 'DATABASE')
// Returns: ['ERROR', 1733097600000, 'DATABASE']
```

### locationMultiKey()
For location-based data.

```typescript
import { locationMultiKey } from 'ddb-lib'

const key = locationMultiKey('USA', 'CA', 'San Francisco', 'SOMA')
// Returns: ['USA', 'CA', 'San Francisco', 'SOMA']
```

### statusPriorityMultiKey()
For task management and workflow systems.

```typescript
import { statusPriorityMultiKey } from 'ddb-lib'

const key = statusPriorityMultiKey('PENDING', 1, 'USER-123')
// Returns: ['PENDING', 1, 'USER-123']
```

## Comparison Operators

Multi-attribute sort keys support all standard DynamoDB comparison operators:

### Equality
```typescript
multiSk: ['USA', 'CA']
```

### Greater Than / Greater Than or Equal
```typescript
multiSk: { gt: ['USA', 'CA'] }
multiSk: { gte: ['USA', 'CA'] }
```

### Less Than / Less Than or Equal
```typescript
multiSk: { lt: ['USA', 'NY'] }
multiSk: { lte: ['USA', 'NY'] }
```

### Between
```typescript
multiSk: {
  between: [
    ['USA', 'CA'],
    ['USA', 'NY'],
  ],
}
```

## Migration from Concatenated Keys

### Before (Concatenated Strings)

```typescript
// Old approach with string concatenation
const accessPatterns = {
  getUsersByTenant: {
    index: 'TenantIndex',
    keyCondition: (params: { tenantId: string; customerId: string }) => ({
      pk: `TENANT#${params.tenantId}#CUSTOMER#${params.customerId}`,
    }),
  },
}

// Problems:
// - Everything is a string (no type safety)
// - Manual parsing required
// - Prone to separator conflicts
// - Less efficient queries
```

### After (Multi-Attribute Keys)

```typescript
// New approach with multi-attribute keys
const accessPatterns = {
  getUsersByTenant: {
    index: 'TenantIndex',
    gsiConfig: {
      indexName: 'TenantIndex',
      partitionKey: {
        attributes: [
          { name: 'tenantId', type: 'string' },
          { name: 'customerId', type: 'string' },
        ],
      },
    },
    keyCondition: (params: { tenantId: string; customerId: string }) => ({
      multiPk: [params.tenantId, params.customerId],
    }),
  },
}

// Benefits:
// - Type safety (TypeScript enforces correct types)
// - No parsing needed
// - No separator conflicts
// - More efficient queries
// - Better distribution
```

### Migration Strategy

1. **Create new GSI with multi-attribute keys**
   ```typescript
   // Add new GSI to your DynamoDB table
   {
     IndexName: 'TenantIndexV2',
     KeySchema: [
       { AttributeName: 'tenantId', KeyType: 'HASH' },
       { AttributeName: 'customerId', KeyType: 'RANGE' },
     ],
     // ... other GSI configuration
   }
   ```

2. **Backfill data with separate attributes**
   ```typescript
   // Update existing items to include separate attributes
   await client.update(key, {
     tenantId: 'TENANT-123',
     customerId: 'CUSTOMER-456',
   })
   ```

3. **Update access patterns to use multi-attribute keys**
   ```typescript
   // Switch to new pattern
   const users = await client.executePattern('getUsersByTenantV2', {
     tenantId: 'TENANT-123',
     customerId: 'CUSTOMER-456',
   })
   ```

4. **Remove old concatenated attributes and GSI**
   Once all queries are migrated, remove the old GSI and attributes.

## Limitations and Best Practices

### Limitations

1. **Maximum 4 attributes per key**
   - Partition keys: up to 4 attributes
   - Sort keys: up to 4 attributes

2. **Left-to-right matching for sort keys**
   - You cannot skip attributes in sort key queries
   - Valid: `['USA']`, `['USA', 'CA']`, `['USA', 'CA', 'SF']`
   - Invalid: `['USA', undefined, 'SF']` (skipping state)

3. **Supported types only**
   - string, number, binary
   - No support for boolean, list, map, etc.

### Best Practices

1. **Order attributes by query patterns**
   ```typescript
   // Put most commonly queried attributes first
   sortKey: {
     attributes: [
       { name: 'country', type: 'string' },    // Most common
       { name: 'state', type: 'string' },      // Less common
       { name: 'city', type: 'string' },       // Least common
     ],
   }
   ```

2. **Use validation**
   ```typescript
   // Always provide gsiConfig for validation
   gsiConfig: {
     indexName: 'MyIndex',
     partitionKey: { attributes: [...] },
     sortKey: { attributes: [...] },
   }
   ```

3. **Consider cardinality**
   ```typescript
   // High cardinality attributes first for better distribution
   partitionKey: {
     attributes: [
       { name: 'tenantId', type: 'string' },    // High cardinality
       { name: 'customerId', type: 'string' },  // High cardinality
     ],
   }
   ```

4. **Use helper functions**
   ```typescript
   // Use provided helpers for common patterns
   import { multiTenantKey, hierarchicalMultiKey } from 'ddb-lib'
   
   const pk = multiTenantKey(tenantId, customerId)
   const sk = hierarchicalMultiKey(country, state, city)
   ```

## Type Safety

The library provides full TypeScript type safety for multi-attribute keys:

```typescript
// Type-safe access pattern definition
const accessPatterns = {
  getUsersByLocation: {
    keyCondition: (params: {
      tenantId: string
      country: string
      state?: string
    }) => ({
      multiPk: [params.tenantId],
      multiSk: [params.country, params.state].filter((v): v is string => v !== undefined),
    }),
  },
} satisfies AccessPatternDefinitions<User>

// TypeScript enforces correct parameter types
await client.executePattern('getUsersByLocation', {
  tenantId: 'TENANT-123',
  country: 'USA',
  state: 'CA',
}) // ✓

await client.executePattern('getUsersByLocation', {
  tenantId: 123, // ✗ Type error: number not assignable to string
  country: 'USA',
})
```

## Validation

The library validates multi-attribute keys at runtime:

```typescript
// Validates attribute count
multiPk: ['value1', 'value2', 'value3', 'value4', 'value5']
// Error: Cannot have more than 4 attributes

// Validates attribute types
multiPk: ['string', 123, 'another']
// Error if config expects all strings

// Validates against GSI configuration
gsiConfig: {
  partitionKey: {
    attributes: [
      { name: 'tenantId', type: 'string' },
      { name: 'customerId', type: 'number' },
    ],
  },
}
multiPk: ['TENANT-123', 'not-a-number']
// Error: customerId must be a number
```

## Additional Resources

- [DynamoDB Multi-Attribute Keys Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [Single-Table Design Patterns](./single-table-design.md)
- [Access Patterns Guide](./access-patterns.md)
