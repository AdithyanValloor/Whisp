import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors/AppError.js";

/**
 * Global error handler.
 *
 * Converts thrown errors into consistent HTTP responses.
 * Must be registered after all routes.
 */

export const errorHandler: ErrorRequestHandler = (
  err,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Operational (expected) errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  // Unknown / programming errors
  console.error("🔥 UNHANDLED ERROR:", err);

  res.status(500).json({
    message: "Internal server error",
  });
};
