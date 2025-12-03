# Anti-Pattern Detection Implementation

## Overview
Implemented comprehensive anti-pattern detection in the StatsCollector to identify common DynamoDB usage issues and provide actionable recommendations.

## Features Implemented

### 1. Fetching to Filter Pattern Detection
**Method**: `detectFetchingToFilter()`

Identifies queries that fetch many items but return few, suggesting client-side filtering instead of using DynamoDB's FilterExpression.

- Tracks query efficiency (items returned / items scanned)
- Groups operations by access pattern or table+index
- Generates warnings when average efficiency < 50%
- Requires minimum 3 operations to avoid false positives
- Severity: `warning` for <20% efficiency, `info` for 20-50%

**Recommendation**: Use FilterExpression to filter on the server side, reducing data transfer and RCU consumption.

### 2. Sequential Writes Pattern Detection
**Method**: `detectSequentialWrites()`

Identifies multiple put/delete operations within short time windows that could be batched.

- Detects clusters of write operations within 1-second windows
- Tracks both put and delete operations
- Requires minimum 3 operations per cluster
- Calculates batch reduction (e.g., 30 requests → 2 batch requests)

**Recommendation**: Use batchWrite() to combine operations, reducing network overhead and improving throughput.

### 3. Read-Before-Write Pattern Detection
**Method**: `detectReadBeforeWrite()`

Identifies get operations followed by put on the same key, suggesting the use of update instead.

- Tracks operations by partition key + sort key
- Detects get followed by put within 5-second window
- Requires minimum 3 occurrences to recommend
- Calculates 50% operation reduction potential

**Recommendation**: Use update() instead of get() + put() to modify items in place, reducing latency and capacity consumption.

### 4. Large Item Pattern Detection
**Method**: `detectLargeItems()`

Identifies items exceeding size thresholds that should potentially use S3.

- Tracks item sizes on put and update operations
- Two severity levels:
  - `info`: 100KB-300KB items
  - `warning`: >300KB items (approaching 400KB DynamoDB limit)
- Includes average and max sizes in recommendations

**Recommendation**: Store large attributes in S3 with references in DynamoDB to reduce costs and improve performance.

### 5. Uniform Partition Key Pattern Detection
**Method**: `detectUniformPartitionKeys()`

Identifies sequential or predictable partition key patterns that lead to poor distribution.

- Detects sequential numeric patterns (>50% sequential)
- Detects timestamp-based partition keys (ISO dates or Unix timestamps)
- Requires minimum 20 samples for statistical significance
- Severity: `warning` for both patterns

**Recommendations**:
- For sequential keys: Use hash-based or random components (UUIDs, hashing)
- For timestamp keys: Use timestamps in sort keys, add distributed partition key component

## Type System Updates

### Extended OperationStats Interface
Added new optional fields to track anti-pattern data:

```typescript
interface OperationStats {
  // ... existing fields ...
  
  /** Partition key value (for tracking hot partitions and patterns) */
  partitionKey?: string
  
  /** Sort key value (for tracking patterns) */
  sortKey?: string
  
  /** Item size in bytes (for large item detection) */
  itemSizeBytes?: number
}
```

## Integration

All anti-pattern detection methods are automatically called by `getRecommendations()`:

```typescript
const recommendations = collector.getRecommendations()
// Returns array including:
// - Hot partition recommendations
// - Scan inefficiency recommendations
// - Batch opportunity recommendations
// - Multi-attribute key recommendations
// - Projection recommendations
// - Anti-pattern recommendations (NEW)
```

## Test Coverage

Created comprehensive test suite in `src/stats-collector-anti-patterns.test.ts`:

- 35 test cases covering all anti-pattern detection methods
- Tests for edge cases (minimum thresholds, missing data, etc.)
- Integration tests with overall recommendation system
- All tests passing ✓

## Requirements Satisfied

✅ **Requirement 5.4**: Detect inefficient patterns and generate recommendations
- Fetching to filter pattern
- Sequential writes pattern
- Read-before-write pattern
- Large item pattern
- Uniform partition key pattern

## Usage Example

```typescript
const collector = new StatsCollector({ enabled: true })

// Operations are recorded automatically by TableClient
// ...

// Get all recommendations including anti-patterns
const recommendations = collector.getRecommendations()

for (const rec of recommendations) {
  console.log(`[${rec.severity}] ${rec.message}`)
  console.log(`  ${rec.details}`)
  console.log(`  Action: ${rec.suggestedAction}`)
  if (rec.estimatedImpact) {
    console.log(`  Impact: ${JSON.stringify(rec.estimatedImpact)}`)
  }
}
```

## Performance Impact

- Minimal overhead: Detection runs only when `getRecommendations()` is called
- No impact on operation recording
- Efficient algorithms with O(n) complexity for most detections
- Configurable sampling rate to reduce data collection overhead

## Future Enhancements

Potential additional anti-patterns to detect:
- Excessive use of strongly consistent reads
- Missing TTL on time-series data
- Over-provisioned capacity
- Unused conditional expressions
- Inefficient projection expressions
