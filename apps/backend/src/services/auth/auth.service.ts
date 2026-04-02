//auth.service.ts

import { UserModel } from "../user/models/user.model.js";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import {
  BadRequest,
  Unauthorized,
  NotFound,
} from "../../utils/errors/httpErrors.js";
import crypto from "crypto";
import {
  saveOtp,
  verifyOtp,
  markVerified,
  isVerified,
  clearEmail,
} from "../../utils/otp/otpStore.js";
import { sendOtpEmail } from "../../utils/otp/mailer.js";

// ── Constants ────────────────────────────────────────────────────────────────

const HASH_SALT = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

const generateOtp = () => crypto.randomInt(100_000, 999_999).toString();

const buildJwtPayload = (user: { _id: any; email: string }) => ({
  id: user._id.toString(),
  email: user.email,
});

const buildSafeUser = (user: any) =>
  user.toObject({
    versionKey: false,
    transform: (_: any, ret: any) => {
      delete ret.password;
      return ret;
    },
  });

// ── OTP ──────────────────────────────────────────────────────────────────────

/**
 * @desc  Generate and email an OTP for the given address.
 *        Rejects immediately if the email is already registered.
 */
export const sendRegistrationOtp = async (email: string): Promise<void> => {
  if (!email) throw BadRequest("Email is required");

  if (await UserModel.findOne({ email })) {
    throw BadRequest("Email already registered");
  }

  const otp = generateOtp();
  saveOtp(email, otp);
  await sendOtpEmail(email, otp);
};

/**
 * @desc  Validate the OTP and mark the email as verified.
 *        The verified state expires after the store TTL (10 min).
 */
export const verifyRegistrationOtp = async (
  email: string,
  otp: string
): Promise<void> => {
  if (!email || !otp) throw BadRequest("Email and OTP are required");

  const valid = verifyOtp(email, otp);
  if (!valid) throw BadRequest("Invalid or expired OTP");

  markVerified(email);
};

// ── Register ─────────────────────────────────────────────────────────────────

/**
 * @desc  Create a new user account.
 *        The email must have been verified via OTP before calling this.
 */
export const registerUser = async (
  displayName: string,
  username: string,
  email: string,
  password: string
) => {
  if (!isVerified(email)) throw BadRequest("Email not verified");

  if (!displayName || !username || !email || !password) {
    throw BadRequest("Missing required fields");
  }

  if (await UserModel.findOne({ email })) throw BadRequest("Email already exists");
  if (await UserModel.findOne({ username })) throw BadRequest("Username already exists");

  const hashedPassword = await bcrypt.hash(password, HASH_SALT);

  const user = await UserModel.create({
    username,
    displayName,
    email,
    password: hashedPassword,
  });

  clearEmail(email);

  return {
    accessToken: generateAccessToken(buildJwtPayload(user)),
    refreshToken: generateRefreshToken(buildJwtPayload(user)),
    safeUser: buildSafeUser(user),
  };
};

// ── Login ────────────────────────────────────────────────────────────────────

/**
 * @desc  Authenticate a user with email + password.
 *        Uses identical error messages to prevent account enumeration.
 */
export const loginUser = async (email: string, password: string) => {
  if (!email || !password) throw BadRequest("Email and password required");

  const user = await UserModel.findOne({ email });
  if (!user) throw Unauthorized("Invalid email or password");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw Unauthorized("Invalid email or password");

  return {
    accessToken: generateAccessToken(buildJwtPayload(user)),
    refreshToken: generateRefreshToken(buildJwtPayload(user)),
    safeUser: buildSafeUser(user),
  };
};

// ── Refresh Token ────────────────────────────────────────────────────────────

/**
 * @desc  Issue a new access token from a valid refresh token.
 */
export const refreshTokenFunction = async (token: string) => {
  if (!token) throw Unauthorized("Refresh token missing");

  const decoded = verifyRefreshToken(token);
  if (!decoded?.id) throw Unauthorized("Invalid refresh token");

  const user = await UserModel.findById(decoded.id).select("-password");
  if (!user) throw NotFound("User not found");

  return {
    accessToken: generateAccessToken(buildJwtPayload(user)),
    user,
  };
};