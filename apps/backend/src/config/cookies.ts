import type { CookieOptions } from "express";

/**
 * Default options for authentication cookies.
 *
 * Ensures httpOnly access and environment-aware security settings.
 */

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/", // important: makes clearing consistent
};
