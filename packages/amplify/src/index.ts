/**
 * @ddb-lib/amplify - AWS Amplify Gen 2 integration for DynamoDB monitoring
 * 
 * This package provides monitoring and best practices for AWS Amplify Gen 2 data client.
 * It wraps Amplify models to collect statistics and generate recommendations without
 * interfering with Amplify's functionality.
 */

export { AmplifyMonitor } from './amplify-monitor';
export { AmplifyHelpers } from './amplify-helpers';

export type {
  AmplifyMonitorConfig,
  MonitoredModel,
  ListOptions,
  ListResult,
} from './types';

// Re-export commonly used types from stats package for convenience
export type {
  StatsConfig,
  OperationRecord,
  TableStats,
  Recommendation,
} from '@ddb-lib/stats';
