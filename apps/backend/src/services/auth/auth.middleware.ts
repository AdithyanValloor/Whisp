import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
} from "../../utils/jwt.js";

import { Unauthorized, Forbidden } from "../../utils/errors/httpErrors.js";
import { authCookieOptions } from "../../config/cookies.js";

const { JsonWebTokenError, TokenExpiredError } = jwt;

/**
 * ------------------------------------------------------------------
 * Authentication Guard Middleware
 * ------------------------------------------------------------------
 *
 * Protects private routes by validating JWT-based authentication.
 * Automatically refreshes expired access tokens when a valid
 * refresh token is present.
 *
 * High-level flow:
 * 1. Read access & refresh tokens from HTTP-only cookies
 * 2. If access token is valid → allow request
 * 3. If access token is missing or expired → attempt refresh
 * 4. If refresh succeeds → issue new access token and continue
 * 5. Otherwise → reject request as unauthenticated
 *
 * Security guarantees:
 * - No request proceeds without a verified token
 * - Refresh tokens are the single authority for session recovery
 * - Tokens are never trusted blindly
 */
export const protect = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Extract credentials from cookies
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    /**
     * No credentials at all → unauthenticated request
     */
    if (!accessToken && !refreshToken) {
      throw Unauthorized("Unauthenticated");
    }

    /**
     * Attempt access-token authentication first
     * (fast path for valid sessions)
     */
    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        req.user = decoded;
        return next();
      } catch (err) {
        // Any failure other than expiry is a hard auth failure
        if (!(err instanceof TokenExpiredError)) {
          throw Unauthorized("Invalid access token");
        }
        // Access token expired → fall through to refresh logic
      }
    }

    /**
     * Access token missing or expired → require refresh token
     */
    if (!refreshToken) {
      throw Unauthorized("Session expired");
    }

    /**
     * Refresh flow:
     * - Verify refresh token
     * - Issue new access token
     * - Persist it in secure HTTP-only cookie
     */
    const decodedRefresh = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken({
      id: decodedRefresh.id,
      email: decodedRefresh.email,
      username: decodedRefresh.username,
    });

    res.cookie("accessToken", newAccessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    /**
     * Attach refreshed user payload and continue
     */
    req.user = decodedRefresh;
    next();
  } catch (err) {
    /**
     * Forward all authentication failures
     * to the global error handler
     */
    next(err);
  }
};
