/**
 * AmplifyMonitor - Monitoring wrapper for AWS Amplify Gen 2 data client
 * Provides statistics collection and recommendations for Amplify operations
 */

import { StatsCollector, RecommendationEngine } from '@ddb-lib/stats';
import type { OperationRecord, TableStats, Recommendation } from '@ddb-lib/stats';
import type { AmplifyMonitorConfig, MonitoredModel, ListOptions } from './types';

/**
 * AmplifyMonitor class for monitoring Amplify Gen 2 data client operations
 */
export class AmplifyMonitor {
  private readonly statsCollector: StatsCollector;
  private readonly recommendationEngine: RecommendationEngine;
  private readonly enableAutoInstrumentation: boolean;

  constructor(config: AmplifyMonitorConfig = {}) {
    // Initialize stats collector with provided config or defaults
    const statsConfig = config.statsConfig ?? {
      enabled: true,
      sampleRate: 1.0,
      thresholds: {
        slowQueryMs: 100,
        highRCU: 50,
        highWCU: 50,
      },
    };

    this.statsCollector = new StatsCollector(statsConfig);
    this.recommendationEngine = new RecommendationEngine(this.statsCollector);
    this.enableAutoInstrumentation = config.enableAutoInstrumentation ?? true;
  }

  /**
   * Wrap an Amplify model to add monitoring capabilities
   * Creates a proxy that intercepts operations and records statistics
   * 
   * @param model - Amplify model to wrap
   * @returns Monitored model with same interface
   */
  wrap<TModel>(model: any): MonitoredModel<TModel> {
    const monitor = this;

    return {
      async get(id: string): Promise<TModel | null> {
        const startTime = Date.now();

        try {
          const result = await model.get({ id });
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'get',
              timestamp: startTime,
              latencyMs,
              itemCount: result ? 1 : 0,
              metadata: { modelName: model.name || 'unknown', id },
            });
          }

          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'get',
              timestamp: startTime,
              latencyMs,
              itemCount: 0,
              metadata: { modelName: model.name || 'unknown', id, error: true },
            });
          }

          throw error;
        }
      },

      async list(options?: ListOptions): Promise<TModel[]> {
        const startTime = Date.now();

        try {
          const result = await model.list(options);
          const latencyMs = Date.now() - startTime;
          const items = Array.isArray(result) ? result : result.data || [];

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'query',
              timestamp: startTime,
              latencyMs,
              itemCount: items.length,
              filter: options?.filter,
              metadata: { modelName: model.name || 'unknown', options },
            });
          }

          return items;
        } catch (error) {
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'query',
              timestamp: startTime,
              latencyMs,
              itemCount: 0,
              metadata: { modelName: model.name || 'unknown', options, error: true },
            });
          }

          throw error;
        }
      },

      async create(data: Partial<TModel>): Promise<TModel> {
        const startTime = Date.now();

        try {
          const result = await model.create(data);
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'put',
              timestamp: startTime,
              latencyMs,
              itemCount: 1,
              metadata: { modelName: model.name || 'unknown' },
            });
          }

          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'put',
              timestamp: startTime,
              latencyMs,
              itemCount: 0,
              metadata: { modelName: model.name || 'unknown', error: true },
            });
          }

          throw error;
        }
      },

      async update(id: string, data: Partial<TModel>): Promise<TModel> {
        const startTime = Date.now();

        try {
          const result = await model.update({ id, ...data });
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'update',
              timestamp: startTime,
              latencyMs,
              itemCount: 1,
              metadata: { modelName: model.name || 'unknown', id },
            });
          }

          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'update',
              timestamp: startTime,
              latencyMs,
              itemCount: 0,
              metadata: { modelName: model.name || 'unknown', id, error: true },
            });
          }

          throw error;
        }
      },

      async delete(id: string): Promise<void> {
        const startTime = Date.now();

        try {
          await model.delete({ id });
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'delete',
              timestamp: startTime,
              latencyMs,
              itemCount: 1,
              metadata: { modelName: model.name || 'unknown', id },
            });
          }
        } catch (error) {
          const latencyMs = Date.now() - startTime;

          if (monitor.enableAutoInstrumentation) {
            monitor.recordOperation({
              operation: 'delete',
              timestamp: startTime,
              latencyMs,
              itemCount: 0,
              metadata: { modelName: model.name || 'unknown', id, error: true },
            });
          }

          throw error;
        }
      },

      unwrap(): any {
        return model;
      },
    };
  }

  /**
   * Manually record an operation
   * Useful for custom operations not covered by the wrapper
   * 
   * @param operation - Operation record to track
   */
  recordOperation(operation: OperationRecord): void {
    this.statsCollector.record(operation);
  }

  /**
   * Get aggregated statistics
   * 
   * @returns Table statistics
   */
  getStats(): TableStats {
    return this.statsCollector.getStats();
  }

  /**
   * Get optimization recommendations
   * 
   * @returns Array of recommendations
   */
  getRecommendations(): Recommendation[] {
    return this.recommendationEngine.generateRecommendations();
  }

  /**
   * Reset all collected statistics
   */
  reset(): void {
    this.statsCollector.reset();
  }

  /**
   * Export raw operation data
   * 
   * @returns Array of operation records
   */
  export(): OperationRecord[] {
    return this.statsCollector.export();
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.statsCollector.isEnabled();
  }
}
