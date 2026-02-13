import jwt from "jsonwebtoken";
import type { DecodedUser } from "../services/user/types/user.types.js";
import { Unauthorized } from "./errors/httpErrors.js";

/**
 * JWT utilities.
 *
 * Issues and verifies access/refresh tokens.
 * Fails fast if secrets are not configured to avoid insecure startup.
 */

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets are not defined");
}

// Short-lived access token (used for authenticated requests)
export const generateAccessToken = (payload: DecodedUser): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });

// Long-lived refresh token (used to issue new access tokens)
export const generateRefreshToken = (payload: DecodedUser): string =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });

export const verifyAccessToken = (token: string): DecodedUser => {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded === "string") {
    throw Unauthorized("Invalid access token payload");
  }

  return decoded as DecodedUser;
};

export const verifyRefreshToken = (token: string): DecodedUser => {
  const decoded = jwt.verify(token, REFRESH_SECRET);

  if (typeof decoded === "string") {
    throw Unauthorized("Invalid refresh token payload");
  }

  return decoded as DecodedUser;
};
