import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser, refreshTokenFunction } from "../../auth/auth.controller.js";
import { BadRequest, Unauthorized } from "../../../utils/errors/httpErrors.js";
import { UserModel } from "../models/user.model.js";
import { authCookieOptions } from "../../../config/cookies.js";

const isProd = process.env.NODE_ENV === "production";

/**
 * Shape of request body expected for user registration.
 * All fields are optional at type-level and validated at runtime.
 */
interface RegisterBody {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
}

/**
 * Shape of request body expected for user login.
 */
interface LoginBody {
  email?: string;
  password?: string;
}

/**
 * @desc Register a new user
 * @route POST /api/user/register
 * @access Public
 *
 * Responsibilities:
 * - Validate incoming request body
 * - Delegate business logic to auth service
 * - Set refresh token cookie
 * - Return access token + safe user payload
 *
 * Error handling:
 * - Validation errors -> 400
 * - Service errors are forwarded to global error handler
 */
export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { displayName, username, email, password } = req.body;

    // Runtime validation (do not trust client input)
    if (!displayName || !username || !email || !password) {
      throw BadRequest("Invalid request body");
    }

    const { accessToken, refreshToken, safeUser } =
      await registerUser(displayName, username, email, password);

    // Store refresh and access token securely in httpOnly cookie
    res.cookie("accessToken", accessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ user: safeUser });

  } catch (err) {
    next(err); // Delegate to centralized error handler
  }
};

/**
 * @desc Authenticate user credentials
 * @route POST /api/user/login
 * @access Public
 *
 * Responsibilities:
 * - Validate request body
 * - Verify credentials via auth service
 * - Set refresh token cookie
 * - Return access token + safe user payload
 *
 * Security notes:
 * - Error messages are generic to avoid credential enumeration
 */
export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw BadRequest("Email and password required");
    }

    const { accessToken, refreshToken, safeUser } =
      await loginUser(email, password);

    // Store refresh and access token securely in httpOnly cookie
    res.cookie("accessToken", accessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ user: safeUser });

  } catch (err) {
    next(err);
  }
};

/**
 * @desc Log out user by clearing refresh token cookie
 * @route POST /api/user/logout
 * @access Authenticated User
 *
 * Notes:
 * - Stateless logout (JWT-based)
 * - Client access token becomes invalid naturally on expiry
 */
export const logout = (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", authCookieOptions);
  res.clearCookie("accessToken", authCookieOptions);
  res.status(200).json({ message: "Logged out successfully" });
};

/**
 * @desc Fetch the currently authenticated user's profile
 * @route GET /api/user/me
 * @access Private (Requires valid access token)
 *
 * Responsibilities:
 * - Read authenticated user info from `req.user`
 * - Fetch user record from database
 * - Return safe user object (password excluded)
 *
 * Notes:
 * - Relies on `protect` middleware to populate `req.user`
 * - Does NOT refresh tokens
 * - Does NOT expose sensitive fields
 */
export const currentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    // Defensive check in case auth middleware is misconfigured
    if (!userId) {
      throw Unauthorized();
    }

    const user = await UserModel.findById(userId).select("-password");

    if (!user) {
      throw Unauthorized("User no longer exists");
    }

    res.status(200).json({
      message: "Current user fetched successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
};
