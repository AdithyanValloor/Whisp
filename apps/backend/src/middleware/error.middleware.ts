import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors/AppError.js";

/**
 * ------------------------------------------------------------------
 * Global Error Handling Middleware
 * ------------------------------------------------------------------
 *
 * This middleware is responsible for handling **all errors**
 * that occur in the application and converting them into
 * consistent HTTP responses.
 *
 * Key responsibilities:
 * - Handle known, operational errors (`AppError`)
 * - Prevent sensitive internal details from leaking to clients
 * - Act as the **single exit point** for error responses
 *
 * IMPORTANT:
 * - This middleware MUST be registered **after all routes**
 * - Any error thrown using `throw` or passed via `next(err)`
 *   will eventually arrive here
 */
export const errorHandler: ErrorRequestHandler = (
  err,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  /**
   * --------------------------------------------------------------
   * Handle Operational (Expected) Errors
   * --------------------------------------------------------------
   *
   * `AppError` represents controlled, expected failures such as:
   * - Validation errors (400)
   * - Authentication errors (401)
   * - Authorization errors (403)
   * - Resource not found errors (404)
   *
   * These errors are safe to expose to clients.
   */
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  /**
   * --------------------------------------------------------------
   * Handle Programming / Unknown Errors
   * --------------------------------------------------------------
   *
   * This includes:
   * - Unhandled exceptions
   * - Programming bugs
   * - Library/runtime errors
   *
   * These should NEVER expose internal details to clients.
   * They are logged for observability and debugging.
   */
  console.error("🔥 UNHANDLED ERROR:", err);

  res.status(500).json({
    message: "Internal server error",
  });
};
