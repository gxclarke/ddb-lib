/**
 * Core error classes for DynamoDB utilities
 */

/**
 * Base error class for all core utility errors
 */
export class DDBLibError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'DDBLibError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DDBLibError)
    }
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends DDBLibError {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public constraint: string
  ) {
    super(message, 'VALIDATION_ERROR', { field, value, constraint })
    this.name = 'ValidationError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }
}
