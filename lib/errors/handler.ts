import { AppError } from './app-error';

/**
 * Centralized error handler for Server Actions.
 * Logs unexpected errors and converts them to user-safe error messages.
 *
 * @param error - The caught error
 * @throws {AppError} - Always throws, either the original AppError or a generic one
 */
export function handleActionError(error: unknown): never {
  // If it's already an AppError, re-throw it
  if (error instanceof AppError) {
    throw error;
  }

  // Log unexpected errors for debugging
  console.error('[ACTION ERROR]', error);

  // Convert known error types
  if (error instanceof Error) {
    // Check for specific error messages that we know about
    if (error.message.includes('Authentication required')) {
      throw new AppError('Authentication required', 'AUTH_ERROR', 401);
    }
    if (error.message.includes('Administrator access required')) {
      throw new AppError('Administrator access required', 'FORBIDDEN', 403);
    }
    if (error.message.includes('Invalid request origin')) {
      throw new AppError('Invalid request origin', 'CSRF_ERROR', 403);
    }
  }

  // Don't expose internal error details to the user
  throw new AppError(
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    500
  );
}

/**
 * Safe error handler that logs but doesn't throw.
 * Use for cleanup operations where errors should not interrupt the main flow.
 *
 * @param error - The caught error
 * @param context - Context description for logging
 */
export function logError(error: unknown, context: string): void {
  console.error(`[${context}]`, error);
}
