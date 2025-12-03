# Multi-Attribute Composite Keys for DynamoDB GSIs

## Overview

Amazon DynamoDB now supports multi-attribute composite keys in Global Secondary Indexes (GSIs), allowing up to 4 attributes for both partition keys and sort keys. This feature eliminates the need for manual string concatenation and preserves native data types.

## Key Benefits

1. **Native Type Preservation**: Each attribute retains its native data type (string, number, binary)
2. **Improved Distribution**: Multi-attribute partition keys reduce hot partition risk
3. **Flexible Querying**: Query on increasingly specific attribute combinations from left to right
4. **Simplified Data Modeling**: No need for synthetic concatenated attributes
5. **Type Safety**: Strongly typed multi-attribute key definitions in TypeScript

## Implementation in DynamoDB Wrapper

### Type Definitions

```typescript
// Multi-attribute key configuration
interface MultiAttributeKey {
  attributes: Array<{
    name: string
    type: 'string' | 'number' | 'binary'
  }>
}

// GSI configuration with multi-attribute support
interface GSIConfig {
  indexName: string
  partitionKey: string | MultiAttributeKey
  sortKey?: string | MultiAttributeKey
}

// Extended KeyCondition interface
interface KeyCondition {
  // Traditional keys
  pk?: string | number | Uint8Array
  sk?: string | number | Uint8Array | { /* operators */ }
  
  // Multi-attribute keys
  multiPk?: Array<string | number | Uint8Array>
  multiSk?: Array<string | number | Uint8Array> | { /* operators */ }
}
```

### Usage Examples

#### Multi-Tenant Application

```typescript
// Define GSI with multi-attribute partition key
const gsiConfig: GSIConfig = {
  indexName: 'TenantCustomerIndex',
  partitionKey: {
    attributes: [
      { name: 'tenantId', type: 'string' },
      { name: 'customerId', type: 'string' }
    ]
  },
  sortKey: {
    attributes: [
      { name: 'orderDate', type: 'number' },
      { name: 'orderId', type: 'string' }
    ]
  }
}

// Access pattern using multi-attribute keys
const patterns = {
  getCustomerOrders: {
    index: 'TenantCustomerIndex',
    gsiConfig,
    keyCondition: (params: {
      tenantId: string
      customerId: string
      fromDate?: number
    }) => ({
      multiPk: [params.tenantId, params.customerId],
      multiSk: params.fromDate ? {
        gte: [params.fromDate]
      } : undefined
    })
  }
}

// Query execution
const orders = await table.executePattern('getCustomerOrders', {
  tenantId: 'TENANT-123',
  customerId: 'CUST-456',
  fromDate: Date.now() - 30 * 24 * 60 * 60 * 1000 // Last 30 days
})
```

#### Hierarchical Location Data

```typescript
// GSI for location-based queries
const locationGSI: GSIConfig = {
  indexName: 'LocationIndex',
  partitionKey: { name: 'userId', type: 'string' },
  sortKey: {
    attributes: [
      { name: 'country', type: 'string' },
      { name: 'state', type: 'string' },
      { name: 'city', type: 'string' }
    ]
  }
}

// Query all locations for a user
const allLocations = await table.query({
  index: 'LocationIndex',
  keyCondition: {
    pk: 'USER-123'
  }
})

// Query specific country
const usLocations = await table.query({
  index: 'LocationIndex',
  keyCondition: {
    pk: 'USER-123',
    multiSk: ['USA']
  }
})

// Query specific state
const caLocations = await table.query({
  index: 'LocationIndex',
  keyCondition: {
    pk: 'USER-123',
    multiSk: ['USA', 'CA']
  }
})

// Query specific city
const sfLocations = await table.query({
  index: 'LocationIndex',
  keyCondition: {
    pk: 'USER-123',
    multiSk: ['USA', 'CA', 'San Francisco']
  }
})
```

#### Time-Series with Categories

```typescript
// GSI for categorized time-series data
const timeSeriesGSI: GSIConfig = {
  indexName: 'CategoryTimeIndex',
  partitionKey: { name: 'deviceId', type: 'string' },
  sortKey: {
    attributes: [
      { name: 'category', type: 'string' },
      { name: 'timestamp', type: 'number' },
      { name: 'priority', type: 'number' }
    ]
  }
}

// Query high-priority temperature readings from last hour
const readings = await table.query({
  index: 'CategoryTimeIndex',
  keyCondition: {
    pk: 'DEVICE-789',
    multiSk: {
      between: [
        ['temperature', Date.now() - 3600000, 1],
        ['temperature', Date.now(), 10]
      ]
    }
  }
})
```

## Pattern Helpers

The wrapper provides helper methods for common multi-attribute key patterns:

```typescript
// Multi-tenant key
const key = PatternHelpers.multiTenantKey('TENANT-123', 'CUST-456', 'DEPT-789')
// Returns: ['TENANT-123', 'CUST-456', 'DEPT-789']

// Hierarchical key
const locationKey = PatternHelpers.hierarchicalMultiKey('USA', 'CA', 'San Francisco')
// Returns: ['USA', 'CA', 'San Francisco']

// Time-series with category
const tsKey = PatternHelpers.timeSeriesMultiKey('temperature', new Date(), 'sensor-1')
// Returns: ['temperature', 1733184000000, 'sensor-1']

// Validation
PatternHelpers.validateMultiAttributeKey(
  ['TENANT-123', 'CUST-456'],
  {
    attributes: [
      { name: 'tenantId', type: 'string' },
      { name: 'customerId', type: 'string' }
    ]
  }
)
```

## Migration from Concatenated Keys

### Before (Concatenated Keys)

```typescript
// Old approach: manual concatenation
const item = {
  pk: 'USER#123',
  sk: 'ORDER#456',
  gsi1pk: 'TENANT#ABC#CUSTOMER#XYZ',
  gsi1sk: 'USA#CA#San Francisco',
  // ... other attributes
}

// Querying requires exact string matching
const result = await table.query({
  index: 'GSI1',
  keyCondition: {
    pk: 'TENANT#ABC#CUSTOMER#XYZ',
    sk: { beginsWith: 'USA#CA' }
  }
})

// Problems:
// - Type information lost (everything is string)
// - Manual parsing required
// - Error-prone concatenation
// - Difficult to query partial keys
```

### After (Multi-Attribute Keys)

```typescript
// New approach: multi-attribute keys
const item = {
  pk: 'USER#123',
  sk: 'ORDER#456',
  tenantId: 'ABC',
  customerId: 'XYZ',
  country: 'USA',
  state: 'CA',
  city: 'San Francisco',
  // ... other attributes
}

// GSI uses native attributes
const gsiConfig: GSIConfig = {
  indexName: 'GSI1',
  partitionKey: {
    attributes: [
      { name: 'tenantId', type: 'string' },
      { name: 'customerId', type: 'string' }
    ]
  },
  sortKey: {
    attributes: [
      { name: 'country', type: 'string' },
      { name: 'state', type: 'string' },
      { name: 'city', type: 'string' }
    ]
  }
}

// Querying with type safety
const result = await table.query({
  index: 'GSI1',
  keyCondition: {
    multiPk: ['ABC', 'XYZ'],
    multiSk: ['USA', 'CA'] // Partial match supported
  }
})

// Benefits:
// - Type safety maintained
// - No manual parsing
// - Flexible partial matching
// - Better query performance
```

### Migration Steps

1. **Add New Attributes**: Add individual attributes to your items
   ```typescript
   // Add tenantId, customerId as separate attributes
   await table.update(key, {
     tenantId: 'ABC',
     customerId: 'XYZ'
   })
   ```

2. **Create New GSI**: Create GSI with multi-attribute keys
   ```typescript
   // Use AWS Console or CloudFormation to create GSI
   // with multi-attribute partition/sort keys
   ```

3. **Update Access Patterns**: Migrate queries to use multi-attribute keys
   ```typescript
   // Old pattern
   const oldPattern = {
     keyCondition: (params) => ({
       pk: `TENANT#${params.tenantId}#CUSTOMER#${params.customerId}`
     })
   }
   
   // New pattern
   const newPattern = {
     keyCondition: (params) => ({
       multiPk: [params.tenantId, params.customerId]
     })
   }
   ```

4. **Backfill Data**: Ensure all items have the new attributes

5. **Remove Old GSI**: Once migration is complete, remove old concatenated GSI

## Best Practices

### 1. Attribute Order Matters

Multi-attribute sort keys support left-to-right partial matching:

```typescript
// Sort key: [country, state, city]

// ✅ Valid queries
multiSk: ['USA']                    // Match country only
multiSk: ['USA', 'CA']              // Match country and state
multiSk: ['USA', 'CA', 'SF']        // Match all three

// ❌ Invalid queries
multiSk: ['CA']                     // Can't skip country
multiSk: ['USA', 'SF']              // Can't skip state
```

**Recommendation**: Order attributes from least to most specific.

### 2. Choose Attributes Wisely

For partition keys, choose attributes that:
- Provide good distribution
- Are frequently queried together
- Have high cardinality

```typescript
// ✅ Good: High cardinality, even distribution
multiPk: [tenantId, customerId, departmentId]

// ❌ Bad: Low cardinality, potential hot partitions
multiPk: [accountType, status] // Only a few possible values
```

### 3. Limit Attribute Count

While DynamoDB supports up to 4 attributes, fewer is often better:
- Easier to understand and maintain
- Simpler query patterns
- Better performance

```typescript
// ✅ Good: 2-3 attributes for most use cases
multiPk: [tenantId, customerId]
multiSk: [category, timestamp]

// ⚠️ Consider: Do you really need 4 attributes?
multiSk: [level1, level2, level3, level4]
```

### 4. Type Consistency

Use consistent types across your data model:

```typescript
// ✅ Good: Consistent timestamp type
multiSk: [category, timestamp] // timestamp is always number

// ❌ Bad: Mixed types for same semantic meaning
multiSk: [category, timestamp] // sometimes number, sometimes string
```

### 5. Validation

Always validate multi-attribute keys against GSI configuration:

```typescript
const pattern = {
  index: 'MyGSI',
  gsiConfig: {
    indexName: 'MyGSI',
    partitionKey: {
      attributes: [
        { name: 'tenantId', type: 'string' },
        { name: 'customerId', type: 'string' }
      ]
    }
  },
  keyCondition: (params) => {
    const key = [params.tenantId, params.customerId]
    // Wrapper automatically validates against gsiConfig
    return { multiPk: key }
  }
}
```

## Limitations

1. **No beginsWith for Multi-Attribute Sort Keys**: The `beginsWith` operator is not supported for multi-attribute sort keys. Use partial array matching instead.

2. **Maximum 4 Attributes**: Each key (partition or sort) can have at most 4 attributes.

3. **GSI Only**: Multi-attribute keys are only supported for GSIs, not for primary keys or LSIs.

4. **Left-to-Right Matching**: Sort key queries must match attributes from left to right (no skipping).

5. **Type Constraints**: Each attribute must be string, number, or binary (no complex types).

## Performance Considerations

### Query Performance

Multi-attribute keys can improve query performance by:
- Reducing the need for filter expressions
- Enabling more precise key conditions
- Better utilizing DynamoDB's indexing

### Write Performance

Multi-attribute keys have minimal impact on write performance:
- No additional marshalling overhead
- Same WCU consumption as single-attribute keys
- Better distribution can reduce throttling

### Storage

Multi-attribute keys may slightly increase storage:
- Each attribute is stored separately
- But eliminates need for concatenated synthetic attributes
- Net storage impact is typically neutral or positive

## Troubleshooting

### Error: "Too many attributes"

```typescript
// ❌ Error: More than 4 attributes
multiPk: [attr1, attr2, attr3, attr4, attr5]

// ✅ Solution: Limit to 4 attributes
multiPk: [attr1, attr2, attr3, attr4]
```

### Error: "Type mismatch"

```typescript
// ❌ Error: Number provided for string attribute
multiPk: ['TENANT-123', 456] // customerId should be string

// ✅ Solution: Use correct type
multiPk: ['TENANT-123', 'CUST-456']
```

### Error: "Invalid partial match"

```typescript
// ❌ Error: Skipping middle attribute
multiSk: ['USA', 'San Francisco'] // Can't skip state

// ✅ Solution: Include all attributes up to desired level
multiSk: ['USA', 'CA', 'San Francisco']
```

## References

- [AWS Documentation: Multi-Attribute Keys](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.DesignPattern.MultiAttributeKeys.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [GSI Design Patterns](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes.html)
