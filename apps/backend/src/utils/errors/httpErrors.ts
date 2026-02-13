import { AppError } from "./AppError.js";

/**
 * Convenience helpers for creating HTTP-specific operational errors.
 * Keeps controllers clean and consistent.
 */

export const BadRequest = (msg: string) => new AppError(msg, 400);
export const Unauthorized = (msg = "Unauthorized") => new AppError(msg, 401);
export const Forbidden = (msg = "Forbidden") => new AppError(msg, 403);
export const NotFound = (msg = "Not found") => new AppError(msg, 404);
 