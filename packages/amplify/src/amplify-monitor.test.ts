/**
 * Tests for AmplifyMonitor
 */

import { describe, test as it, expect, beforeEach } from '@rstest/core';
import { AmplifyMonitor } from './amplify-monitor';

// Simple mock function helper
function mockFn<T>(returnValue: T | Promise<T>) {
  const fn = async (...args: any[]) => returnValue;
  fn.calls = [] as any[][];
  const wrappedFn = async (...args: any[]) => {
    fn.calls.push(args);
    return fn(...args);
  };
  wrappedFn.calls = fn.calls;
  return wrappedFn;
}

const vi = {
  fn: () => {
    const calls: any[][] = [];
    const fn: any = (...args: any[]) => {
      calls.push(args);
      return fn._returnValue;
    };
    fn.calls = calls;
    fn.mockResolvedValue = (value: any) => {
      fn._returnValue = Promise.resolve(value);
      return fn;
    };
    fn.mockRejectedValue = (error: any) => {
      fn._returnValue = Promise.reject(error);
      return fn;
    };
    fn.mockResolvedValueOnce = (value: any) => {
      const originalFn = fn;
      let callCount = 0;
      const wrappedFn: any = (...args: any[]) => {
        calls.push(args);
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(value);
        }
        return originalFn(...args);
      };
      wrappedFn.calls = calls;
      wrappedFn.mockResolvedValueOnce = fn.mockResolvedValueOnce;
      return wrappedFn;
    };
    return fn;
  },
};

describe('AmplifyMonitor', () => {
  let monitor: AmplifyMonitor;

  beforeEach(() => {
    monitor = new AmplifyMonitor({
      statsConfig: {
        enabled: true,
        sampleRate: 1.0,
      },
    });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultMonitor = new AmplifyMonitor();
      expect(defaultMonitor.isEnabled()).toBe(true);
    });

    it('should initialize with custom config', () => {
      const customMonitor = new AmplifyMonitor({
        statsConfig: {
          enabled: false,
        },
        enableAutoInstrumentation: false,
      });
      expect(customMonitor.isEnabled()).toBe(false);
    });
  });

  describe('wrap', () => {
    it('should wrap model and track get operations', async () => {
      const mockModel = {
        name: 'Todo',
        get: async (params: any) => ({ id: '1', title: 'Test' }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.get('1');

      expect(result).toEqual({ id: '1', title: 'Test' });

      const stats = monitor.getStats();
      expect(stats.operations.get).toBeDefined();
      expect(stats.operations.get.count).toBe(1);
    });

    it('should track get operations that return null', async () => {
      const mockModel = {
        name: 'Todo',
        get: vi.fn().mockResolvedValue(null),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.get('1');

      expect(result).toBeNull();

      const stats = monitor.getStats();
      expect(stats.operations.get).toBeDefined();
      expect(stats.operations.get.count).toBe(1);
    });

    it('should track get operations that throw errors', async () => {
      const mockModel = {
        name: 'Todo',
        get: vi.fn().mockRejectedValue(new Error('Not found')),
      };

      const wrapped = monitor.wrap(mockModel);

      await expect(wrapped.get('1')).rejects.toThrow('Not found');

      const stats = monitor.getStats();
      expect(stats.operations.get).toBeDefined();
      expect(stats.operations.get.count).toBe(1);
    });

    it('should wrap model and track list operations', async () => {
      const mockModel = {
        name: 'Todo',
        list: vi.fn().mockResolvedValue([
          { id: '1', title: 'Test 1' },
          { id: '2', title: 'Test 2' },
        ]),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.list();

      expect(result).toHaveLength(2);

      const stats = monitor.getStats();
      expect(stats.operations.query).toBeDefined();
      expect(stats.operations.query.count).toBe(1);
    });

    it('should handle list operations with data wrapper', async () => {
      const mockModel = {
        name: 'Todo',
        list: vi.fn().mockResolvedValue({
          data: [{ id: '1', title: 'Test 1' }],
        }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.list();

      expect(result).toHaveLength(1);

      const stats = monitor.getStats();
      expect(stats.operations.query).toBeDefined();
    });

    it('should wrap model and track create operations', async () => {
      const mockModel = {
        name: 'Todo',
        create: vi.fn().mockResolvedValue({ id: '1', title: 'New Todo' }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.create({ title: 'New Todo' });

      expect(result).toEqual({ id: '1', title: 'New Todo' });

      const stats = monitor.getStats();
      expect(stats.operations.put).toBeDefined();
      expect(stats.operations.put.count).toBe(1);
    });

    it('should wrap model and track update operations', async () => {
      const mockModel = {
        name: 'Todo',
        update: vi.fn().mockResolvedValue({ id: '1', title: 'Updated' }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.update('1', { title: 'Updated' });

      expect(result).toEqual({ id: '1', title: 'Updated' });

      const stats = monitor.getStats();
      expect(stats.operations.update).toBeDefined();
      expect(stats.operations.update.count).toBe(1);
    });

    it('should wrap model and track delete operations', async () => {
      const mockModel = {
        name: 'Todo',
        delete: vi.fn().mockResolvedValue(undefined),
      };

      const wrapped = monitor.wrap(mockModel);
      await wrapped.delete('1');

      const stats = monitor.getStats();
      expect(stats.operations.delete).toBeDefined();
      expect(stats.operations.delete.count).toBe(1);
    });

    it('should allow unwrapping to access original model', () => {
      const mockModel = {
        name: 'Todo',
        customMethod: vi.fn(),
      };

      const wrapped = monitor.wrap(mockModel);
      const unwrapped = wrapped.unwrap();

      expect(unwrapped).toBe(mockModel);
    });

    it('should not track operations when auto-instrumentation is disabled', async () => {
      const noAutoMonitor = new AmplifyMonitor({
        statsConfig: { enabled: true },
        enableAutoInstrumentation: false,
      });

      const mockModel = {
        name: 'Todo',
        get: vi.fn().mockResolvedValue({ id: '1', title: 'Test' }),
      };

      const wrapped = noAutoMonitor.wrap(mockModel);
      await wrapped.get('1');

      const stats = noAutoMonitor.getStats();
      expect(stats.operations.get).toBeUndefined();
    });
  });

  describe('recordOperation', () => {
    it('should manually record an operation', () => {
      monitor.recordOperation({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      });

      const stats = monitor.getStats();
      expect(stats.operations.get).toBeDefined();
      expect(stats.operations.get.count).toBe(1);
      expect(stats.operations.get.avgLatencyMs).toBe(50);
    });

    it('should record multiple operations', () => {
      monitor.recordOperation({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      });

      monitor.recordOperation({
        operation: 'put',
        timestamp: Date.now(),
        latencyMs: 75,
        itemCount: 1,
      });

      const stats = monitor.getStats();
      expect(stats.operations.get.count).toBe(1);
      expect(stats.operations.put.count).toBe(1);
    });

    it('should record operations with custom metadata', () => {
      monitor.recordOperation({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 5,
        indexName: 'GSI1',
        patternName: 'getUsersByStatus',
        metadata: {
          customField: 'value',
        },
      });

      const stats = monitor.getStats();
      expect(stats.operations.query.count).toBe(1);
      expect(stats.accessPatterns.getUsersByStatus).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return empty stats when no operations recorded', () => {
      const stats = monitor.getStats();
      expect(stats.operations).toEqual({});
      expect(stats.accessPatterns).toEqual({});
    });

    it('should return aggregated stats', () => {
      monitor.recordOperation({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      });

      monitor.recordOperation({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 100,
        itemCount: 1,
      });

      const stats = monitor.getStats();
      expect(stats.operations.get.count).toBe(2);
      expect(stats.operations.get.avgLatencyMs).toBe(75);
    });
  });

  describe('getRecommendations', () => {
    it('should return empty recommendations when no operations recorded', () => {
      const recommendations = monitor.getRecommendations();
      expect(recommendations).toEqual([]);
    });

    it('should generate recommendations based on collected stats', () => {
      // Record multiple get operations in quick succession
      const baseTime = Date.now();
      for (let i = 0; i < 10; i++) {
        monitor.recordOperation({
          operation: 'get',
          timestamp: baseTime + i * 10,
          latencyMs: 50,
          itemCount: 1,
        });
      }

      const recommendations = monitor.getRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);

      // Should suggest batch operations
      const batchRec = recommendations.find(r => r.message.includes('Batch'));
      expect(batchRec).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should clear all collected statistics', () => {
      monitor.recordOperation({
        operation: 'get',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      });

      let stats = monitor.getStats();
      expect(stats.operations.get).toBeDefined();

      monitor.reset();

      stats = monitor.getStats();
      expect(stats.operations).toEqual({});
    });
  });

  describe('export', () => {
    it('should export raw operation data', () => {
      const operation = {
        operation: 'get' as const,
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
      };

      monitor.recordOperation(operation);

      const exported = monitor.export();
      expect(exported).toHaveLength(1);
      expect(exported[0]).toMatchObject(operation);
    });
  });

  describe('isEnabled', () => {
    it('should return true when stats collection is enabled', () => {
      expect(monitor.isEnabled()).toBe(true);
    });

    it('should return false when stats collection is disabled', () => {
      const disabledMonitor = new AmplifyMonitor({
        statsConfig: { enabled: false },
      });
      expect(disabledMonitor.isEnabled()).toBe(false);
    });
  });
});
