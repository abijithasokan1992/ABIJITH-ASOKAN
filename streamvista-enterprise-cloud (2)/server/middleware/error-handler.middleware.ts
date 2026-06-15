import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // Log error with context
  const errorLog = {
    timestamp: new Date().toISOString(),
    statusCode,
    code,
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    details: err.details || {}
  };

  if (statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(errorLog, null, 2));
  } else {
    console.warn('[WARN]', JSON.stringify(errorLog, null, 2));
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      code,
      message: err.message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err.details })
    }
  });
};

/**
 * Async error wrapper for express route handlers
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create API error
 */
export const createApiError = (
  message: string,
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details?: Record<string, any>
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Validation error handler
 */
export const handleValidationError = (errors: Record<string, any>): ApiError => {
  return createApiError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    errors
  );
};

/**
 * Authentication error handler
 */
export const handleAuthError = (message = 'Authentication failed'): ApiError => {
  return createApiError(message, 401, 'AUTH_ERROR');
};

/**
 * Authorization error handler
 */
export const handleAuthorizationError = (message = 'Access denied'): ApiError => {
  return createApiError(message, 403, 'AUTHORIZATION_ERROR');
};

/**
 * Not found error handler
 */
export const handleNotFoundError = (resource: string): ApiError => {
  return createApiError(
    `${resource} not found`,
    404,
    'NOT_FOUND'
  );
};

/**
 * Conflict error handler
 */
export const handleConflictError = (message: string): ApiError => {
  return createApiError(
    message,
    409,
    'CONFLICT'
  );
};

/**
 * Rate limit error handler
 */
export const handleRateLimitError = (): ApiError => {
  return createApiError(
    'Rate limit exceeded',
    429,
    'RATE_LIMIT_EXCEEDED'
  );
};

/**
 * Service unavailable error handler
 */
export const handleServiceUnavailableError = (message = 'Service unavailable'): ApiError => {
  return createApiError(
    message,
    503,
    'SERVICE_UNAVAILABLE'
  );
};

/**
 * Database error handler
 */
export const handleDatabaseError = (err: any): ApiError => {
  console.error('[DATABASE_ERROR]', err);
  
  // Don't expose database details to client
  return createApiError(
    'Database operation failed',
    500,
    'DATABASE_ERROR',
    process.env.NODE_ENV === 'development' ? { originalError: err.message } : {}
  );
};

/**
 * Encryption/Decryption error handler
 */
export const handleEncryptionError = (operation: string): ApiError => {
  return createApiError(
    `Encryption operation failed: ${operation}`,
    500,
    'ENCRYPTION_ERROR'
  );
};

/**
 * Quota exceeded error handler
 */
export const handleQuotaExceededError = (current: number, limit: number): ApiError => {
  return createApiError(
    `Storage quota exceeded (${current.toFixed(2)}GB / ${limit.toFixed(2)}GB)`,
    429,
    'QUOTA_EXCEEDED',
    { current: parseFloat(current.toFixed(2)), limit: parseFloat(limit.toFixed(2)) }
  );
};

/**
 * Invalid request error handler
 */
export const handleInvalidRequestError = (message: string, details?: Record<string, any>): ApiError => {
  return createApiError(
    message,
    400,
    'INVALID_REQUEST',
    details
  );
};

/**
 * File upload error handler
 */
export const handleFileUploadError = (message: string): ApiError => {
  return createApiError(
    `File upload failed: ${message}`,
    400,
    'FILE_UPLOAD_ERROR'
  );
};

/**
 * Timeout error handler
 */
export const handleTimeoutError = (): ApiError => {
  return createApiError(
    'Request timed out',
    504,
    'TIMEOUT'
  );
};
