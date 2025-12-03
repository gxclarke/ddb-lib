/**
 * Error classes for DynamoDB wrapper
 */

/**
 * Base error class for all DynamoDB wrapper errors
 */
export class DynamoDBWrapperError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'DynamoDBWrapperError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DynamoDBWrapperError)
    }
  }
}

/**
 * Error thrown when schema validation fails
 */
export class ValidationError extends DynamoDBWrapperError {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public constraint: string
  ) {
    super(message, 'VALIDATION_ERROR', 'validate', { field, value, constraint })
    this.name = 'ValidationError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }
}

/**
 * Error thrown when a conditional check fails
 */
export class ConditionalCheckError extends DynamoDBWrapperError {
  constructor(
    message: string,
    public condition: string,
    public item?: any
  ) {
    super(message, 'CONDITIONAL_CHECK_FAILED', 'conditionalCheck', {
      condition,
      item,
    })
    this.name = 'ConditionalCheckError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConditionalCheckError)
    }
  }
}
