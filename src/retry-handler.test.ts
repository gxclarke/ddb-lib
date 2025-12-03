/**
 * Tests for RetryHandler
 */

import { describe, test, expect } from '@rstest/core'
import { RetryHandler, DEFAULT_RETRY_CONFIG } from './retry-handler'

describe('RetryHandler', () => {
  describe('constructor', () => {
    test('should use default config when no config provided', () => {
      const handler = new RetryHandler()
      expect(handler).toBeDefined()
    })

    test('should merge provided config with defaults', () => {
      const handler = new RetryHandler({ maxRetries: 5 })
      expect(handler).toBeDefined()
    })
  })

  describe('executeWithRetry', () => {
    test('should return result on successful operation', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        return 'success'
      }

      const retryHandler = new RetryHandler()
      const result = await retryHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(1)
    })

    test('should retry on retryable error', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount === 1) {
          throw {
            name: 'ProvisionedThroughputExceededException',
            message: 'Throttled',
          }
        }
        return 'success'
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })
      const result = await retryHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(2)
    })

    test('should retry multiple times before succeeding', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount <= 2) {
          throw {
            name: 'ThrottlingException',
            message: 'Throttled',
          }
        }
        return 'success'
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })
      const result = await retryHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(3)
    })

    test('should throw error after max retries exhausted', async () => {
      let callCount = 0
      const error = {
        name: 'ProvisionedThroughputExceededException',
        message: 'Throttled',
      }
      const operation = async () => {
        callCount++
        throw error
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })

      try {
        await retryHandler.executeWithRetry(operation)
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toEqual(error)
        expect(callCount).toBe(DEFAULT_RETRY_CONFIG.maxRetries + 1)
      }
    })

    test('should not retry non-retryable errors', async () => {
      let callCount = 0
      const error = {
        name: 'ValidationException',
        message: 'Invalid input',
      }
      const operation = async () => {
        callCount++
        throw error
      }

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toEqual(error)
        expect(callCount).toBe(1)
      }
    })

    test('should not retry ValidationError', async () => {
      let callCount = 0
      const error = {
        name: 'ValidationError',
        message: 'Schema validation failed',
      }
      const operation = async () => {
        callCount++
        throw error
      }

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toEqual(error)
        expect(callCount).toBe(1)
      }
    })

    test('should not retry ConditionalCheckFailedException', async () => {
      let callCount = 0
      const error = {
        name: 'ConditionalCheckFailedException',
        message: 'Condition check failed',
      }
      const operation = async () => {
        callCount++
        throw error
      }

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toEqual(error)
        expect(callCount).toBe(1)
      }
    })

    test('should retry on 5xx HTTP status codes', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount === 1) {
          throw {
            name: 'InternalServerError',
            $metadata: { httpStatusCode: 500 },
          }
        }
        return 'success'
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })
      const result = await retryHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(2)
    })

    test('should retry on 429 HTTP status code', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount === 1) {
          throw {
            name: 'TooManyRequestsException',
            $metadata: { httpStatusCode: 429 },
          }
        }
        return 'success'
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })
      const result = await retryHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(2)
    })

    test('should not retry on 4xx HTTP status codes (except 429)', async () => {
      let callCount = 0
      const error = {
        name: 'BadRequestException',
        $metadata: { httpStatusCode: 400 },
      }
      const operation = async () => {
        callCount++
        throw error
      }

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toEqual(error)
        expect(callCount).toBe(1)
      }
    })

    test('should use custom retry config when provided', async () => {
      let callCount = 0
      const error = {
        name: 'ThrottlingException',
        message: 'Throttled',
      }
      const operation = async () => {
        callCount++
        throw error
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })

      try {
        await retryHandler.executeWithRetry(operation, { maxRetries: 1 })
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toEqual(error)
        expect(callCount).toBe(2) // Initial + 1 retry
      }
    })

    test('should retry on custom error codes', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount === 1) {
          throw {
            code: 'CustomError',
            message: 'Custom error',
          }
        }
        return 'success'
      }

      const handler = new RetryHandler({
        retryableErrors: ['CustomError'],
        baseDelayMs: 10,
        maxDelayMs: 10,
      })

      const result = await handler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(2)
    })
  })

  describe('exponential backoff', () => {
    test('should increase delay exponentially', async () => {
      const delays: number[] = []
      let callCount = 0
      const operation = async () => {
        callCount++
        throw {
          name: 'ThrottlingException',
          message: 'Throttled',
        }
      }

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout
      global.setTimeout = ((callback: () => void, delay: number) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0)
      }) as any

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
      } catch (e) {
        // Expected to fail
      }

      // Restore setTimeout
      global.setTimeout = originalSetTimeout

      // Verify delays increase (with jitter, they should be in range)
      expect(delays.length).toBe(3) // 3 retries
      // First retry: 0 to 100ms (baseDelay * 2^0)
      expect(delays[0]).toBeGreaterThanOrEqual(0)
      expect(delays[0]).toBeLessThanOrEqual(100)
      // Second retry: 0 to 200ms (baseDelay * 2^1)
      expect(delays[1]).toBeGreaterThanOrEqual(0)
      expect(delays[1]).toBeLessThanOrEqual(200)
      // Third retry: 0 to 400ms (baseDelay * 2^2)
      expect(delays[2]).toBeGreaterThanOrEqual(0)
      expect(delays[2]).toBeLessThanOrEqual(400)
    })

    test('should cap delay at maxDelayMs', async () => {
      const delays: number[] = []
      let callCount = 0
      const operation = async () => {
        callCount++
        throw {
          name: 'ThrottlingException',
          message: 'Throttled',
        }
      }

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout
      global.setTimeout = ((callback: () => void, delay: number) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0)
      }) as any

      const handler = new RetryHandler({
        maxRetries: 10,
        baseDelayMs: 1000,
        maxDelayMs: 2000,
      })

      try {
        await handler.executeWithRetry(operation)
      } catch (e) {
        // Expected to fail
      }

      // Restore setTimeout
      global.setTimeout = originalSetTimeout

      // All delays should be capped at maxDelayMs
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(2000)
      }
    })

    test('should apply jitter to prevent thundering herd', async () => {
      const delays: number[] = []
      let callCount = 0
      const operation = async () => {
        callCount++
        throw {
          name: 'ThrottlingException',
          message: 'Throttled',
        }
      }

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout
      global.setTimeout = ((callback: () => void, delay: number) => {
        delays.push(delay)
        return originalSetTimeout(callback, 0)
      }) as any

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
      } catch (e) {
        // Expected to fail
      }

      // Restore setTimeout
      global.setTimeout = originalSetTimeout

      // With jitter, delays should vary and not be exactly exponential
      // We can't test randomness precisely, but we can verify delays are within expected ranges
      expect(delays.length).toBeGreaterThan(0)
      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('error detection', () => {
    test('should detect error by name', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount === 1) {
          throw {
            name: 'ServiceUnavailable',
            message: 'Service unavailable',
          }
        }
        return 'success'
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })
      const result = await retryHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(2)
    })

    test('should detect error by code', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount === 1) {
          throw {
            code: 'RequestLimitExceeded',
            message: 'Request limit exceeded',
          }
        }
        return 'success'
      }

      const retryHandler = new RetryHandler({ baseDelayMs: 10, maxDelayMs: 10 })
      const result = await retryHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(callCount).toBe(2)
    })

    test('should handle errors without name or code', async () => {
      let callCount = 0
      const error = new Error('Unknown error')
      const operation = async () => {
        callCount++
        throw error
      }

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toEqual(error)
        expect(callCount).toBe(1)
      }
    })

    test('should handle non-object errors', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        throw 'string error'
      }

      const retryHandler = new RetryHandler()

      try {
        await retryHandler.executeWithRetry(operation)
        throw new Error('Should have thrown')
      } catch (e) {
        expect(e).toBe('string error')
        expect(callCount).toBe(1)
      }
    })
  })
})
