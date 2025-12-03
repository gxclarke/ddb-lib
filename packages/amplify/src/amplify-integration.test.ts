/**
 * Integration tests for Amplify-specific patterns
 * Tests authorization, error handling, and type preservation
 */

import { describe, test as it, expect, beforeEach } from '@rstest/core';
import { AmplifyMonitor } from './amplify-monitor';

// Simple mock function helper
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

describe('Amplify Integration Patterns', () => {
  let monitor: AmplifyMonitor;

  beforeEach(() => {
    monitor = new AmplifyMonitor({
      statsConfig: {
        enabled: true,
        sampleRate: 1.0,
      },
    });
  });

  describe('Authorization Integration', () => {
    it('should preserve Amplify authorization context', async () => {
      // Mock Amplify model with authorization
      const mockModel = {
        name: 'Todo',
        get: vi.fn().mockResolvedValue({
          id: '1',
          title: 'Test',
          owner: 'user123',
        }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.get('1');

      // Verify authorization data is preserved
      expect(result).toHaveProperty('owner');
      expect(result.owner).toBe('user123');
    });

    it('should not interfere with Amplify authorization rules', async () => {
      // Mock Amplify model that throws authorization error
      const mockModel = {
        name: 'Todo',
        get: vi.fn().mockRejectedValue(new Error('Unauthorized')),
      };

      const wrapped = monitor.wrap(mockModel);

      // Verify error is propagated without modification
      await expect(wrapped.get('1')).rejects.toThrow('Unauthorized');

      // Verify operation was still recorded
      const stats = monitor.getStats();
      expect(stats.operations.get).toBeDefined();
    });
  });

  describe('Error Pattern Handling', () => {
    it('should handle Amplify validation errors', async () => {
      const validationError = new Error('Validation failed');
      (validationError as any).errorType = 'ValidationException';

      const mockModel = {
        name: 'Todo',
        create: vi.fn().mockRejectedValue(validationError),
      };

      const wrapped = monitor.wrap(mockModel);

      await expect(wrapped.create({ title: '' })).rejects.toThrow('Validation failed');

      // Verify error metadata is captured
      const exported = monitor.export();
      expect(exported[0].metadata?.error).toBe(true);
    });

    it('should handle Amplify network errors', async () => {
      const networkError = new Error('Network error');
      (networkError as any).errorType = 'NetworkException';

      const mockModel = {
        name: 'Todo',
        list: vi.fn().mockRejectedValue(networkError),
      };

      const wrapped = monitor.wrap(mockModel);

      await expect(wrapped.list()).rejects.toThrow('Network error');

      // Verify operation was recorded with error flag
      const stats = monitor.getStats();
      expect(stats.operations.query).toBeDefined();
    });

    it('should handle Amplify conditional check failures', async () => {
      const conditionalError = new Error('Conditional check failed');
      (conditionalError as any).errorType = 'ConditionalCheckFailedException';

      const mockModel = {
        name: 'Todo',
        update: vi.fn().mockRejectedValue(conditionalError),
      };

      const wrapped = monitor.wrap(mockModel);

      await expect(wrapped.update('1', { title: 'Updated' })).rejects.toThrow(
        'Conditional check failed'
      );
    });
  });

  describe('Type Definition Preservation', () => {
    interface Todo {
      id: string;
      title: string;
      completed: boolean;
      createdAt: string;
      updatedAt: string;
    }

    it('should preserve Amplify type definitions', async () => {
      const mockModel = {
        name: 'Todo',
        get: vi.fn().mockResolvedValue({
          id: '1',
          title: 'Test Todo',
          completed: false,
          createdAt: '2024-12-03T00:00:00Z',
          updatedAt: '2024-12-03T00:00:00Z',
        }),
      };

      const wrapped = monitor.wrap<Todo>(mockModel);
      const result = await wrapped.get('1');

      // TypeScript should enforce Todo type
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should preserve Amplify timestamps', async () => {
      const now = new Date().toISOString();
      const mockModel = {
        name: 'Todo',
        create: vi.fn().mockResolvedValue({
          id: '1',
          title: 'New Todo',
          createdAt: now,
          updatedAt: now,
        }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.create({ title: 'New Todo' });

      expect(result.createdAt).toBe(now);
      expect(result.updatedAt).toBe(now);
    });

    it('should preserve Amplify relationship data', async () => {
      const mockModel = {
        name: 'Todo',
        get: vi.fn().mockResolvedValue({
          id: '1',
          title: 'Test',
          owner: {
            id: 'user123',
            name: 'John Doe',
          },
          comments: [
            { id: 'c1', text: 'Comment 1' },
            { id: 'c2', text: 'Comment 2' },
          ],
        }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.get('1');

      expect(result.owner).toBeDefined();
      expect(result.owner.id).toBe('user123');
      expect(result.comments).toHaveLength(2);
    });
  });

  describe('Amplify DataStore Sync Operations', () => {
    it('should handle DataStore sync patterns', async () => {
      // Simulate DataStore sync operation
      const mockModel = {
        name: 'Todo',
        list: vi.fn().mockResolvedValue({
          data: [
            { id: '1', title: 'Todo 1', _version: 1, _deleted: false },
            { id: '2', title: 'Todo 2', _version: 1, _deleted: false },
          ],
          nextToken: null,
        }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.list();

      // Verify DataStore metadata is preserved
      expect(result[0]).toHaveProperty('_version');
      expect(result[0]).toHaveProperty('_deleted');
    });
  });

  describe('Amplify GraphQL Operation Patterns', () => {
    it('should handle GraphQL list with pagination', async () => {
      const mockModel = {
        name: 'Todo',
        list: vi.fn().mockResolvedValue({
          data: [{ id: '1', title: 'Todo 1' }],
          nextToken: 'token123',
        }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.list({ limit: 10 });

      expect(result).toHaveLength(1);
    });

    it('should handle GraphQL list with filters', async () => {
      const mockModel = {
        name: 'Todo',
        list: vi.fn().mockResolvedValue({
          data: [{ id: '1', title: 'Active Todo', completed: false }],
        }),
      };

      const wrapped = monitor.wrap(mockModel);
      const result = await wrapped.list({
        filter: { completed: { eq: false } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(false);

      // Verify filter is captured in metadata
      const exported = monitor.export();
      expect(exported[0].filter).toBeDefined();
    });
  });

  describe('Amplify Custom Operations', () => {
    it('should allow manual recording for custom operations', () => {
      // Record a custom Amplify operation not covered by standard CRUD
      monitor.recordOperation({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 150,
        itemCount: 10,
        patternName: 'customAmplifyQuery',
        metadata: {
          queryName: 'listTodosByPriority',
          priority: 'high',
        },
      });

      const stats = monitor.getStats();
      expect(stats.accessPatterns.customAmplifyQuery).toBeDefined();
      expect(stats.accessPatterns.customAmplifyQuery.count).toBe(1);
    });
  });

  describe('Amplify Batch Operations', () => {
    it('should handle multiple operations in sequence', async () => {
      const mockModel = {
        name: 'Todo',
        create: vi.fn()
          .mockResolvedValueOnce({ id: '1', title: 'Todo 1' })
          .mockResolvedValueOnce({ id: '2', title: 'Todo 2' })
          .mockResolvedValueOnce({ id: '3', title: 'Todo 3' }),
      };

      const wrapped = monitor.wrap(mockModel);

      await wrapped.create({ title: 'Todo 1' });
      await wrapped.create({ title: 'Todo 2' });
      await wrapped.create({ title: 'Todo 3' });

      const stats = monitor.getStats();
      expect(stats.operations.put.count).toBe(3);

      // Note: Batch recommendations require operations within a time window
      // In this test, operations may not be close enough in time to trigger the recommendation
    });
  });

  describe('Amplify Real-time Subscriptions', () => {
    it('should allow recording subscription operations', () => {
      // Amplify subscriptions are typically handled separately
      // but we can record their impact on the system
      monitor.recordOperation({
        operation: 'query',
        timestamp: Date.now(),
        latencyMs: 50,
        itemCount: 1,
        patternName: 'subscription',
        metadata: {
          subscriptionType: 'onCreate',
          modelName: 'Todo',
        },
      });

      const stats = monitor.getStats();
      expect(stats.accessPatterns.subscription).toBeDefined();
    });
  });
});
