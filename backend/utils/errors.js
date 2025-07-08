/**
 * Error Utilities
 * Provides structured error objects for the global error handler
 */

/**
 * Base App Error class for structured error handling
 */
export class AppError extends Error {
  constructor(message, statusCode, logMessage) {
    super(message);
    this.status = statusCode;
    this.log = logMessage || `${statusCode} error: ${message}`;
    this.message = { err: message };
  }
}

/**
 * Authentication error helper
 */
export const createAuthError = (message = 'Authentication required', context = '') => ({
  log: `Auth failure${context ? ` - ${context}` : ''}: ${message}`,
  status: 401,
  message: { err: message }
});

/**
 * Validation error helper
 */
export const createValidationError = (message = 'Invalid input', details = '') => ({
  log: `Validation error${details ? ` - ${details}` : ''}: ${message}`,
  status: 400,
  message: { err: message }
});

/**
 * GitHub API error helper
 */
export const createGitHubError = (originalError, context = '') => ({
  log: `GitHub API error${context ? ` - ${context}` : ''}: ${originalError.message}`,
  status: originalError.status || 502,
  message: { err: 'External service error' }
});

/**
 * Generic server error helper
 */
export const createServerError = (message = 'Internal server error', context = '') => ({
  log: `Server error${context ? ` - ${context}` : ''}: ${message}`,
  status: 500,
  message: { err: message }
});

/**
 * Database error helper
 */
export const createDatabaseError = (originalError, operation = '') => ({
  log: `Database error${operation ? ` during ${operation}` : ''}: ${originalError.message}`,
  status: 500,
  message: { err: 'Database operation failed' }
}); 