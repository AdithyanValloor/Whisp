// user/controllers/user.controller.ts

import { Request, Response, NextFunction } from "express";
import { BadRequest, Unauthorized } from "../../../utils/errors/httpErrors.js";
import { UserModel } from "../models/user.model.js";
import { authCookieOptions } from "../../../config/cookies.js";
import { checkPassword } from "../services/user.service.js";
import {
  loginUser,
  registerUser,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  refreshTokenFunction,
} from "../../auth/auth.service.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegisterBody {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

// ── OTP ───────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/user/send-otp
 * @access Public
 */
export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    await sendRegistrationOtp(email);
    res.status(200).json({ message: "OTP sent to " + email });
  } catch (err) {
    next(err);
  }
};

/**
 * @route  POST /api/user/verify-otp
 * @access Public
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;
    await verifyRegistrationOtp(email, otp);
    res.status(200).json({ message: "Email verified" });
  } catch (err) {
    next(err);
  }
};

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/user/register
 * @access Public
 */
export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { displayName, username, email, password } = req.body;

    if (!displayName || !username || !email || !password) {
      throw BadRequest("Invalid request body");
    }

    const { accessToken, refreshToken, safeUser } = await registerUser(
      displayName,
      username,
      email,
      password
    );

    res.cookie("accessToken", accessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ user: safeUser });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/user/login
 * @access Public
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

    const { accessToken, refreshToken, safeUser } = await loginUser(
      email,
      password
    );

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

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/user/logout
 * @access Public
 */
export const logout = (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", authCookieOptions);
  res.clearCookie("accessToken", authCookieOptions);
  res.status(200).json({ message: "Logged out successfully" });
};

// ── Refresh Token ─────────────────────────────────────────────────────────────

/**
 * @route  POST /api/user/refresh
 * @access Public (cookie-authenticated)
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.refreshToken;
    const { accessToken, user } = await refreshTokenFunction(token);

    res.cookie("accessToken", accessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// ── Current User ──────────────────────────────────────────────────────────────

/**
 * @route  GET /api/user/me
 * @access Protected
 */
export const currentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();

    const user = await UserModel.findById(userId).select("-password");
    if (!user) throw Unauthorized("User no longer exists");

    res.status(200).json({ message: "Current user fetched successfully", user });
  } catch (err) {
    next(err);
  }
};

// ── Check Password ────────────────────────────────────────────────────────────

/**
 * @route  POST /api/user/account/check-password
 * @access Protected
 */
export const checkPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    const { isMatch } = await checkPassword(userId, password);

    res.status(200).json({ success: true, isMatch });
  } catch (err) {
    next(err);
  }
};
