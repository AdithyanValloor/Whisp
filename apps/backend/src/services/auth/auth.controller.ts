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

/**
 * ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------
 */

/**
 * Number of salt rounds used for hashing passwords.
 * Higher values increase security but also CPU cost.
 */
const HASH_SALT = 10;

/**
 * ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------
 */

/**
 * Builds a minimal JWT payload from a user entity.
 *
 * Why minimal?
 * - Keeps tokens small
 * - Reduces risk if token is leaked
 * - Avoids coupling JWTs to database schema changes
 */
const buildJwtPayload = (user: { _id: any; email: string }) => ({
  id: user._id.toString(),
  email: user.email,
});

/**
 * ------------------------------------------------------------------
 * Register User
 * ------------------------------------------------------------------
 * @desc    Creates a new user account
 * @throws  400 BadRequest  - Missing fields / duplicate email / username
 *
 * Flow:
 * 1. Validate required fields
 * 2. Enforce unique email & username
 * 3. Hash password securely
 * 4. Persist user in database
 * 5. Generate access & refresh tokens
 * 6. Return safe user object (password removed)
 */
export const registerUser = async (
  displayName: string,
  username: string,
  email: string,
  password: string
) => {
  // Validate required inputs early (fail fast)
  if (!displayName || !username || !email || !password) {
    throw BadRequest("Missing required fields");
  }

  // Enforce unique email
  if (await UserModel.findOne({ email })) {
    throw BadRequest("Email already exists");
  }

  // Enforce unique username
  if (await UserModel.findOne({ username })) {
    throw BadRequest("Username already exists");
  }

  // Hash password before storing
  const hashedPassword = await bcrypt.hash(password, HASH_SALT);

  // Persist new user
  const user = await UserModel.create({
    username,
    displayName,
    email,
    password: hashedPassword,
  });

  // Return tokens + sanitized user object
  return {
    accessToken: generateAccessToken(buildJwtPayload(user)),
    refreshToken: generateRefreshToken(buildJwtPayload(user)),
    safeUser: user.toObject({
      versionKey: false,
      transform: (_, ret) => {
        delete ret.password; // Ensure password never leaves backend
        return ret;
      },
    }),
  };
};

/**
 * ------------------------------------------------------------------
 * Login User
 * ------------------------------------------------------------------
 * @desc    Authenticates user credentials
 * @throws  400 BadRequest  - Missing credentials
 * @throws  401 Unauthorized - Invalid email or password
 *
 * Notes:
 * - Uses identical error message for email & password mismatch
 *   to prevent account enumeration attacks
 */
export const loginUser = async (email: string, password: string) => {
  // Validate request
  if (!email || !password) {
    throw BadRequest("Email and password required");
  }

  // Fetch user by email
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw Unauthorized("Invalid email or password");
  }

  // Compare hashed password
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw Unauthorized("Invalid email or password");
  }

  // Successful authentication
  return {
    accessToken: generateAccessToken(buildJwtPayload(user)),
    refreshToken: generateRefreshToken(buildJwtPayload(user)),
    safeUser: user.toObject({
      versionKey: false,
      transform: (_, ret) => {
        delete ret.password;
        return ret;
      },
    }),
  };
};

/**
 * ------------------------------------------------------------------
 * Refresh Access Token
 * ------------------------------------------------------------------
 * @desc    Issues a new access token using a valid refresh token
 * @throws  401 Unauthorized - Missing or invalid refresh token
 * @throws  404 NotFound     - User no longer exists
 *
 * Notes:
 * - Refresh tokens are long-lived and stored securely (httpOnly cookie)
 * - Access tokens are short-lived and returned to the client
 */
export const refreshTokenFunction = async (token: string) => {
  if (!token) {
    throw Unauthorized("Refresh token missing");
  }

  // Validate refresh token signature & expiry
  const decoded = verifyRefreshToken(token);
  if (!decoded?.id) {
    throw Unauthorized("Invalid refresh token");
  }

  // Ensure user still exists
  const user = await UserModel.findById(decoded.id).select("-password");
  if (!user) {
    throw NotFound("User not found");
  }

  // Issue fresh access token
  return {
    accessToken: generateAccessToken(buildJwtPayload(user)),
    user,
  };
};
