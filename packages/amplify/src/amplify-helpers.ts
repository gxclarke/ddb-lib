/**
 * AmplifyHelpers - Utilities for working with AWS Amplify Gen 2 patterns
 * Provides helpers specific to Amplify's data client and schema patterns
 */

import { PatternHelpers } from '@ddb-lib/core';

/**
 * AmplifyHelpers class for Amplify-specific utilities
 */
export class AmplifyHelpers {
  /**
   * Create a composite key compatible with Amplify's key structure
   * Uses the same separator as core PatternHelpers but optimized for Amplify patterns
   * 
   * @param parts - Array of key parts to combine
   * @param separator - Separator character (default: '#')
   * @returns Composite key string
   * @example
   * amplifyCompositeKey(['TENANT', 'acme', 'USER', '123']) // 'TENANT#acme#USER#123'
   */
  static amplifyCompositeKey(parts: string[], separator = '#'): string {
    return PatternHelpers.compositeKey(parts, separator);
  }

  /**
   * Parse an Amplify-generated key into model name and ID
   * Amplify Gen 2 typically uses format like "ModelName#id" or just "id"
   * 
   * @param key - Amplify key string
   * @returns Object with modelName and id
   * @example
   * parseAmplifyKey('Todo#123') // { modelName: 'Todo', id: '123' }
   * parseAmplifyKey('123') // { modelName: '', id: '123' }
   */
  static parseAmplifyKey(key: string): { modelName: string; id: string } {
    if (!key) {
      throw new Error('parseAmplifyKey requires a non-empty key');
    }

    // Check if key contains a separator
    const separatorIndex = key.indexOf('#');

    if (separatorIndex === -1) {
      // No separator, entire key is the ID
      return { modelName: '', id: key };
    }

    // Split on first separator only
    const modelName = key.substring(0, separatorIndex);
    const id = key.substring(separatorIndex + 1);

    return { modelName, id };
  }

  /**
   * Create a GSI key for Amplify secondary indexes
   * Amplify uses GSIs for secondary access patterns
   * 
   * @param indexName - Name of the GSI
   * @param value - Value for the GSI key
   * @returns GSI key string
   * @example
   * amplifyGSIKey('byStatus', 'active') // 'byStatus#active'
   * amplifyGSIKey('byEmail', 'user@example.com') // 'byEmail#user@example.com'
   */
  static amplifyGSIKey(indexName: string, value: string): string {
    if (!indexName) {
      throw new Error('amplifyGSIKey requires a non-empty indexName');
    }
    if (!value) {
      throw new Error('amplifyGSIKey requires a non-empty value');
    }

    return `${indexName}#${value}`;
  }

  /**
   * Convert Amplify schema to access pattern definitions
   * This is a placeholder for future implementation when we have access to Amplify schema types
   * 
   * @param schema - Amplify schema object
   * @returns Access pattern definitions
   * @example
   * const patterns = schemaToAccessPatterns(schema);
   */
  static schemaToAccessPatterns(schema: any): Record<string, any> {
    // This is a placeholder implementation
    // In a real implementation, this would analyze the Amplify schema
    // and generate access pattern definitions based on the model structure,
    // indexes, and relationships defined in the schema

    if (!schema) {
      throw new Error('schemaToAccessPatterns requires a schema object');
    }

    // Return empty patterns for now
    // Future implementation would parse schema.models and generate patterns
    return {};
  }

  /**
   * Extract table name from Amplify configuration
   * Amplify Gen 2 stores table names in the backend configuration
   * 
   * @param config - Amplify backend configuration
   * @returns DynamoDB table name
   * @example
   * const tableName = getTableName(amplifyConfig);
   */
  static getTableName(config: any): string {
    // This is a placeholder implementation
    // In a real implementation, this would extract the table name
    // from Amplify's backend configuration

    if (!config) {
      throw new Error('getTableName requires a config object');
    }

    // Try common paths where Amplify might store table name
    if (config.tableName) {
      return config.tableName;
    }

    if (config.API?.GraphQL?.tableName) {
      return config.API.GraphQL.tableName;
    }

    throw new Error('Could not extract table name from Amplify configuration');
  }

  /**
   * Create a time-series key for Amplify models
   * Delegates to core PatternHelpers for consistency
   * 
   * @param timestamp - Date object
   * @param granularity - Time granularity
   * @returns Time-series key string
   * @example
   * amplifyTimeSeriesKey(new Date(), 'day') // '2024-12-03'
   */
  static amplifyTimeSeriesKey(
    timestamp: Date,
    granularity: 'hour' | 'day' | 'month'
  ): string {
    return PatternHelpers.timeSeriesKey(timestamp, granularity);
  }

  /**
   * Create an entity key for Amplify single-table design
   * Delegates to core PatternHelpers for consistency
   * 
   * @param entityType - Type of entity
   * @param id - Entity identifier
   * @returns Entity key string
   * @example
   * amplifyEntityKey('User', '123') // 'User#123'
   */
  static amplifyEntityKey(entityType: string, id: string): string {
    return PatternHelpers.entityKey(entityType, id);
  }

  /**
   * Create a sparse index value for conditional GSI inclusion
   * Useful for Amplify models where items should only appear in certain indexes
   * when specific conditions are met
   * 
   * @param condition - Boolean condition
   * @param value - Value to return if condition is true
   * @returns Value if condition is true, undefined otherwise
   * @example
   * amplifySparseIndex(user.isVerified, 'VERIFIED') // 'VERIFIED' or undefined
   */
  static amplifySparseIndex(condition: boolean, value: string): string | undefined {
    return PatternHelpers.sparseIndexValue(condition, value);
  }

  /**
   * Create adjacency list keys for Amplify relationship patterns
   * Useful for modeling many-to-many relationships in Amplify
   * 
   * @param sourceId - Source entity ID
   * @param targetId - Target entity ID
   * @returns Object with pk and sk
   * @example
   * amplifyAdjacencyKeys('User#123', 'Group#456')
   * // { pk: 'User#123', sk: 'Group#456' }
   */
  static amplifyAdjacencyKeys(
    sourceId: string,
    targetId: string
  ): { pk: string; sk: string } {
    return PatternHelpers.adjacencyKeys(sourceId, targetId);
  }

  /**
   * Create a hierarchical key for Amplify nested data
   * Useful for modeling folder structures or organizational hierarchies
   * 
   * @param path - Array of path segments
   * @returns Hierarchical key string
   * @example
   * amplifyHierarchicalKey(['org', 'team', 'project'])
   * // 'org/team/project'
   */
  static amplifyHierarchicalKey(path: string[]): string {
    return PatternHelpers.hierarchicalKey(path);
  }

  /**
   * Convert Amplify filter to DynamoDB filter expression
   * Helper for translating Amplify's filter syntax to DynamoDB expressions
   * 
   * @param amplifyFilter - Amplify filter object
   * @returns DynamoDB filter expression components
   * @example
   * const filter = amplifyFilterToExpression({ status: { eq: 'active' } });
   */
  static amplifyFilterToExpression(amplifyFilter: any): {
    expression: string;
    values: Record<string, any>;
    names: Record<string, string>;
  } {
    // This is a placeholder implementation
    // In a real implementation, this would convert Amplify's filter syntax
    // to DynamoDB FilterExpression format

    if (!amplifyFilter) {
      return {
        expression: '',
        values: {},
        names: {},
      };
    }

    // Future implementation would handle Amplify filter operators like:
    // eq, ne, gt, gte, lt, lte, contains, beginsWith, between, etc.

    return {
      expression: '',
      values: {},
      names: {},
    };
  }
}
