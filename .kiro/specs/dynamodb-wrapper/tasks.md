# Implementation Plan

- [x] 1. Project setup and core infrastructure
  - Create package structure with src directory
  - Configure TypeScript with strict mode and ESM support
  - Add AWS SDK dependencies (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb)
  - Set up Rsbuild for building
  - Set up Rstest for testing
  - Set up Biome for linting and formatting
  - Create basic exports in index.ts
  - _Requirements: 1.3_

- [x] 2. Implement core type definitions
  - Define Key, KeyCondition, FilterExpression interfaces
  - Define QueryResult, ScanResult interfaces
  - Define operation options interfaces (GetOptions, PutOptions, UpdateOptions, DeleteOptions)
  - Define TableClientConfig interface
  - _Requirements: 1.1, 1.2_

- [x] 3. Implement basic error handling
  - Create DynamoDBWrapperError base class with code, operation, and context
  - Create ValidationError class for schema validation failures
  - Create ConditionalCheckError class for conditional check failures
  - Write unit tests for error classes
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 4. Implement TableClient foundation
- [x] 4.1 Create TableClient class with constructor
  - Implement constructor accepting TableClientConfig
  - Initialize DynamoDB client (create new or use provided)
  - Store table name and configuration
  - Expose getClient() method for direct SDK access
  - Write unit tests for initialization
  - _Requirements: 1.3, 1.4_

- [x] 4.2 Implement get operation
  - Implement get() method with Key parameter and GetOptions
  - Handle marshalling/unmarshalling using lib-dynamodb
  - Support consistentRead and projectionExpression options
  - Return null for non-existent items
  - Write unit tests with mocked DynamoDB client
  - _Requirements: 1.1, 1.5_

- [x] 4.3 Implement put operation
  - Implement put() method with item and PutOptions
  - Handle marshalling of item data
  - Support conditional writes via condition option
  - Support returnValues option
  - Write unit tests for put with various options
  - _Requirements: 1.1, 1.5_

- [x] 4.4 Implement update operation
  - Implement update() method with key, updates, and UpdateOptions
  - Build UpdateExpression from partial item updates
  - Support conditional updates
  - Support returnValues option
  - Return updated item
  - Write unit tests for update operations
  - _Requirements: 1.1, 1.5_

- [x] 4.5 Implement delete operation
  - Implement delete() method with key and DeleteOptions
  - Support conditional deletes
  - Support returnValues option
  - Write unit tests for delete operations
  - _Requirements: 1.1, 1.5_

- [x] 5. Implement schema system foundation
- [x] 5.1 Create base Schema interface and types
  - Define Schema<T> interface with parse and safeParse methods
  - Define SchemaShape type for object schemas
  - Create BaseSchema abstract class
  - Implement type inference helpers
  - _Requirements: 2.1, 2.3_

- [x] 5.2 Implement primitive schema types
  - Implement StringSchema class with parse/safeParse
  - Implement NumberSchema class with parse/safeParse
  - Implement BooleanSchema class with parse/safeParse
  - Write unit tests for each primitive type
  - _Requirements: 2.6_

- [x] 5.3 Implement complex schema types
  - Implement ArraySchema class with item type validation
  - Implement SetSchema class for DynamoDB sets
  - Implement BinarySchema class for binary data
  - Write unit tests for complex types
  - _Requirements: 2.6_

- [x] 5.4 Implement ObjectSchema
  - Implement ObjectSchema class with shape validation
  - Support nested object validation
  - Implement partial(), pick(), and omit() methods
  - Write unit tests for object schemas with nesting
  - _Requirements: 2.6_

- [x] 5.5 Implement schema builder API
  - Create schema builder object with factory methods
  - Implement optional() and nullable() wrappers
  - Add type inference for builder API
  - Write unit tests for schema composition
  - _Requirements: 2.1, 2.6_

- [x] 5.6 Integrate schema validation into TableClient
  - Add schema validation before put operations
  - Add schema validation before update operations
  - Throw ValidationError with field details on failure
  - Write integration tests with TableClient and schemas
  - _Requirements: 2.2, 2.5_

- [x] 6. Implement query and scan operations
- [x] 6.1 Create expression builders
  - Implement KeyConditionBuilder for building key expressions
  - Implement FilterExpressionBuilder for filter conditions
  - Handle expression attribute names and values
  - Write unit tests for expression building
  - _Requirements: 1.2, 3.3_

- [x] 6.2 Implement query operation
  - Implement query() method with QueryParams
  - Build KeyConditionExpression from params
  - Support FilterExpression
  - Support index selection (GSI/LSI)
  - Handle pagination with lastEvaluatedKey
  - Return QueryResult with items, count, scannedCount
  - Write unit tests for various query scenarios
  - _Requirements: 1.2, 3.3_

- [x] 6.3 Implement scan operation
  - Implement scan() method with ScanParams
  - Emit console warning about scan usage
  - Support FilterExpression
  - Handle pagination
  - Return ScanResult
  - Write unit tests for scan operations
  - _Requirements: 1.2, 5.5_

- [x] 6.4 Implement paginated iterators
  - Implement queryPaginated() returning AsyncIterableIterator
  - Implement scanPaginated() returning AsyncIterableIterator
  - Handle automatic pagination internally
  - Write unit tests for async iteration
  - _Requirements: 1.2_

- [x] 7. Implement access pattern system
- [x] 7.1 Define access pattern types
  - Define AccessPatternDefinition interface
  - Define AccessPatternDefinitions type
  - Create type helpers for pattern parameters
  - _Requirements: 4.1, 4.3_

- [x] 7.2 Implement pattern execution
  - Implement executePattern() method in TableClient
  - Look up pattern definition by name
  - Execute keyCondition function with params
  - Apply filter if defined
  - Apply transform if defined
  - Select correct index
  - Write unit tests for pattern execution
  - _Requirements: 4.2, 4.6_

- [x] 7.3 Add compile-time pattern validation
  - Add TypeScript types for pattern name validation
  - Ensure pattern params are type-checked
  - Write tests demonstrating type safety
  - _Requirements: 4.4_

- [x] 7.4 Implement multi-attribute composite key support
- [x] 7.4.1 Define multi-attribute key types
  - Define MultiAttributeKey interface for GSI configuration
  - Extend KeyCondition interface with multiPk and multiSk fields
  - Define GSIConfig interface with multi-attribute key support
  - Add type guards for multi-attribute vs single-attribute keys
  - Write unit tests for type definitions
  - _Requirements: 1.2, 2.7, 3.2, 3.5.1, 3.5.2, 3.5.3, 4.1_

- [x] 7.4.2 Implement multi-attribute key validation
  - Implement validateMultiAttributeKey() helper
  - Validate attribute count (max 4 per key)
  - Validate attribute types (string, number, binary)
  - Validate attribute order and completeness
  - Write unit tests for validation logic
  - _Requirements: 1.2, 2.7, 3.5.5, 3.5.6, 3.5.12_

- [x] 7.4.3 Implement multi-attribute key expression builder
  - Build KeyConditionExpression for multi-attribute partition keys
  - Build KeyConditionExpression for multi-attribute sort keys
  - Support comparison operators (eq, lt, lte, gt, gte, between)
  - Support partial sort key matching (left-to-right)
  - Generate proper ExpressionAttributeNames and ExpressionAttributeValues
  - Write unit tests for expression building
  - _Requirements: 1.2, 3.5.4, 3.5.7, 3.5.8_

- [x] 7.4.4 Integrate multi-attribute keys into query operations
  - Detect multi-attribute keys in KeyCondition
  - Route to appropriate expression builder
  - Support both single and multi-attribute keys in same codebase
  - Maintain backward compatibility with existing patterns
  - Write integration tests with mocked DynamoDB client
  - _Requirements: 1.2, 3.5.13, 3.5.14, 4.2_

- [x] 7.4.5 Add multi-attribute key pattern helpers
  - Implement multiAttributeKey() for array construction
  - Implement multiTenantKey() for multi-tenant patterns
  - Implement hierarchicalMultiKey() for hierarchical data
  - Implement timeSeriesMultiKey() for time-series with categories
  - Write unit tests for helper methods
  - _Requirements: 3.1, 3.2, 3.4, 3.5.11, 3.6_

- [x] 7.4.6 Update access pattern system for multi-attribute keys
  - Add gsiConfig field to AccessPatternDefinition
  - Validate multi-attribute keys against GSI configuration
  - Update executePattern() to handle multi-attribute keys
  - Write integration tests with multi-attribute access patterns
  - _Requirements: 3.5.9, 4.1, 4.2, 4.6_

- [x] 7.4.7 Add documentation and examples for multi-attribute keys
  - Document multi-attribute key concepts and benefits
  - Provide examples for common use cases (multi-tenant, hierarchical, time-series)
  - Show migration path from concatenated keys
  - Document limitations and best practices
  - _Requirements: 3.5.11, 3.5.13, 4.1, 4.2_

- [x] 8. Implement pattern helpers
- [x] 8.1 Implement composite key helpers
  - Implement compositeKey() static method
  - Implement parseCompositeKey() static method
  - Support configurable separator
  - Write unit tests for key composition and parsing
  - _Requirements: 3.2_

- [x] 8.2 Implement single-table design helpers
  - Implement entityKey() for entity type prefixes
  - Implement parseEntityKey() to extract type and ID
  - Write unit tests for entity key patterns
  - _Requirements: 3.1_

- [x] 8.3 Implement time-series helpers
  - Implement timeSeriesKey() for date-based keys
  - Implement ttlTimestamp() for TTL attributes
  - Support hour, day, month granularity
  - Write unit tests for time-series patterns
  - _Requirements: 3.6_

- [x] 8.4 Implement adjacency list helpers
  - Implement adjacencyKeys() for relationship patterns
  - Write unit tests for adjacency list patterns
  - _Requirements: 3.5_

- [x] 8.5 Implement hierarchical data helpers
  - Implement hierarchicalKey() for path-based keys
  - Implement parseHierarchicalKey() to extract path
  - Write unit tests for hierarchical patterns
  - _Requirements: 3.4_

- [x] 8.6 Implement hot partition prevention helpers
  - Implement distributedKey() for write sharding
  - Implement getShardNumber() to extract shard
  - Write unit tests for distributed keys
  - _Requirements: 3.1, 3.2_

- [x] 8.7 Implement optimistic locking helpers
  - Implement versionAttribute() for version field name
  - Implement incrementVersion() for version bumping
  - Write unit tests for version management
  - _Requirements: 3.1_

- [x] 8.8 Implement sparse index helpers
  - Implement sparseIndexValue() for conditional GSI attributes
  - Write unit tests for sparse index patterns
  - _Requirements: 3.3_

- [x] 8.9 Implement GSI overloading helper
  - Implement gsiKey() for GSI key construction
  - Write unit tests for GSI patterns
  - _Requirements: 3.3_

- [x] 9. Implement statistics collection
- [x] 9.1 Create StatsCollector class foundation
  - Define StatsConfig interface
  - Define OperationStats interface
  - Create StatsCollector class with configuration
  - Implement recordOperation() method
  - Implement sampling logic based on sampleRate
  - Write unit tests for stats recording
  - _Requirements: 5.1, 5.2, 5.8_

- [x] 9.2 Implement stats aggregation
  - Implement getStats() method
  - Aggregate metrics by operation type
  - Aggregate metrics by access pattern
  - Calculate averages and totals
  - Write unit tests for aggregation
  - _Requirements: 5.3_

- [x] 9.3 Implement stats export and reset
  - Implement export() method to return raw stats
  - Implement reset() method to clear stats
  - Write unit tests for export and reset
  - _Requirements: 5.2_

- [x] 9.4 Integrate stats collection into TableClient
  - Add statsCollector to TableClient
  - Record stats after each operation
  - Include consumed capacity in stats
  - Implement getStats() method on TableClient
  - Write integration tests for stats collection
  - _Requirements: 5.1, 5.8_

- [x] 10. Implement recommendation engine
- [x] 10.1 Implement hot partition detection
  - Implement detectHotPartitions() method
  - Track partition key access frequency
  - Identify partitions with >10% of traffic
  - Return HotPartitionReport array
  - Write unit tests for hot partition detection
  - _Requirements: 5.4_

- [x] 10.2 Implement scan inefficiency detection
  - Implement detectIneffientScans() method
  - Calculate scan efficiency (returned/scanned ratio)
  - Identify scans with <20% efficiency
  - Return ScanReport array
  - Write unit tests for scan detection
  - _Requirements: 5.4, 5.5_

- [x] 10.3 Implement unused index detection
  - Implement detectUnusedIndexes() method
  - Track index usage over time
  - Identify indexes not used in 7 days
  - Return IndexReport array
  - Write unit tests for index detection
  - _Requirements: 5.4_

- [x] 10.4 Implement capacity mode recommendations
  - Implement suggestCapacityMode() method
  - Analyze capacity utilization patterns
  - Calculate estimated costs for each mode
  - Return CapacityRecommendation
  - Write unit tests for capacity recommendations
  - _Requirements: 5.4, 5.6_

- [x] 10.5 Implement recommendation generation
  - Implement getRecommendations() method
  - Generate recommendations from detection methods
  - Prioritize by severity and impact
  - Include suggested actions
  - Write unit tests for recommendation generation
  - _Requirements: 5.4, 5.7_

- [x] 10.6 Integrate recommendations into TableClient
  - Implement getRecommendations() on TableClient
  - Emit warnings for high-severity recommendations
  - Write integration tests for recommendations
  - _Requirements: 5.4, 5.6_

- [x] 10.7 Implement multi-attribute key opportunity detection
  - Detect concatenated string patterns in key values (e.g., "TENANT#123#CUSTOMER#456")
  - Analyze GSI usage patterns for concatenation anti-patterns
  - Generate recommendations to migrate to multi-attribute keys
  - Calculate potential benefits (type safety, query flexibility)
  - Write unit tests for concatenation pattern detection
  - _Requirements: 3.5.10, 5.4_

- [x] 10.8 Implement hot partition multi-attribute key recommendations
  - Detect hot partitions on single-attribute GSI partition keys
  - Suggest adding attributes to create multi-attribute partition key
  - Provide examples of attribute combinations for better distribution
  - Write unit tests for multi-attribute key recommendations
  - _Requirements: 3.5.10, 5.4_

- [x] 11. Implement batch operations
- [x] 11.1 Implement batchGet operation
  - Implement batchGet() method with keys array
  - Automatically chunk to 100-item batches
  - Handle BatchGetItem API calls
  - Retry unprocessed keys
  - Support BatchGetOptions (consistentRead, projectionExpression)
  - Return array of items
  - Write unit tests for batch get with chunking
  - _Requirements: 1.2_

- [x] 11.2 Implement batchWrite operation
  - Implement batchWrite() method with operations array
  - Automatically chunk to 25-item batches
  - Handle BatchWriteItem API calls
  - Retry unprocessed items
  - Support BatchWriteOptions
  - Write unit tests for batch write with chunking
  - _Requirements: 1.2_

- [x] 11.3 Detect batch opportunities in stats
  - Track individual operations within time windows
  - Generate recommendations for batching
  - Write unit tests for batch opportunity detection
  - _Requirements: 5.4_

- [x] 12. Implement transactional operations
- [x] 12.1 Implement transactWrite operation
  - Implement transactWrite() method
  - Support multiple operation types (put, update, delete, conditionCheck)
  - Handle TransactWriteItems API call
  - Write unit tests for transactional writes
  - _Requirements: 1.2_

- [x] 12.2 Implement transactGet operation
  - Implement transactGet() method
  - Support up to 100 items
  - Handle TransactGetItems API call
  - Write unit tests for transactional gets
  - _Requirements: 1.2_

- [x] 13. Implement retry logic
- [x] 13.1 Create RetryHandler class
  - Define RetryConfig interface
  - Implement RetryHandler class
  - Implement executeWithRetry() with exponential backoff
  - Add jitter to prevent thundering herd
  - Write unit tests for retry logic
  - _Requirements: 6.3_

- [x] 13.2 Integrate retry logic into TableClient
  - Wrap operations with retry handler
  - Configure retryable error codes (throttling, network)
  - Don't retry validation or conditional check errors
  - Write integration tests for retry behavior
  - _Requirements: 6.3_

- [x] 14. Implement condition expression support
- [x] 14.1 Create ConditionExpression builder
  - Define ConditionExpression type
  - Implement builder for condition expressions
  - Support comparison operators (eq, ne, lt, lte, gt, gte)
  - Support logical operators (and, or, not)
  - Support functions (exists, contains, beginsWith)
  - Write unit tests for condition building
  - _Requirements: 1.1_

- [x] 14.2 Integrate conditions into operations
  - Add condition support to put, update, delete
  - Build condition expressions from options
  - Handle ConditionalCheckFailedException
  - Write integration tests for conditional operations
  - _Requirements: 1.1, 6.2_

- [x] 15. Add projection expression support
- [x] 15.1 Implement projection expression builder
  - Build ProjectionExpression from attribute array
  - Handle nested attributes
  - Handle expression attribute names
  - Write unit tests for projection building
  - _Requirements: 1.1_

- [x] 15.2 Integrate projections into read operations
  - Add projectionExpression to get, query, scan, batchGet
  - Track projected vs full item sizes in stats
  - Generate recommendations for projection opportunities
  - Write integration tests for projections
  - _Requirements: 1.1, 5.4_

- [x] 16. Implement anti-pattern detection
- [x] 16.1 Detect fetching to filter pattern
  - Track queries with client-side filtering
  - Generate recommendations to use FilterExpression
  - Write unit tests for detection
  - _Requirements: 5.4_

- [x] 16.2 Detect sequential writes pattern
  - Track multiple put operations in short time window
  - Generate recommendations to use batchWrite
  - Write unit tests for detection
  - _Requirements: 5.4_

- [x] 16.3 Detect read-before-write pattern
  - Track get followed by put on same key
  - Generate recommendations to use update
  - Write unit tests for detection
  - _Requirements: 5.4_

- [x] 16.4 Detect large item pattern
  - Track item sizes on write operations
  - Warn when items exceed 100KB
  - Generate recommendations to use S3
  - Write unit tests for detection
  - _Requirements: 5.4_

- [x] 16.5 Detect uniform partition key pattern
  - Analyze partition key patterns for sequential values
  - Generate recommendations for better distribution
  - Write unit tests for detection
  - _Requirements: 5.4_

- [x] 17. Integration testing with DynamoDB Local
- [x] 17.1 Set up DynamoDB Local test environment
  - Create test utilities for table creation
  - Create test utilities for data seeding
  - Create test utilities for table cleanup
  - Write helper functions for test setup/teardown
  - _Requirements: All_

- [x] 17.2 Write end-to-end CRUD tests
  - Test complete CRUD lifecycle with real DynamoDB Local
  - Test with and without schemas
  - Test error scenarios
  - _Requirements: 1.1, 1.2, 1.5, 2.2_

- [x] 17.3 Write end-to-end query tests
  - Test various query patterns with real data
  - Test GSI and LSI queries
  - Test pagination
  - Test filter expressions
  - _Requirements: 1.2, 3.3_

- [x] 17.4 Write end-to-end batch operation tests
  - Test batch get and write with real data
  - Test chunking behavior
  - Test retry of unprocessed items
  - _Requirements: 1.2_

- [x] 17.5 Write end-to-end access pattern tests
  - Test named access patterns with real data
  - Test single-table design scenarios
  - Test multiple entity types
  - _Requirements: 3.1, 4.1, 4.2, 4.6_

- [x] 17.6 Write end-to-end stats collection tests
  - Test stats collection with real operations
  - Test recommendation generation
  - Test hot partition detection with skewed data
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 18. Documentation and examples
- [x] 18.1 Create README with getting started guide
  - Document installation
  - Show basic usage examples
  - Document configuration options
  - _Requirements: All_

- [x] 18.2 Create example for basic CRUD operations
  - Write example code for get, put, update, delete
  - Show with and without schemas
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 18.3 Create example for single-table design
  - Show multiple entity types in one table
  - Demonstrate access patterns
  - Show pattern helpers usage
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [x] 18.4 Create example for stats and recommendations
  - Show how to enable stats collection
  - Demonstrate getting recommendations
  - Show how to act on recommendations
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 18.5 Create API documentation
  - Document all public interfaces
  - Document all pattern helpers
  - Document configuration options
  - Document error types
  - _Requirements: All_

- [ ] 19. Performance optimization
- [ ] 19.1 Optimize marshalling performance
  - Profile marshalling overhead
  - Cache marshalling utilities
  - Optimize for common data types
  - Write performance tests
  - _Requirements: 1.5, 5.8_

- [ ] 19.2 Optimize stats collection performance
  - Implement efficient data structures for tracking
  - Use sampling to reduce overhead
  - Cache recommendation results
  - Write performance tests
  - _Requirements: 5.8_

- [ ] 19.3 Optimize schema validation performance
  - Cache compiled schemas
  - Optimize validation for common patterns
  - Write performance tests
  - _Requirements: 2.2, 5.8_

- [ ] 20. Debug mode implementation
- [ ] 20.1 Add debug logging
  - Add debug flag to TableClientConfig
  - Log operation details when debug enabled
  - Log expression building details
  - Log marshalling transformations
  - Write tests for debug output
  - _Requirements: 6.4_

- [ ] 20.2 Add operation tracing
  - Add trace IDs to operations
  - Log operation lifecycle
  - Include timing information
  - Write tests for tracing
  - _Requirements: 6.4_
