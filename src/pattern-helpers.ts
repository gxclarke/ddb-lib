/**
 * Pattern Helpers for DynamoDB
 * 
 * Utilities for implementing common DynamoDB patterns including:
 * - Composite keys
 * - Single-table design
 * - Time-series data
 * - Adjacency lists
 * - Hierarchical data
 * - Hot partition prevention
 * - Optimistic locking
 * - Sparse indexes
 * - GSI overloading
 */

export class PatternHelpers {
  /**
   * Create a composite key from multiple parts
   * @param parts - Array of key parts to combine
   * @param separator - Separator character (default: '#')
   * @returns Composite key string
   * @example
   * compositeKey(['USER', '123', 'ORDER', '456']) // 'USER#123#ORDER#456'
   */
  static compositeKey(parts: string[], separator = '#'): string {
    if (parts.length === 0) {
      throw new Error('compositeKey requires at least one part');
    }

    // Validate that parts don't contain the separator
    for (const part of parts) {
      if (part.includes(separator)) {
        throw new Error(
          `Key part "${part}" contains separator "${separator}". Choose a different separator.`
        );
      }
    }

    return parts.join(separator);
  }

  /**
   * Parse a composite key into its component parts
   * @param key - Composite key string
   * @param separator - Separator character (default: '#')
   * @returns Array of key parts
   * @example
   * parseCompositeKey('USER#123#ORDER#456') // ['USER', '123', 'ORDER', '456']
   */
  static parseCompositeKey(key: string, separator = '#'): string[] {
    if (!key) {
      throw new Error('parseCompositeKey requires a non-empty key');
    }

    return key.split(separator);
  }

  /**
   * Create an entity key with type prefix for single-table design
   * @param entityType - Type of entity (e.g., 'USER', 'ORDER', 'PRODUCT')
   * @param id - Entity identifier
   * @returns Entity key string
   * @example
   * entityKey('USER', '123') // 'USER#123'
   * entityKey('ORDER', 'abc-def') // 'ORDER#abc-def'
   */
  static entityKey(entityType: string, id: string): string {
    if (!entityType) {
      throw new Error('entityKey requires a non-empty entityType');
    }
    if (!id) {
      throw new Error('entityKey requires a non-empty id');
    }

    return `${entityType}#${id}`;
  }

  /**
   * Parse an entity key to extract type and ID
   * @param key - Entity key string
   * @returns Object with entityType and id
   * @example
   * parseEntityKey('USER#123') // { entityType: 'USER', id: '123' }
   * parseEntityKey('ORDER#abc-def') // { entityType: 'ORDER', id: 'abc-def' }
   */
  static parseEntityKey(key: string): { entityType: string; id: string } {
    if (!key) {
      throw new Error('parseEntityKey requires a non-empty key');
    }

    const parts = key.split('#');
    if (parts.length < 2) {
      throw new Error(
        `Invalid entity key format: "${key}". Expected format: "ENTITY_TYPE#ID"`
      );
    }

    const [entityType, ...idParts] = parts;
    const id = idParts.join('#'); // Rejoin in case ID contains '#'

    return { entityType, id };
  }

  /**
   * Create a time-series key from a date with specified granularity
   * @param timestamp - Date object
   * @param granularity - Time granularity ('hour', 'day', or 'month')
   * @returns Time-series key string
   * @example
   * timeSeriesKey(new Date('2024-12-02T15:30:00'), 'hour') // '2024-12-02-15'
   * timeSeriesKey(new Date('2024-12-02T15:30:00'), 'day') // '2024-12-02'
   * timeSeriesKey(new Date('2024-12-02T15:30:00'), 'month') // '2024-12'
   */
  static timeSeriesKey(
    timestamp: Date,
    granularity: 'hour' | 'day' | 'month'
  ): string {
    if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
      throw new Error('timeSeriesKey requires a valid Date object');
    }

    const year = timestamp.getUTCFullYear();
    const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const hour = String(timestamp.getUTCHours()).padStart(2, '0');

    switch (granularity) {
      case 'hour':
        return `${year}-${month}-${day}-${hour}`;
      case 'day':
        return `${year}-${month}-${day}`;
      case 'month':
        return `${year}-${month}`;
      default:
        throw new Error(
          `Invalid granularity: "${granularity}". Must be 'hour', 'day', or 'month'`
        );
    }
  }

  /**
   * Convert a Date to a TTL timestamp (Unix epoch in seconds)
   * @param expiresAt - Date when the item should expire
   * @returns Unix timestamp in seconds
   * @example
   * ttlTimestamp(new Date('2024-12-31T23:59:59')) // 1735689599
   */
  static ttlTimestamp(expiresAt: Date): number {
    if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
      throw new Error('ttlTimestamp requires a valid Date object');
    }

    return Math.floor(expiresAt.getTime() / 1000);
  }

  /**
   * Create adjacency list keys for relationship patterns
   * Creates bidirectional relationship keys for storing graph-like data
   * @param sourceId - Source entity ID
   * @param targetId - Target entity ID
   * @returns Object with pk and sk for the relationship
   * @example
   * adjacencyKeys('USER#123', 'ORDER#456')
   * // { pk: 'USER#123', sk: 'ORDER#456' }
   */
  static adjacencyKeys(
    sourceId: string,
    targetId: string
  ): { pk: string; sk: string } {
    if (!sourceId) {
      throw new Error('adjacencyKeys requires a non-empty sourceId');
    }
    if (!targetId) {
      throw new Error('adjacencyKeys requires a non-empty targetId');
    }

    return {
      pk: sourceId,
      sk: targetId,
    };
  }

  /**
   * Create a hierarchical key from a path array
   * @param path - Array of path segments
   * @returns Hierarchical key string
   * @example
   * hierarchicalKey(['root', 'folder1', 'subfolder', 'item'])
   * // 'root/folder1/subfolder/item'
   */
  static hierarchicalKey(path: string[]): string {
    if (!path || path.length === 0) {
      throw new Error('hierarchicalKey requires a non-empty path array');
    }

    // Validate that path segments don't contain the separator
    for (const segment of path) {
      if (!segment) {
        throw new Error('hierarchicalKey path segments cannot be empty');
      }
      if (segment.includes('/')) {
        throw new Error(
          `Path segment "${segment}" contains separator "/". Path segments cannot contain slashes.`
        );
      }
    }

    return path.join('/');
  }

  /**
   * Parse a hierarchical key into its path components
   * @param key - Hierarchical key string
   * @returns Array of path segments
   * @example
   * parseHierarchicalKey('root/folder1/subfolder/item')
   * // ['root', 'folder1', 'subfolder', 'item']
   */
  static parseHierarchicalKey(key: string): string[] {
    if (!key) {
      throw new Error('parseHierarchicalKey requires a non-empty key');
    }

    return key.split('/');
  }

  /**
   * Create a distributed key with shard suffix for write sharding
   * Helps prevent hot partitions by distributing writes across multiple partition keys
   * @param baseKey - Base partition key
   * @param shardCount - Number of shards to distribute across
   * @returns Distributed key with shard suffix
   * @example
   * distributedKey('POPULAR_ITEM', 10) // 'POPULAR_ITEM#SHARD_7' (random shard 0-9)
   */
  static distributedKey(baseKey: string, shardCount: number): string {
    if (!baseKey) {
      throw new Error('distributedKey requires a non-empty baseKey');
    }
    if (!Number.isInteger(shardCount) || shardCount < 1) {
      throw new Error('distributedKey requires shardCount to be a positive integer');
    }

    const shard = Math.floor(Math.random() * shardCount);
    return `${baseKey}#SHARD_${shard}`;
  }

  /**
   * Extract the shard number from a distributed key
   * @param key - Distributed key string
   * @returns Shard number, or null if not a distributed key
   * @example
   * getShardNumber('POPULAR_ITEM#SHARD_7') // 7
   * getShardNumber('REGULAR_KEY') // null
   */
  static getShardNumber(key: string): number | null {
    if (!key) {
      throw new Error('getShardNumber requires a non-empty key');
    }

    const match = key.match(/#SHARD_(\d+)$/);
    if (!match) {
      return null;
    }

    return Number.parseInt(match[1], 10);
  }

  /**
   * Get the standard attribute name for version tracking
   * @returns Standard version attribute name
   * @example
   * versionAttribute() // 'version'
   */
  static versionAttribute(): string {
    return 'version';
  }

  /**
   * Increment a version number for optimistic locking
   * @param currentVersion - Current version number
   * @returns Incremented version number
   * @example
   * incrementVersion(1) // 2
   * incrementVersion(0) // 1
   */
  static incrementVersion(currentVersion: number): number {
    if (!Number.isInteger(currentVersion) || currentVersion < 0) {
      throw new Error(
        'incrementVersion requires currentVersion to be a non-negative integer'
      );
    }

    return currentVersion + 1;
  }

  /**
   * Create a sparse index value conditionally
   * Returns the value if condition is true, undefined otherwise
   * Useful for creating sparse GSIs where items only appear in the index when certain conditions are met
   * @param condition - Boolean condition to check
   * @param value - Value to return if condition is true
   * @returns Value if condition is true, undefined otherwise
   * @example
   * sparseIndexValue(emailVerified, 'VERIFIED#USER') // 'VERIFIED#USER' if true, undefined if false
   * sparseIndexValue(isPremium, 'PREMIUM') // 'PREMIUM' if true, undefined if false
   */
  static sparseIndexValue(condition: boolean, value: string): string | undefined {
    return condition ? value : undefined;
  }

  /**
   * Create a GSI key for GSI overloading pattern
   * Allows multiple entity types to share the same GSI by prefixing with entity type
   * @param indexName - Name of the GSI (for documentation/clarity)
   * @param entityType - Type of entity
   * @param value - Value for the key
   * @returns GSI key string
   * @example
   * gsiKey('GSI1', 'USER', 'active') // 'USER#active'
   * gsiKey('GSI1', 'ORDER', 'pending') // 'ORDER#pending'
   */
  static gsiKey(indexName: string, entityType: string, value: string): string {
    if (!indexName) {
      throw new Error('gsiKey requires a non-empty indexName');
    }
    if (!entityType) {
      throw new Error('gsiKey requires a non-empty entityType');
    }
    if (!value) {
      throw new Error('gsiKey requires a non-empty value');
    }

    // indexName is for documentation purposes, not used in the key
    return `${entityType}#${value}`;
  }
}
