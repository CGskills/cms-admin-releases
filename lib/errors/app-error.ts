/**
 * Base class for all application errors.
 * Provides structured error information with codes and HTTP status codes.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Validation error - thrown when user input fails validation.
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error - thrown when user is not authenticated.
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - thrown when user lacks required permissions.
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * CSRF error - thrown when request origin is invalid.
 */
export class CSRFError extends AppError {
  constructor(message = 'Invalid request origin') {
    super(message, 'CSRF_ERROR', 403);
    this.name = 'CSRFError';
  }
}

/**
 * Not found error - thrown when requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit error - thrown when user exceeds rate limits.
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}
