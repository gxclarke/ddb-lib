/**
 * Retry handler with exponential backoff for DynamoDB operations
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Base delay in milliseconds before first retry */
  baseDelayMs: number
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number
  /** List of error codes that should trigger a retry */
  retryableErrors: string[]
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  retryableErrors: [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'RequestLimitExceeded',
    'InternalServerError',
    'ServiceUnavailable',
    'NetworkingError',
    'TimeoutError',
  ],
}

/**
 * Handler for retrying operations with exponential backoff and jitter
 */
export class RetryHandler {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * Execute an operation with retry logic
   * @param operation Function to execute
   * @param config Optional override for retry configuration
   * @returns Result of the operation
   * @throws Error if all retries are exhausted or error is not retryable
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const effectiveConfig = config ? { ...this.config, ...config } : this.config
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= effectiveConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Check if error is retryable
        if (!this.isRetryableError(error, effectiveConfig.retryableErrors)) {
          throw error
        }

        // If we've exhausted all retries, throw the error
        if (attempt === effectiveConfig.maxRetries) {
          throw error
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(
          attempt,
          effectiveConfig.baseDelayMs,
          effectiveConfig.maxDelayMs
        )

        // Wait before retrying
        await this.sleep(delay)
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Retry failed with unknown error')
  }

  /**
   * Check if an error should trigger a retry
   */
  private isRetryableError(error: unknown, retryableErrors: string[]): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const err = error as any

    // Check error name
    if (err.name && retryableErrors.includes(err.name)) {
      return true
    }

    // Check error code
    if (err.code && retryableErrors.includes(err.code)) {
      return true
    }

    // Check for AWS SDK error structure
    if (err.$metadata?.httpStatusCode) {
      const statusCode = err.$metadata.httpStatusCode
      // Retry on 5xx server errors and 429 throttling
      if (statusCode >= 500 || statusCode === 429) {
        return true
      }
    }

    return false
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * Uses full jitter strategy to prevent thundering herd
   */
  private calculateDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number
  ): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt)

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

    // Add full jitter: random value between 0 and cappedDelay
    // This prevents multiple clients from retrying at the same time
    const jitteredDelay = Math.random() * cappedDelay

    return Math.floor(jitteredDelay)
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
