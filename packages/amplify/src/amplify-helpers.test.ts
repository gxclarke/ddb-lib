/**
 * Tests for AmplifyHelpers
 */

import { describe, test as it, expect } from '@rstest/core';
import { AmplifyHelpers } from './amplify-helpers';

describe('AmplifyHelpers', () => {
  describe('amplifyCompositeKey', () => {
    it('should create composite key from parts', () => {
      const key = AmplifyHelpers.amplifyCompositeKey(['TENANT', 'acme', 'USER', '123']);
      expect(key).toBe('TENANT#acme#USER#123');
    });

    it('should use custom separator', () => {
      const key = AmplifyHelpers.amplifyCompositeKey(['part1', 'part2'], '|');
      expect(key).toBe('part1|part2');
    });

    it('should throw error for empty parts array', () => {
      expect(() => AmplifyHelpers.amplifyCompositeKey([])).toThrow();
    });

    it('should throw error if part contains separator', () => {
      expect(() => AmplifyHelpers.amplifyCompositeKey(['part#1', 'part2'])).toThrow();
    });
  });

  describe('parseAmplifyKey', () => {
    it('should parse key with model name', () => {
      const result = AmplifyHelpers.parseAmplifyKey('Todo#123');
      expect(result).toEqual({ modelName: 'Todo', id: '123' });
    });

    it('should parse key without model name', () => {
      const result = AmplifyHelpers.parseAmplifyKey('123');
      expect(result).toEqual({ modelName: '', id: '123' });
    });

    it('should handle key with multiple separators', () => {
      const result = AmplifyHelpers.parseAmplifyKey('Todo#123#456');
      expect(result).toEqual({ modelName: 'Todo', id: '123#456' });
    });

    it('should throw error for empty key', () => {
      expect(() => AmplifyHelpers.parseAmplifyKey('')).toThrow();
    });
  });

  describe('amplifyGSIKey', () => {
    it('should create GSI key', () => {
      const key = AmplifyHelpers.amplifyGSIKey('byStatus', 'active');
      expect(key).toBe('byStatus#active');
    });

    it('should handle email values', () => {
      const key = AmplifyHelpers.amplifyGSIKey('byEmail', 'user@example.com');
      expect(key).toBe('byEmail#user@example.com');
    });

    it('should throw error for empty index name', () => {
      expect(() => AmplifyHelpers.amplifyGSIKey('', 'value')).toThrow();
    });

    it('should throw error for empty value', () => {
      expect(() => AmplifyHelpers.amplifyGSIKey('index', '')).toThrow();
    });
  });

  describe('schemaToAccessPatterns', () => {
    it('should return empty patterns for now', () => {
      const schema = { models: {} };
      const patterns = AmplifyHelpers.schemaToAccessPatterns(schema);
      expect(patterns).toEqual({});
    });

    it('should throw error for null schema', () => {
      expect(() => AmplifyHelpers.schemaToAccessPatterns(null)).toThrow();
    });
  });

  describe('getTableName', () => {
    it('should extract table name from config.tableName', () => {
      const config = { tableName: 'MyTable' };
      const tableName = AmplifyHelpers.getTableName(config);
      expect(tableName).toBe('MyTable');
    });

    it('should extract table name from nested config', () => {
      const config = {
        API: {
          GraphQL: {
            tableName: 'MyTable',
          },
        },
      };
      const tableName = AmplifyHelpers.getTableName(config);
      expect(tableName).toBe('MyTable');
    });

    it('should throw error if table name not found', () => {
      const config = { other: 'value' };
      expect(() => AmplifyHelpers.getTableName(config)).toThrow();
    });

    it('should throw error for null config', () => {
      expect(() => AmplifyHelpers.getTableName(null)).toThrow();
    });
  });

  describe('amplifyTimeSeriesKey', () => {
    it('should create time-series key with day granularity', () => {
      const date = new Date('2024-12-03T15:30:00Z');
      const key = AmplifyHelpers.amplifyTimeSeriesKey(date, 'day');
      expect(key).toBe('2024-12-03');
    });

    it('should create time-series key with hour granularity', () => {
      const date = new Date('2024-12-03T15:30:00Z');
      const key = AmplifyHelpers.amplifyTimeSeriesKey(date, 'hour');
      expect(key).toBe('2024-12-03-15');
    });

    it('should create time-series key with month granularity', () => {
      const date = new Date('2024-12-03T15:30:00Z');
      const key = AmplifyHelpers.amplifyTimeSeriesKey(date, 'month');
      expect(key).toBe('2024-12');
    });
  });

  describe('amplifyEntityKey', () => {
    it('should create entity key', () => {
      const key = AmplifyHelpers.amplifyEntityKey('User', '123');
      expect(key).toBe('User#123');
    });

    it('should throw error for empty entity type', () => {
      expect(() => AmplifyHelpers.amplifyEntityKey('', '123')).toThrow();
    });

    it('should throw error for empty id', () => {
      expect(() => AmplifyHelpers.amplifyEntityKey('User', '')).toThrow();
    });
  });

  describe('amplifySparseIndex', () => {
    it('should return value when condition is true', () => {
      const result = AmplifyHelpers.amplifySparseIndex(true, 'VERIFIED');
      expect(result).toBe('VERIFIED');
    });

    it('should return undefined when condition is false', () => {
      const result = AmplifyHelpers.amplifySparseIndex(false, 'VERIFIED');
      expect(result).toBeUndefined();
    });
  });

  describe('amplifyAdjacencyKeys', () => {
    it('should create adjacency keys', () => {
      const keys = AmplifyHelpers.amplifyAdjacencyKeys('User#123', 'Group#456');
      expect(keys).toEqual({
        pk: 'User#123',
        sk: 'Group#456',
      });
    });

    it('should throw error for empty source id', () => {
      expect(() => AmplifyHelpers.amplifyAdjacencyKeys('', 'target')).toThrow();
    });

    it('should throw error for empty target id', () => {
      expect(() => AmplifyHelpers.amplifyAdjacencyKeys('source', '')).toThrow();
    });
  });

  describe('amplifyHierarchicalKey', () => {
    it('should create hierarchical key', () => {
      const key = AmplifyHelpers.amplifyHierarchicalKey(['org', 'team', 'project']);
      expect(key).toBe('org/team/project');
    });

    it('should handle single segment', () => {
      const key = AmplifyHelpers.amplifyHierarchicalKey(['root']);
      expect(key).toBe('root');
    });

    it('should throw error for empty path', () => {
      expect(() => AmplifyHelpers.amplifyHierarchicalKey([])).toThrow();
    });

    it('should throw error for path with slashes', () => {
      expect(() => AmplifyHelpers.amplifyHierarchicalKey(['org/team', 'project'])).toThrow();
    });
  });

  describe('amplifyFilterToExpression', () => {
    it('should return empty expression for null filter', () => {
      const result = AmplifyHelpers.amplifyFilterToExpression(null);
      expect(result).toEqual({
        expression: '',
        values: {},
        names: {},
      });
    });

    it('should return empty expression for undefined filter', () => {
      const result = AmplifyHelpers.amplifyFilterToExpression(undefined);
      expect(result).toEqual({
        expression: '',
        values: {},
        names: {},
      });
    });

    it('should handle filter object (placeholder)', () => {
      const filter = { status: { eq: 'active' } };
      const result = AmplifyHelpers.amplifyFilterToExpression(filter);
      // Currently returns empty - placeholder for future implementation
      expect(result).toEqual({
        expression: '',
        values: {},
        names: {},
      });
    });
  });
});
