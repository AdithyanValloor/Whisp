/**
 * Base application error.
 *
 * Distinguishes operational (expected) errors from programming errors
 * and carries an HTTP status code for centralized error handling.
 */

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
