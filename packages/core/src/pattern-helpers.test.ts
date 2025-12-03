import { describe, test, expect } from '@rstest/core';
import { PatternHelpers } from './pattern-helpers';

describe('PatternHelpers', () => {
  describe('compositeKey', () => {
    test('should create composite key with default separator', () => {
      const result = PatternHelpers.compositeKey(['USER', '123']);
      expect(result).toBe('USER#123');
    });

    test('should create composite key with multiple parts', () => {
      const result = PatternHelpers.compositeKey(['USER', '123', 'ORDER', '456']);
      expect(result).toBe('USER#123#ORDER#456');
    });

    test('should create composite key with custom separator', () => {
      const result = PatternHelpers.compositeKey(['USER', '123'], '|');
      expect(result).toBe('USER|123');
    });

    test('should create composite key with single part', () => {
      const result = PatternHelpers.compositeKey(['USER']);
      expect(result).toBe('USER');
    });

    test('should throw error for empty parts array', () => {
      expect(() => PatternHelpers.compositeKey([])).toThrow(
        'compositeKey requires at least one part'
      );
    });

    test('should throw error if part contains separator', () => {
      expect(() => PatternHelpers.compositeKey(['USER#123', '456'])).toThrow(
        'Key part "USER#123" contains separator "#"'
      );
    });

    test('should allow separator in part if different separator is used', () => {
      const result = PatternHelpers.compositeKey(['USER#123', '456'], '|');
      expect(result).toBe('USER#123|456');
    });
  });

  describe('parseCompositeKey', () => {
    test('should parse composite key with default separator', () => {
      const result = PatternHelpers.parseCompositeKey('USER#123');
      expect(result).toEqual(['USER', '123']);
    });

    test('should parse composite key with multiple parts', () => {
      const result = PatternHelpers.parseCompositeKey('USER#123#ORDER#456');
      expect(result).toEqual(['USER', '123', 'ORDER', '456']);
    });

    test('should parse composite key with custom separator', () => {
      const result = PatternHelpers.parseCompositeKey('USER|123', '|');
      expect(result).toEqual(['USER', '123']);
    });

    test('should parse single part key', () => {
      const result = PatternHelpers.parseCompositeKey('USER');
      expect(result).toEqual(['USER']);
    });

    test('should throw error for empty key', () => {
      expect(() => PatternHelpers.parseCompositeKey('')).toThrow(
        'parseCompositeKey requires a non-empty key'
      );
    });

    test('should handle keys with empty parts', () => {
      const result = PatternHelpers.parseCompositeKey('USER##123');
      expect(result).toEqual(['USER', '', '123']);
    });
  });

  describe('compositeKey and parseCompositeKey round-trip', () => {
    test('should maintain data integrity through compose and parse', () => {
      const parts = ['USER', '123', 'ORDER', '456'];
      const key = PatternHelpers.compositeKey(parts);
      const parsed = PatternHelpers.parseCompositeKey(key);
      expect(parsed).toEqual(parts);
    });

    test('should work with custom separator', () => {
      const parts = ['TENANT', 'abc', 'CUSTOMER', 'xyz'];
      const key = PatternHelpers.compositeKey(parts, '::');
      const parsed = PatternHelpers.parseCompositeKey(key, '::');
      expect(parsed).toEqual(parts);
    });
  });
});

describe('entityKey', () => {
  test('should create entity key with type and id', () => {
    const result = PatternHelpers.entityKey('USER', '123');
    expect(result).toBe('USER#123');
  });

  test('should create entity key for different entity types', () => {
    expect(PatternHelpers.entityKey('ORDER', 'abc-def')).toBe('ORDER#abc-def');
    expect(PatternHelpers.entityKey('PRODUCT', 'xyz')).toBe('PRODUCT#xyz');
    expect(PatternHelpers.entityKey('CUSTOMER', '999')).toBe('CUSTOMER#999');
  });

  test('should handle IDs with special characters', () => {
    expect(PatternHelpers.entityKey('USER', 'abc-def-123')).toBe('USER#abc-def-123');
    expect(PatternHelpers.entityKey('ORDER', 'order_2024_01')).toBe('ORDER#order_2024_01');
  });

  test('should throw error for empty entity type', () => {
    expect(() => PatternHelpers.entityKey('', '123')).toThrow(
      'entityKey requires a non-empty entityType'
    );
  });

  test('should throw error for empty id', () => {
    expect(() => PatternHelpers.entityKey('USER', '')).toThrow(
      'entityKey requires a non-empty id'
    );
  });
});

describe('parseEntityKey', () => {
  test('should parse entity key into type and id', () => {
    const result = PatternHelpers.parseEntityKey('USER#123');
    expect(result).toEqual({ entityType: 'USER', id: '123' });
  });

  test('should parse entity keys for different types', () => {
    expect(PatternHelpers.parseEntityKey('ORDER#abc-def')).toEqual({
      entityType: 'ORDER',
      id: 'abc-def',
    });
    expect(PatternHelpers.parseEntityKey('PRODUCT#xyz')).toEqual({
      entityType: 'PRODUCT',
      id: 'xyz',
    });
  });

  test('should handle IDs containing # separator', () => {
    const result = PatternHelpers.parseEntityKey('USER#123#456#789');
    expect(result).toEqual({ entityType: 'USER', id: '123#456#789' });
  });

  test('should throw error for empty key', () => {
    expect(() => PatternHelpers.parseEntityKey('')).toThrow(
      'parseEntityKey requires a non-empty key'
    );
  });

  test('should throw error for invalid format without separator', () => {
    expect(() => PatternHelpers.parseEntityKey('USER123')).toThrow(
      'Invalid entity key format: "USER123". Expected format: "ENTITY_TYPE#ID"'
    );
  });

  test('should handle key with only entity type and separator', () => {
    const result = PatternHelpers.parseEntityKey('USER#');
    expect(result).toEqual({
      entityType: 'USER',
      id: '',
    });
  });
});

describe('entityKey and parseEntityKey round-trip', () => {
  test('should maintain data integrity through create and parse', () => {
    const entityType = 'USER';
    const id = '123';
    const key = PatternHelpers.entityKey(entityType, id);
    const parsed = PatternHelpers.parseEntityKey(key);
    expect(parsed).toEqual({ entityType, id });
  });

  test('should work with complex IDs', () => {
    const entityType = 'ORDER';
    const id = 'order-2024-abc-def-123';
    const key = PatternHelpers.entityKey(entityType, id);
    const parsed = PatternHelpers.parseEntityKey(key);
    expect(parsed).toEqual({ entityType, id });
  });
});

describe('timeSeriesKey', () => {
  test('should create hourly time-series key', () => {
    const date = new Date('2024-12-02T15:30:45Z');
    const result = PatternHelpers.timeSeriesKey(date, 'hour');
    expect(result).toBe('2024-12-02-15');
  });

  test('should create daily time-series key', () => {
    const date = new Date('2024-12-02T15:30:45Z');
    const result = PatternHelpers.timeSeriesKey(date, 'day');
    expect(result).toBe('2024-12-02');
  });

  test('should create monthly time-series key', () => {
    const date = new Date('2024-12-02T15:30:45Z');
    const result = PatternHelpers.timeSeriesKey(date, 'month');
    expect(result).toBe('2024-12');
  });

  test('should pad single-digit months and days', () => {
    const date = new Date('2024-01-05T08:30:00Z');
    expect(PatternHelpers.timeSeriesKey(date, 'hour')).toBe('2024-01-05-08');
    expect(PatternHelpers.timeSeriesKey(date, 'day')).toBe('2024-01-05');
    expect(PatternHelpers.timeSeriesKey(date, 'month')).toBe('2024-01');
  });

  test('should handle midnight hour', () => {
    const date = new Date('2024-12-02T00:00:00Z');
    const result = PatternHelpers.timeSeriesKey(date, 'hour');
    expect(result).toBe('2024-12-02-00');
  });

  test('should handle end of day', () => {
    const date = new Date('2024-12-02T23:59:59Z');
    const result = PatternHelpers.timeSeriesKey(date, 'hour');
    expect(result).toBe('2024-12-02-23');
  });

  test('should throw error for invalid date', () => {
    const invalidDate = new Date('invalid');
    expect(() => PatternHelpers.timeSeriesKey(invalidDate, 'day')).toThrow(
      'timeSeriesKey requires a valid Date object'
    );
  });

  test('should throw error for invalid granularity', () => {
    const date = new Date('2024-12-02T15:30:00Z');
    // @ts-expect-error Testing invalid granularity
    expect(() => PatternHelpers.timeSeriesKey(date, 'week')).toThrow(
      'Invalid granularity: "week". Must be \'hour\', \'day\', or \'month\''
    );
  });

  test('should use UTC time', () => {
    // Create a date that would be different in different timezones
    const date = new Date('2024-12-02T23:30:00Z'); // 11:30 PM UTC
    const result = PatternHelpers.timeSeriesKey(date, 'day');
    expect(result).toBe('2024-12-02'); // Should use UTC, not local time
  });
});

describe('ttlTimestamp', () => {
  test('should convert date to Unix timestamp in seconds', () => {
    const date = new Date('2024-12-02T15:30:00Z');
    const result = PatternHelpers.ttlTimestamp(date);
    expect(result).toBe(Math.floor(date.getTime() / 1000));
  });

  test('should return integer timestamp', () => {
    const date = new Date('2024-12-02T15:30:45.123Z');
    const result = PatternHelpers.ttlTimestamp(date);
    expect(Number.isInteger(result)).toBe(true);
  });

  test('should handle epoch time', () => {
    const date = new Date(0);
    const result = PatternHelpers.ttlTimestamp(date);
    expect(result).toBe(0);
  });

  test('should handle future dates', () => {
    const date = new Date('2030-01-01T00:00:00Z');
    const result = PatternHelpers.ttlTimestamp(date);
    expect(result).toBeGreaterThan(Date.now() / 1000);
  });

  test('should throw error for invalid date', () => {
    const invalidDate = new Date('invalid');
    expect(() => PatternHelpers.ttlTimestamp(invalidDate)).toThrow(
      'ttlTimestamp requires a valid Date object'
    );
  });

  test('should be consistent with Date.getTime()', () => {
    const date = new Date('2024-12-02T15:30:00Z');
    const result = PatternHelpers.ttlTimestamp(date);
    const expected = Math.floor(date.getTime() / 1000);
    expect(result).toBe(expected);
  });
});

describe('time-series integration', () => {
  test('should create partition key for time-series data', () => {
    const timestamp = new Date('2024-12-02T15:30:00Z');
    const pk = PatternHelpers.timeSeriesKey(timestamp, 'day');
    const ttl = PatternHelpers.ttlTimestamp(
      new Date(timestamp.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days later
    );

    expect(pk).toBe('2024-12-02');
    expect(ttl).toBeGreaterThan(PatternHelpers.ttlTimestamp(timestamp));
  });
});

describe('adjacencyKeys', () => {
  test('should create adjacency keys for relationship', () => {
    const result = PatternHelpers.adjacencyKeys('USER#123', 'ORDER#456');
    expect(result).toEqual({
      pk: 'USER#123',
      sk: 'ORDER#456',
    });
  });

  test('should create keys for different entity types', () => {
    expect(PatternHelpers.adjacencyKeys('USER#123', 'FRIEND#456')).toEqual({
      pk: 'USER#123',
      sk: 'FRIEND#456',
    });

    expect(PatternHelpers.adjacencyKeys('PRODUCT#abc', 'CATEGORY#xyz')).toEqual({
      pk: 'PRODUCT#abc',
      sk: 'CATEGORY#xyz',
    });
  });

  test('should handle complex IDs', () => {
    const result = PatternHelpers.adjacencyKeys(
      'USER#user-123-abc',
      'ORDER#order-2024-456'
    );
    expect(result).toEqual({
      pk: 'USER#user-123-abc',
      sk: 'ORDER#order-2024-456',
    });
  });

  test('should throw error for empty sourceId', () => {
    expect(() => PatternHelpers.adjacencyKeys('', 'ORDER#456')).toThrow(
      'adjacencyKeys requires a non-empty sourceId'
    );
  });

  test('should throw error for empty targetId', () => {
    expect(() => PatternHelpers.adjacencyKeys('USER#123', '')).toThrow(
      'adjacencyKeys requires a non-empty targetId'
    );
  });

  test('should support bidirectional relationships', () => {
    // Forward relationship
    const forward = PatternHelpers.adjacencyKeys('USER#123', 'USER#456');
    expect(forward).toEqual({
      pk: 'USER#123',
      sk: 'USER#456',
    });

    // Reverse relationship
    const reverse = PatternHelpers.adjacencyKeys('USER#456', 'USER#123');
    expect(reverse).toEqual({
      pk: 'USER#456',
      sk: 'USER#123',
    });

    // They should be different
    expect(forward.pk).not.toBe(reverse.pk);
    expect(forward.sk).not.toBe(reverse.sk);
  });

  test('should work with entity keys', () => {
    const userId = PatternHelpers.entityKey('USER', '123');
    const orderId = PatternHelpers.entityKey('ORDER', '456');
    const result = PatternHelpers.adjacencyKeys(userId, orderId);

    expect(result).toEqual({
      pk: 'USER#123',
      sk: 'ORDER#456',
    });
  });
});

describe('hierarchicalKey', () => {
  test('should create hierarchical key from path', () => {
    const result = PatternHelpers.hierarchicalKey(['root', 'folder1', 'item']);
    expect(result).toBe('root/folder1/item');
  });

  test('should handle single segment path', () => {
    const result = PatternHelpers.hierarchicalKey(['root']);
    expect(result).toBe('root');
  });

  test('should handle deep hierarchies', () => {
    const result = PatternHelpers.hierarchicalKey([
      'root',
      'level1',
      'level2',
      'level3',
      'level4',
      'item',
    ]);
    expect(result).toBe('root/level1/level2/level3/level4/item');
  });

  test('should throw error for empty path array', () => {
    expect(() => PatternHelpers.hierarchicalKey([])).toThrow(
      'hierarchicalKey requires a non-empty path array'
    );
  });

  test('should throw error for path with empty segment', () => {
    expect(() => PatternHelpers.hierarchicalKey(['root', '', 'item'])).toThrow(
      'hierarchicalKey path segments cannot be empty'
    );
  });

  test('should throw error if segment contains separator', () => {
    expect(() =>
      PatternHelpers.hierarchicalKey(['root', 'folder/subfolder', 'item'])
    ).toThrow(
      'Path segment "folder/subfolder" contains separator "/". Path segments cannot contain slashes.'
    );
  });

  test('should handle special characters in segments', () => {
    const result = PatternHelpers.hierarchicalKey([
      'root',
      'folder-1',
      'item_123',
    ]);
    expect(result).toBe('root/folder-1/item_123');
  });
});

describe('parseHierarchicalKey', () => {
  test('should parse hierarchical key into path', () => {
    const result = PatternHelpers.parseHierarchicalKey('root/folder1/item');
    expect(result).toEqual(['root', 'folder1', 'item']);
  });

  test('should parse single segment key', () => {
    const result = PatternHelpers.parseHierarchicalKey('root');
    expect(result).toEqual(['root']);
  });

  test('should parse deep hierarchies', () => {
    const result = PatternHelpers.parseHierarchicalKey(
      'root/level1/level2/level3/level4/item'
    );
    expect(result).toEqual(['root', 'level1', 'level2', 'level3', 'level4', 'item']);
  });

  test('should throw error for empty key', () => {
    expect(() => PatternHelpers.parseHierarchicalKey('')).toThrow(
      'parseHierarchicalKey requires a non-empty key'
    );
  });

  test('should handle keys with empty segments', () => {
    const result = PatternHelpers.parseHierarchicalKey('root//item');
    expect(result).toEqual(['root', '', 'item']);
  });

  test('should handle special characters', () => {
    const result = PatternHelpers.parseHierarchicalKey('root/folder-1/item_123');
    expect(result).toEqual(['root', 'folder-1', 'item_123']);
  });
});

describe('hierarchicalKey and parseHierarchicalKey round-trip', () => {
  test('should maintain data integrity through create and parse', () => {
    const path = ['root', 'folder1', 'subfolder', 'item'];
    const key = PatternHelpers.hierarchicalKey(path);
    const parsed = PatternHelpers.parseHierarchicalKey(key);
    expect(parsed).toEqual(path);
  });

  test('should work with single segment', () => {
    const path = ['root'];
    const key = PatternHelpers.hierarchicalKey(path);
    const parsed = PatternHelpers.parseHierarchicalKey(key);
    expect(parsed).toEqual(path);
  });

  test('should work with deep hierarchies', () => {
    const path = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const key = PatternHelpers.hierarchicalKey(path);
    const parsed = PatternHelpers.parseHierarchicalKey(key);
    expect(parsed).toEqual(path);
  });
});

describe('hierarchical data use cases', () => {
  test('should support file system-like structures', () => {
    const filePath = PatternHelpers.hierarchicalKey([
      'documents',
      '2024',
      'reports',
      'annual-report.pdf',
    ]);
    expect(filePath).toBe('documents/2024/reports/annual-report.pdf');

    const parsed = PatternHelpers.parseHierarchicalKey(filePath);
    expect(parsed[parsed.length - 1]).toBe('annual-report.pdf');
  });

  test('should support organizational hierarchies', () => {
    const orgPath = PatternHelpers.hierarchicalKey([
      'company',
      'engineering',
      'backend',
      'team-a',
    ]);
    expect(orgPath).toBe('company/engineering/backend/team-a');
  });

  test('should enable prefix queries', () => {
    // Create keys for items in a folder
    const folder = PatternHelpers.hierarchicalKey(['root', 'folder1']);
    const item1 = PatternHelpers.hierarchicalKey(['root', 'folder1', 'item1']);
    const item2 = PatternHelpers.hierarchicalKey(['root', 'folder1', 'item2']);

    // All items should start with the folder prefix
    expect(item1.startsWith(folder)).toBe(true);
    expect(item2.startsWith(folder)).toBe(true);
  });
});

describe('distributedKey', () => {
  test('should create distributed key with shard suffix', () => {
    const result = PatternHelpers.distributedKey('POPULAR_ITEM', 10);
    expect(result).toMatch(/^POPULAR_ITEM#SHARD_\d$/);
  });

  test('should generate shard within range', () => {
    const shardCount = 5;
    const results = new Set<string>();

    // Generate multiple keys to check distribution
    for (let i = 0; i < 50; i++) {
      const key = PatternHelpers.distributedKey('ITEM', shardCount);
      results.add(key);

      const shard = PatternHelpers.getShardNumber(key);
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(shardCount);
    }

    // Should generate at least some different shards
    expect(results.size).toBeGreaterThan(1);
  });

  test('should handle single shard', () => {
    const result = PatternHelpers.distributedKey('ITEM', 1);
    expect(result).toBe('ITEM#SHARD_0');
  });

  test('should handle large shard counts', () => {
    const result = PatternHelpers.distributedKey('ITEM', 1000);
    expect(result).toMatch(/^ITEM#SHARD_\d+$/);

    const shard = PatternHelpers.getShardNumber(result);
    expect(shard).toBeGreaterThanOrEqual(0);
    expect(shard).toBeLessThan(1000);
  });

  test('should throw error for empty baseKey', () => {
    expect(() => PatternHelpers.distributedKey('', 10)).toThrow(
      'distributedKey requires a non-empty baseKey'
    );
  });

  test('should throw error for invalid shardCount', () => {
    expect(() => PatternHelpers.distributedKey('ITEM', 0)).toThrow(
      'distributedKey requires shardCount to be a positive integer'
    );

    expect(() => PatternHelpers.distributedKey('ITEM', -5)).toThrow(
      'distributedKey requires shardCount to be a positive integer'
    );

    expect(() => PatternHelpers.distributedKey('ITEM', 3.5)).toThrow(
      'distributedKey requires shardCount to be a positive integer'
    );
  });

  test('should work with complex base keys', () => {
    const result = PatternHelpers.distributedKey('USER#123#POPULAR', 10);
    expect(result).toMatch(/^USER#123#POPULAR#SHARD_\d$/);
  });
});

describe('getShardNumber', () => {
  test('should extract shard number from distributed key', () => {
    const result = PatternHelpers.getShardNumber('ITEM#SHARD_7');
    expect(result).toBe(7);
  });

  test('should extract shard number from various keys', () => {
    expect(PatternHelpers.getShardNumber('ITEM#SHARD_0')).toBe(0);
    expect(PatternHelpers.getShardNumber('ITEM#SHARD_99')).toBe(99);
    expect(PatternHelpers.getShardNumber('ITEM#SHARD_999')).toBe(999);
  });

  test('should return null for non-distributed keys', () => {
    expect(PatternHelpers.getShardNumber('REGULAR_KEY')).toBeNull();
    expect(PatternHelpers.getShardNumber('USER#123')).toBeNull();
    expect(PatternHelpers.getShardNumber('ITEM#SHARD')).toBeNull();
  });

  test('should handle keys with multiple # separators', () => {
    const result = PatternHelpers.getShardNumber('USER#123#ITEM#SHARD_5');
    expect(result).toBe(5);
  });

  test('should throw error for empty key', () => {
    expect(() => PatternHelpers.getShardNumber('')).toThrow(
      'getShardNumber requires a non-empty key'
    );
  });

  test('should only match shard suffix at end of key', () => {
    // Should not match SHARD_ in the middle
    expect(PatternHelpers.getShardNumber('SHARD_5#ITEM')).toBeNull();
  });
});

describe('distributedKey and getShardNumber integration', () => {
  test('should round-trip shard information', () => {
    const shardCount = 10;
    const key = PatternHelpers.distributedKey('ITEM', shardCount);
    const shard = PatternHelpers.getShardNumber(key);

    expect(shard).not.toBeNull();
    expect(shard).toBeGreaterThanOrEqual(0);
    expect(shard).toBeLessThan(shardCount);
  });

  test('should enable querying all shards', () => {
    const baseKey = 'POPULAR_ITEM';
    const shardCount = 5;

    // Generate all possible shard keys for querying
    const allShardKeys = Array.from({ length: shardCount }, (_, i) => {
      return `${baseKey}#SHARD_${i}`;
    });

    expect(allShardKeys).toHaveLength(5);
    expect(allShardKeys[0]).toBe('POPULAR_ITEM#SHARD_0');
    expect(allShardKeys[4]).toBe('POPULAR_ITEM#SHARD_4');

    // Verify all can be parsed
    for (const key of allShardKeys) {
      const shard = PatternHelpers.getShardNumber(key);
      expect(shard).not.toBeNull();
    }
  });
});

describe('hot partition prevention use cases', () => {
  test('should distribute writes for popular items', () => {
    const popularItemId = 'TRENDING_PRODUCT_123';
    const shardCount = 10;

    // Simulate multiple writes
    const keys = Array.from({ length: 100 }, () =>
      PatternHelpers.distributedKey(popularItemId, shardCount)
    );

    // Count distribution
    const distribution = new Map<number, number>();
    for (const key of keys) {
      const shard = PatternHelpers.getShardNumber(key);
      if (shard !== null) {
        distribution.set(shard, (distribution.get(shard) || 0) + 1);
      }
    }

    // Should use multiple shards
    expect(distribution.size).toBeGreaterThan(1);

    // Each shard should be used at least once (with high probability)
    expect(distribution.size).toBeGreaterThanOrEqual(shardCount * 0.5);
  });

  test('should support reading from all shards', () => {
    const baseKey = 'POPULAR_ITEM';
    const shardCount = 5;

    // To read all data, query all shards
    const queryKeys = [];
    for (let i = 0; i < shardCount; i++) {
      queryKeys.push(`${baseKey}#SHARD_${i}`);
    }

    expect(queryKeys).toHaveLength(5);

    // Verify each query key is valid
    for (const key of queryKeys) {
      const shard = PatternHelpers.getShardNumber(key);
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(shardCount);
    }
  });
});

describe('versionAttribute', () => {
  test('should return standard version attribute name', () => {
    const result = PatternHelpers.versionAttribute();
    expect(result).toBe('version');
  });

  test('should be consistent across calls', () => {
    const result1 = PatternHelpers.versionAttribute();
    const result2 = PatternHelpers.versionAttribute();
    expect(result1).toBe(result2);
  });
});

describe('incrementVersion', () => {
  test('should increment version by 1', () => {
    expect(PatternHelpers.incrementVersion(0)).toBe(1);
    expect(PatternHelpers.incrementVersion(1)).toBe(2);
    expect(PatternHelpers.incrementVersion(5)).toBe(6);
  });

  test('should handle large version numbers', () => {
    expect(PatternHelpers.incrementVersion(999)).toBe(1000);
    expect(PatternHelpers.incrementVersion(1000000)).toBe(1000001);
  });

  test('should throw error for negative version', () => {
    expect(() => PatternHelpers.incrementVersion(-1)).toThrow(
      'incrementVersion requires currentVersion to be a non-negative integer'
    );
  });

  test('should throw error for non-integer version', () => {
    expect(() => PatternHelpers.incrementVersion(1.5)).toThrow(
      'incrementVersion requires currentVersion to be a non-negative integer'
    );
  });

  test('should throw error for NaN', () => {
    expect(() => PatternHelpers.incrementVersion(Number.NaN)).toThrow(
      'incrementVersion requires currentVersion to be a non-negative integer'
    );
  });
});

describe('optimistic locking use cases', () => {
  test('should support version-based updates', () => {
    // Initial item
    const item = {
      pk: 'USER#123',
      sk: 'PROFILE',
      name: 'John Doe',
      [PatternHelpers.versionAttribute()]: 0,
    };

    // Update with version check
    const currentVersion = item[PatternHelpers.versionAttribute()];
    const newVersion = PatternHelpers.incrementVersion(currentVersion);

    expect(newVersion).toBe(1);

    // Updated item
    const updatedItem = {
      ...item,
      name: 'Jane Doe',
      [PatternHelpers.versionAttribute()]: newVersion,
    };

    expect(updatedItem.version).toBe(1);
  });

  test('should support multiple sequential updates', () => {
    let version = 0;

    // Simulate 5 updates
    for (let i = 0; i < 5; i++) {
      version = PatternHelpers.incrementVersion(version);
    }

    expect(version).toBe(5);
  });

  test('should provide consistent attribute name for conditions', () => {
    const versionAttr = PatternHelpers.versionAttribute();

    // Can be used in condition expressions
    const condition = `${versionAttr} = :expectedVersion`;
    expect(condition).toBe('version = :expectedVersion');
  });

  test('should support optimistic locking workflow', () => {
    // 1. Read item with current version
    const currentItem = {
      pk: 'ORDER#123',
      status: 'PENDING',
      [PatternHelpers.versionAttribute()]: 3,
    };

    // 2. Prepare update with incremented version
    const currentVersion = currentItem[PatternHelpers.versionAttribute()];
    const newVersion = PatternHelpers.incrementVersion(currentVersion);

    // 3. Update with condition on current version
    const updateCondition = {
      [PatternHelpers.versionAttribute()]: currentVersion, // Must match current
    };

    const updatedItem = {
      ...currentItem,
      status: 'PROCESSING',
      [PatternHelpers.versionAttribute()]: newVersion,
    };

    expect(updatedItem.version).toBe(4);
    expect(updateCondition.version).toBe(3);
  });
});

describe('sparseIndexValue', () => {
  test('should return value when condition is true', () => {
    const result = PatternHelpers.sparseIndexValue(true, 'VERIFIED#USER');
    expect(result).toBe('VERIFIED#USER');
  });

  test('should return undefined when condition is false', () => {
    const result = PatternHelpers.sparseIndexValue(false, 'VERIFIED#USER');
    expect(result).toBeUndefined();
  });

  test('should work with different value types', () => {
    expect(PatternHelpers.sparseIndexValue(true, 'PREMIUM')).toBe('PREMIUM');
    expect(PatternHelpers.sparseIndexValue(true, 'ACTIVE#2024')).toBe('ACTIVE#2024');
    expect(PatternHelpers.sparseIndexValue(true, 'STATUS#VERIFIED')).toBe(
      'STATUS#VERIFIED'
    );
  });

  test('should handle empty string value', () => {
    expect(PatternHelpers.sparseIndexValue(true, '')).toBe('');
    expect(PatternHelpers.sparseIndexValue(false, '')).toBeUndefined();
  });

  test('should work with boolean expressions', () => {
    const emailVerified = true;
    const isPremium = false;

    expect(PatternHelpers.sparseIndexValue(emailVerified, 'VERIFIED')).toBe(
      'VERIFIED'
    );
    expect(PatternHelpers.sparseIndexValue(isPremium, 'PREMIUM')).toBeUndefined();
  });
});

describe('sparse index use cases', () => {
  test('should create sparse GSI for verified users only', () => {
    const users = [
      { id: '1', email: 'user1@example.com', emailVerified: true },
      { id: '2', email: 'user2@example.com', emailVerified: false },
      { id: '3', email: 'user3@example.com', emailVerified: true },
    ];

    const items = users.map((user) => ({
      pk: `USER#${user.id}`,
      sk: 'PROFILE',
      email: user.email,
      // Only verified users appear in GSI
      gsi1pk: PatternHelpers.sparseIndexValue(
        user.emailVerified,
        'VERIFIED#USER'
      ),
    }));

    // Verified users have GSI key
    expect(items[0].gsi1pk).toBe('VERIFIED#USER');
    expect(items[2].gsi1pk).toBe('VERIFIED#USER');

    // Unverified user doesn't have GSI key
    expect(items[1].gsi1pk).toBeUndefined();
  });

  test('should create sparse GSI for premium users', () => {
    const user = {
      id: '123',
      name: 'John Doe',
      isPremium: true,
      isActive: true,
    };

    const item = {
      pk: `USER#${user.id}`,
      sk: 'PROFILE',
      name: user.name,
      // Only premium users in premium GSI
      premiumGsi: PatternHelpers.sparseIndexValue(user.isPremium, 'PREMIUM'),
      // Only active users in active GSI
      activeGsi: PatternHelpers.sparseIndexValue(user.isActive, 'ACTIVE'),
    };

    expect(item.premiumGsi).toBe('PREMIUM');
    expect(item.activeGsi).toBe('ACTIVE');
  });

  test('should support conditional GSI population', () => {
    const order = {
      id: 'ORDER#123',
      status: 'PENDING',
      requiresReview: true,
    };

    const item = {
      pk: order.id,
      sk: 'METADATA',
      status: order.status,
      // Only orders requiring review appear in review GSI
      reviewGsi: PatternHelpers.sparseIndexValue(
        order.requiresReview,
        `REVIEW#${order.status}`
      ),
    };

    expect(item.reviewGsi).toBe('REVIEW#PENDING');

    // Order not requiring review
    const normalOrder = {
      id: 'ORDER#456',
      status: 'COMPLETED',
      requiresReview: false,
    };

    const normalItem = {
      pk: normalOrder.id,
      sk: 'METADATA',
      status: normalOrder.status,
      reviewGsi: PatternHelpers.sparseIndexValue(
        normalOrder.requiresReview,
        `REVIEW#${normalOrder.status}`
      ),
    };

    expect(normalItem.reviewGsi).toBeUndefined();
  });

  test('should reduce GSI storage costs', () => {
    // Scenario: 1000 users, only 100 are premium
    const totalUsers = 1000;
    const premiumUsers = 100;

    const users = Array.from({ length: totalUsers }, (_, i) => ({
      id: `${i}`,
      isPremium: i < premiumUsers,
    }));

    const items = users.map((user) => ({
      pk: `USER#${user.id}`,
      premiumGsi: PatternHelpers.sparseIndexValue(user.isPremium, 'PREMIUM'),
    }));

    // Count items with GSI key
    const itemsInGsi = items.filter((item) => item.premiumGsi !== undefined);

    expect(itemsInGsi).toHaveLength(premiumUsers);
    // 90% of items don't consume GSI storage
    expect(itemsInGsi.length / totalUsers).toBe(0.1);
  });

  test('should support multiple sparse indexes', () => {
    const user = {
      id: '123',
      emailVerified: true,
      phoneVerified: false,
      isPremium: true,
      isActive: true,
    };

    const item = {
      pk: `USER#${user.id}`,
      sk: 'PROFILE',
      emailVerifiedGsi: PatternHelpers.sparseIndexValue(
        user.emailVerified,
        'EMAIL_VERIFIED'
      ),
      phoneVerifiedGsi: PatternHelpers.sparseIndexValue(
        user.phoneVerified,
        'PHONE_VERIFIED'
      ),
      premiumGsi: PatternHelpers.sparseIndexValue(user.isPremium, 'PREMIUM'),
      activeGsi: PatternHelpers.sparseIndexValue(user.isActive, 'ACTIVE'),
    };

    expect(item.emailVerifiedGsi).toBe('EMAIL_VERIFIED');
    expect(item.phoneVerifiedGsi).toBeUndefined();
    expect(item.premiumGsi).toBe('PREMIUM');
    expect(item.activeGsi).toBe('ACTIVE');
  });
});

describe('gsiKey', () => {
  test('should create GSI key with entity type prefix', () => {
    const result = PatternHelpers.gsiKey('GSI1', 'USER', 'active');
    expect(result).toBe('USER#active');
  });

  test('should create keys for different entity types', () => {
    expect(PatternHelpers.gsiKey('GSI1', 'ORDER', 'pending')).toBe('ORDER#pending');
    expect(PatternHelpers.gsiKey('GSI1', 'PRODUCT', 'available')).toBe(
      'PRODUCT#available'
    );
    expect(PatternHelpers.gsiKey('StatusIndex', 'TICKET', 'open')).toBe(
      'TICKET#open'
    );
  });

  test('should handle complex values', () => {
    expect(PatternHelpers.gsiKey('GSI1', 'USER', 'status-active-2024')).toBe(
      'USER#status-active-2024'
    );
    expect(PatternHelpers.gsiKey('GSI1', 'ORDER', 'priority_high')).toBe(
      'ORDER#priority_high'
    );
  });

  test('should throw error for empty indexName', () => {
    expect(() => PatternHelpers.gsiKey('', 'USER', 'active')).toThrow(
      'gsiKey requires a non-empty indexName'
    );
  });

  test('should throw error for empty entityType', () => {
    expect(() => PatternHelpers.gsiKey('GSI1', '', 'active')).toThrow(
      'gsiKey requires a non-empty entityType'
    );
  });

  test('should throw error for empty value', () => {
    expect(() => PatternHelpers.gsiKey('GSI1', 'USER', '')).toThrow(
      'gsiKey requires a non-empty value'
    );
  });

  test('should use same format regardless of index name', () => {
    // Index name is for documentation, doesn't affect the key
    const key1 = PatternHelpers.gsiKey('GSI1', 'USER', 'active');
    const key2 = PatternHelpers.gsiKey('StatusIndex', 'USER', 'active');
    expect(key1).toBe(key2);
  });
});

describe('GSI overloading use cases', () => {
  test('should enable multiple entity types in same GSI', () => {
    // Different entity types sharing GSI1
    const userKey = PatternHelpers.gsiKey('GSI1', 'USER', 'active');
    const orderKey = PatternHelpers.gsiKey('GSI1', 'ORDER', 'pending');
    const productKey = PatternHelpers.gsiKey('GSI1', 'PRODUCT', 'available');

    expect(userKey).toBe('USER#active');
    expect(orderKey).toBe('ORDER#pending');
    expect(productKey).toBe('PRODUCT#available');

    // All different, can coexist in same GSI
    expect(userKey).not.toBe(orderKey);
    expect(orderKey).not.toBe(productKey);
  });

  test('should support status-based queries per entity type', () => {
    const users = [
      { id: '1', status: 'active' },
      { id: '2', status: 'inactive' },
      { id: '3', status: 'active' },
    ];

    const items = users.map((user) => ({
      pk: `USER#${user.id}`,
      sk: 'PROFILE',
      gsi1pk: PatternHelpers.gsiKey('StatusIndex', 'USER', user.status),
    }));

    // Can query for all active users
    const activeUsers = items.filter((item) => item.gsi1pk === 'USER#active');
    expect(activeUsers).toHaveLength(2);
  });

  test('should support single-table design with shared GSI', () => {
    // Multiple entity types in one table, sharing GSI1
    const entities = [
      { type: 'USER', id: '1', status: 'active' },
      { type: 'USER', id: '2', status: 'inactive' },
      { type: 'ORDER', id: '101', status: 'pending' },
      { type: 'ORDER', id: '102', status: 'completed' },
      { type: 'PRODUCT', id: '201', status: 'available' },
    ];

    const items = entities.map((entity) => ({
      pk: `${entity.type}#${entity.id}`,
      sk: 'METADATA',
      gsi1pk: PatternHelpers.gsiKey('GSI1', entity.type, entity.status),
    }));

    // Query active users
    const activeUsers = items.filter((item) => item.gsi1pk === 'USER#active');
    expect(activeUsers).toHaveLength(1);

    // Query pending orders
    const pendingOrders = items.filter((item) => item.gsi1pk === 'ORDER#pending');
    expect(pendingOrders).toHaveLength(1);

    // Query available products
    const availableProducts = items.filter(
      (item) => item.gsi1pk === 'PRODUCT#available'
    );
    expect(availableProducts).toHaveLength(1);
  });

  test('should enable efficient GSI usage', () => {
    // Instead of creating separate GSIs for each entity type,
    // use one GSI with entity type prefix

    const user = {
      pk: 'USER#123',
      sk: 'PROFILE',
      // Single GSI for all status queries
      gsi1pk: PatternHelpers.gsiKey('StatusIndex', 'USER', 'active'),
    };

    const order = {
      pk: 'ORDER#456',
      sk: 'METADATA',
      // Same GSI, different entity type
      gsi1pk: PatternHelpers.gsiKey('StatusIndex', 'ORDER', 'pending'),
    };

    expect(user.gsi1pk).toBe('USER#active');
    expect(order.gsi1pk).toBe('ORDER#pending');

    // Both use the same GSI, but queries are isolated by entity type
  });

  test('should support complex access patterns', () => {
    // Combine with other helpers for rich patterns
    const tenantId = 'abc';
    const status = 'active';

    // Multi-tenant with status
    const gsiKey = PatternHelpers.gsiKey(
      'TenantStatusIndex',
      'USER',
      PatternHelpers.compositeKey(['TENANT', tenantId, status])
    );

    expect(gsiKey).toBe('USER#TENANT#abc#active');
  });

  test('should work with sparse indexes', () => {
    const user = {
      id: '123',
      isPremium: true,
      status: 'active',
    };

    const item = {
      pk: `USER#${user.id}`,
      sk: 'PROFILE',
      // Only premium users appear in this GSI
      premiumGsi: PatternHelpers.sparseIndexValue(
        user.isPremium,
        PatternHelpers.gsiKey('PremiumIndex', 'USER', user.status)
      ),
    };

    expect(item.premiumGsi).toBe('USER#active');

    // Non-premium user
    const regularUser = {
      id: '456',
      isPremium: false,
      status: 'active',
    };

    const regularItem = {
      pk: `USER#${regularUser.id}`,
      sk: 'PROFILE',
      premiumGsi: PatternHelpers.sparseIndexValue(
        regularUser.isPremium,
        PatternHelpers.gsiKey('PremiumIndex', 'USER', regularUser.status)
      ),
    };

    expect(regularItem.premiumGsi).toBeUndefined();
  });
});
