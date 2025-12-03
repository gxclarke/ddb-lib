# Implementation Plan

- [x] 1. Set up monorepo structure
  - Create packages directory structure
  - Configure npm workspaces in root package.json
  - Set up shared TypeScript configuration
  - Configure build tools for monorepo
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Create @ddb-lib/core package
  - [x] 2.1 Initialize core package structure
    - Create packages/core directory
    - Create package.json with proper exports
    - Create tsconfig.json extending root config
    - Set up build configuration
    - _Requirements: 1.4, 2.4, 9.4_
  
  - [x] 2.2 Move pattern helpers to core package
    - Move pattern-helpers.ts to packages/core/src
    - Update imports and exports
    - Write unit tests for pattern helpers
    - _Requirements: 2.1, 2.5_
  
  - [x] 2.3 Move multi-attribute key utilities to core package
    - Move multi-attribute-key-helpers.ts to packages/core/src
    - Move multi-attribute-key-validator.ts to packages/core/src
    - Update imports and exports
    - Write unit tests
    - _Requirements: 2.2, 2.5_
  
  - [x] 2.4 Move expression builders to core package
    - Move expression-builders.ts to packages/core/src
    - Move condition-expression-builder.ts to packages/core/src
    - Update imports and exports
    - Write unit tests
    - _Requirements: 2.1, 2.5_
  
  - [x] 2.5 Move type guards to core package
    - Move type-guards.ts to packages/core/src
    - Update imports and exports
    - Write unit tests
    - _Requirements: 2.3, 2.5_
  
  - [x] 2.6 Create core types module
    - Extract shared types to packages/core/src/types.ts
    - Remove AWS SDK dependencies from types
    - Export all core types
    - _Requirements: 2.4, 2.5_
  
  - [x] 2.7 Build and test core package
    - Run build for core package
    - Run all unit tests
    - Verify no external dependencies
    - _Requirements: 2.4, 2.5_

- [x] 3. Create @ddb-lib/stats package
  - [x] 3.1 Initialize stats package structure
    - Create packages/stats directory
    - Create package.json with @ddb-lib/core dependency
    - Create tsconfig.json extending root config
    - Set up build configuration
    - _Requirements: 1.4, 3.5_
  
  - [x] 3.2 Move stats collector to stats package
    - Move stats-collector.ts to packages/stats/src
    - Update imports to use @ddb-lib/core
    - Remove AWS SDK dependencies
    - Write unit tests with mock data
    - _Requirements: 3.1, 3.5_
  
  - [x] 3.3 Create recommendation engine
    - Extract recommendation logic from stats-collector.ts
    - Create recommendation-engine.ts in packages/stats/src
    - Implement generateRecommendations method
    - Write unit tests
    - _Requirements: 3.3, 3.5_
  
  - [x] 3.4 Create anti-pattern detector
    - Move anti-pattern detection logic to anti-pattern-detector.ts
    - Implement detection methods
    - Write unit tests
    - _Requirements: 3.4, 3.5_
  
  - [x] 3.5 Refactor stats collector for independence
    - Remove direct coupling to TableClient
    - Accept generic OperationRecord interface
    - Implement manual recording API
    - Update tests
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [x] 3.6 Create stats types module
    - Create packages/stats/src/types.ts
    - Define OperationRecord, StatsConfig, TableStats interfaces
    - Export all stats types
    - _Requirements: 3.1, 3.5_
  
  - [x] 3.7 Build and test stats package
    - Run build for stats package
    - Run all unit tests
    - Verify minimal dependencies
    - _Requirements: 3.5_

- [-] 4. Create @ddb-lib/client package
  - [x] 4.1 Initialize client package structure
    - Create packages/client directory
    - Create package.json with dependencies on core and stats
    - Add AWS SDK as peer dependencies
    - Create tsconfig.json extending root config
    - Set up build configuration
    - _Requirements: 1.4, 5.4, 5.5_
  
  - [x] 4.2 Move TableClient to client package
    - Move table-client.ts to packages/client/src
    - Update imports to use @ddb-lib/core and @ddb-lib/stats
    - Keep all existing functionality
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 4.3 Integrate stats collector in TableClient
    - Update TableClient to use StatsCollector from @ddb-lib/stats
    - Implement recordOperation method
    - Ensure all operations are instrumented
    - _Requirements: 5.2, 5.4_
  
  - [x] 4.4 Move retry handler to client package
    - Move retry-handler.ts to packages/client/src
    - Update imports
    - Write unit tests
    - _Requirements: 5.1, 5.4_
  
  - [x] 4.5 Move error classes to client package
    - Move errors.ts to packages/client/src
    - Update imports
    - Export all error classes
    - _Requirements: 5.1, 5.4_
  
  - [x] 4.6 Create client types module
    - Create packages/client/src/types.ts
    - Define TableClientConfig and operation options
    - Export all client types
    - _Requirements: 5.1, 5.4_
  
  - [x] 4.7 Update TableClient tests
    - Move table-client tests to packages/client/src
    - Update imports to use workspace packages
    - Ensure all tests pass
    - _Requirements: 5.1, 5.4_
  
  - [x] 4.8 Build and test client package
    - Run build for client package
    - Run all unit tests
    - Run integration tests against DynamoDB Local
    - _Requirements: 5.1, 5.4_

- [x] 5. Create @ddb-lib/amplify package
  - [x] 5.1 Initialize amplify package structure
    - Create packages/amplify directory
    - Create package.json with dependencies on core and stats
    - Add aws-amplify as peer dependency
    - Create tsconfig.json extending root config
    - Set up build configuration
    - _Requirements: 1.4, 4.5_
  
  - [x] 5.2 Create AmplifyMonitor class
    - Create packages/amplify/src/amplify-monitor.ts
    - Implement constructor with StatsConfig
    - Initialize StatsCollector and RecommendationEngine
    - Implement getStats and getRecommendations methods
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [x] 5.3 Implement operation wrapping
    - Implement wrap method to create monitored model proxy
    - Intercept get, list, create, update, delete operations
    - Record operation statistics before/after execution
    - Preserve original operation behavior
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.4 Implement manual recording API
    - Implement recordOperation method
    - Allow manual recording for custom operations
    - Write unit tests with mock Amplify client
    - _Requirements: 4.2_
  
  - [x] 5.5 Create AmplifyHelpers utilities
    - Create packages/amplify/src/amplify-helpers.ts
    - Implement schemaToAccessPatterns helper
    - Implement amplifyCompositeKey helper
    - Implement parseAmplifyKey helper
    - Implement amplifyGSIKey helper
    - Write unit tests
    - _Requirements: 4.3, 6.1_
  
  - [x] 5.6 Create amplify types module
    - Create packages/amplify/src/types.ts
    - Define AmplifyMonitorConfig interface
    - Define MonitoredModel interface
    - Export all amplify types
    - _Requirements: 4.1, 4.5_
  
  - [x] 5.7 Handle Amplify-specific patterns
    - Implement integration with Amplify's authorization
    - Handle Amplify's error patterns
    - Respect Amplify's type definitions
    - Write integration tests
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [x] 5.8 Build and test amplify package
    - Run build for amplify package
    - Run all unit tests
    - Test with mock Amplify Gen 2 client
    - _Requirements: 4.1, 4.5_

- [x] 6. Update build configuration
  - Configure rsbuild for monorepo
  - Set up build order (core → stats → client/amplify)
  - Configure TypeScript project references
  - Test building all packages
  - _Requirements: 8.4, 9.4_

- [x] 7. Update test configuration
  - Configure rstest for monorepo
  - Set up test scripts for all packages
  - Configure integration tests
  - Test running all tests
  - _Requirements: 8.3_

- [x] 8. Create standalone examples
  - [x] 8.1 Create basic CRUD example for standalone
    - Create examples/standalone/basic-crud.ts
    - Demonstrate TableClient usage with @ddb-lib/client
    - Show pattern helpers from @ddb-lib/core
    - _Requirements: 7.2, 7.3_
  
  - [x] 8.2 Create single-table design example for standalone
    - Create examples/standalone/single-table-design.ts
    - Demonstrate access patterns
    - Show pattern helpers usage
    - _Requirements: 7.2, 7.3_
  
  - [x] 8.3 Create stats monitoring example for standalone
    - Create examples/standalone/stats-monitoring.ts
    - Demonstrate statistics collection
    - Show recommendations usage
    - _Requirements: 7.2, 7.3_

- [x] 9. Create Amplify examples
  - [x] 9.1 Create basic Amplify usage example
    - Create examples/amplify/basic-usage.ts
    - Demonstrate AmplifyMonitor setup
    - Show wrapping Amplify data client
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 9.2 Create Amplify with monitoring example
    - Create examples/amplify/with-monitoring.ts
    - Demonstrate statistics collection with Amplify
    - Show getting recommendations
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 9.3 Create Amplify pattern helpers example
    - Create examples/amplify/pattern-helpers.ts
    - Demonstrate using pattern helpers with Amplify
    - Show multi-attribute key helpers
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 10. Update documentation
  - [x] 10.1 Create root README
    - Create monorepo root README.md
    - Explain package structure
    - Provide quick start for both standalone and Amplify
    - Link to package-specific READMEs
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 10.2 Create @ddb-lib/core README
    - Document all pattern helpers
    - Document multi-attribute key helpers
    - Document expression builders
    - Provide usage examples
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 10.3 Create @ddb-lib/stats README
    - Document StatsCollector API
    - Document recommendation engine
    - Document anti-pattern detector
    - Provide usage examples
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 10.4 Create @ddb-lib/client README
    - Document TableClient API
    - Document all operations
    - Document configuration options
    - Provide usage examples
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 10.5 Create @ddb-lib/amplify README
    - Document AmplifyMonitor API
    - Document Amplify integration setup
    - Document AmplifyHelpers utilities
    - Provide Amplify Gen 2 specific examples
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [x] 10.6 Update API documentation
    - Update API.md for monorepo structure
    - Document all packages
    - Update import paths
    - Add Amplify-specific API docs
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 11. Configure package publishing
  - Set up npm publishing configuration
  - Configure package.json files for publishing
  - Set up version management
  - Test local package linking
  - _Requirements: 1.4, 8.5, 9.5_

- [ ] 12. Final integration testing
  - Test all packages work together
  - Test standalone usage end-to-end
  - Test Amplify integration end-to-end
  - Verify tree-shaking works correctly
  - Test in sample applications
  - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 9.3_
