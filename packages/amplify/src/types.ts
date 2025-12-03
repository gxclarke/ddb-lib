/**
 * Type definitions for Amplify integration
 */

import type { StatsConfig } from '@ddb-lib/stats';

/**
 * Configuration for AmplifyMonitor
 */
export interface AmplifyMonitorConfig {
  /** Statistics collection configuration */
  statsConfig?: StatsConfig;
  /** Enable automatic instrumentation of operations (default: true) */
  enableAutoInstrumentation?: boolean;
}

/**
 * Monitored wrapper for Amplify models
 * Provides the same interface as Amplify models but with monitoring
 */
export interface MonitoredModel<TModel> {
  /** Get a single item by ID */
  get(id: string): Promise<TModel | null>;

  /** List items with optional filtering */
  list(options?: ListOptions): Promise<TModel[]>;

  /** Create a new item */
  create(data: Partial<TModel>): Promise<TModel>;

  /** Update an existing item */
  update(id: string, data: Partial<TModel>): Promise<TModel>;

  /** Delete an item by ID */
  delete(id: string): Promise<void>;

  /** Access the underlying unwrapped model */
  unwrap(): any;
}

/**
 * Options for list operations
 */
export interface ListOptions {
  /** Filter criteria */
  filter?: Record<string, any>;
  /** Limit number of results */
  limit?: number;
  /** Pagination token */
  nextToken?: string;
}

/**
 * Result from a list operation
 */
export interface ListResult<TModel> {
  /** Items returned */
  items: TModel[];
  /** Token for next page */
  nextToken?: string;
}
