//user.account.service.ts

import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model.js";
import {
  Unauthorized,
  NotFound,
  BadRequest,
  Conflict,
} from "../../../utils/errors/httpErrors.js";
import crypto from "crypto";
import {
  saveOtp,
  verifyOtp,
  markVerified,
  isVerified,
  clearEmail,
} from "../../../utils/otp/otpStore.js";
import { sendOtpEmail } from "../../../utils/otp/mailer.js";

const generateOtp = () => crypto.randomInt(100_000, 999_999).toString();

/**
 * Step 1 — generate and send OTP to the NEW email address
 */
export const sendEmailChangeOtp = async (
  userId: string,
  newEmail: string
): Promise<void> => {
  const normalized = newEmail.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) throw BadRequest("Invalid email address");

  // Must not be taken by someone else
  const taken = await UserModel.findOne({ email: normalized, _id: { $ne: userId } });
  if (taken) throw Conflict("Email is already registered to another account");

  // Must differ from current email
  const currentUser = await UserModel.findById(userId).select("email");
  if (!currentUser) throw NotFound("User not found");
  if (currentUser.email === normalized) throw BadRequest("New email must differ from your current email");

  const otp = generateOtp();
  saveOtp(normalized, otp);
  await sendOtpEmail(normalized, otp);
};

/**
 * Step 2 — verify OTP, then update email in DB
 * Reuses the existing updateEmail() after verification passes
 */
export const verifyAndUpdateEmail = async (
  userId: string,
  newEmail: string,
  otp: string
): Promise<ReturnType<typeof updateEmail>> => {
  const normalized = newEmail.trim().toLowerCase();

  if (!otp) throw BadRequest("OTP is required");

  const valid = verifyOtp(normalized, otp);
  if (!valid) throw BadRequest("Invalid or expired OTP");

  // OTP passed — persist the new email
  const updatedUser = await updateEmail(userId, normalized);

  clearEmail(normalized);

  return updatedUser;
};


const SALT_ROUNDS = 12;
const DELETION_GRACE_PERIOD_DAYS = 15;

/**
 * ------------------------------------------------------------------
 * Update Username
 * ------------------------------------------------------------------
 * @desc    Changes a user's @username after checking uniqueness
 *
 * @param   userId      - Authenticated user's ID
 * @param   newUsername - Desired new username (pre-sanitized on client)
 *
 * @throws  BadRequest  - If username is too short or contains invalid chars
 * @throws  Conflict    - If username is already taken
 * @throws  NotFound    - If user does not exist
 *
 * @returns Updated user (password excluded)
 */
export const updateUsername = async (userId: string, newUsername: string) => {
  // Re-validate server-side — never trust client sanitization alone
  if (!newUsername || newUsername.length < 3) {
    throw BadRequest("Username must be at least 3 characters");
  }

  if (!/^[a-z0-9_]+$/.test(newUsername)) {
    throw BadRequest(
      "Username may only contain lowercase letters, numbers, and underscores"
    );
  }

  const taken = await UserModel.findOne({
    username: newUsername,
    _id: { $ne: userId },
  });

  if (taken) {
    throw Conflict("Username is already taken");
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { username: newUsername },
    { new: true }
  ).select("-password");

  if (!user) throw NotFound("User not found");

  return user;
};

/**
 * ------------------------------------------------------------------
 * Update Email
 * ------------------------------------------------------------------
 * @desc    Updates the user's email address after uniqueness check.
 *          A verification flow should be triggered after this (e.g. send
 *          a confirmation email) — that concern is left to the caller/controller.
 *
 * @param   userId   - Authenticated user's ID
 * @param   newEmail - New email address
 *
 * @throws  BadRequest - If email format is invalid
 * @throws  Conflict   - If email is already registered
 * @throws  NotFound   - If user does not exist
 *
 * @returns Updated user (password excluded)
 */
export const updateEmail = async (userId: string, newEmail: string) => {
  const normalized = newEmail.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw BadRequest("Invalid email address");
  }

  const taken = await UserModel.findOne({
    email: normalized,
    _id: { $ne: userId },
  });

  if (taken) {
    throw Conflict("Email is already registered to another account");
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      email: normalized,
      emailVerified: false, // invalidate on change — re-verify required
    },
    { new: true }
  ).select("-password");

  if (!user) throw NotFound("User not found");

  return user;
};

/**
 * ------------------------------------------------------------------
 * Change Password
 * ------------------------------------------------------------------
 * @desc    Verifies the current password then replaces it with a new hash.
 *          Never returns or logs plaintext passwords.
 *
 * @param   userId          - Authenticated user's ID
 * @param   currentPassword - Must match the stored hash
 * @param   newPassword     - Plaintext new password (will be hashed)
 *
 * @throws  BadRequest   - If new password is too short
 * @throws  Unauthorized - If current password is wrong
 * @throws  NotFound     - If user does not exist
 *
 * @returns void — no user data returned intentionally (no accidental leaks)
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  if (!newPassword || newPassword.length < 8) {
    throw BadRequest("New password must be at least 8 characters");
  }

  // Must fetch with password for bcrypt comparison
  const user = await UserModel.findById(userId).select("+password");

  if (!user) throw NotFound("User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw Unauthorized("Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  // Intentionally return nothing — avoids any accidental password field exposure
};

/**
 * ------------------------------------------------------------------
 * Deactivate Account
 * ------------------------------------------------------------------
 * @desc    Soft-disables the account. Profile is hidden but data is retained.
 *          Reversible — user can reactivate by logging in again.
 *
 * @param   userId - Authenticated user's ID
 *
 * @throws  NotFound - If user does not exist
 *
 * @returns void
 */
export const deactivateAccount = async (userId: string) => {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      isActive: false,
      deactivatedAt: new Date(),
    },
    { new: true }
  );

  if (!user) throw NotFound("User not found");
};


/**
 * ------------------------------------------------------------------
 * Schedule Account Deletion
 * ------------------------------------------------------------------
 * @desc    Marks the account for deletion after a grace period.
 *          The account is NOT deleted immediately — a background job
 *          (scheduledDeletionJob) handles the actual hard delete.
 *          User can cancel via cancelScheduledDeletion() before the timer expires.
 *
 * @param   userId   - Authenticated user's ID
 * @param   password - Confirmed before scheduling (final intent check)
 *
 * @throws  Unauthorized - If password is wrong
 * @throws  NotFound     - If user does not exist
 *
 * @returns scheduledDeletionAt — so the client can show "deletes on X date"
 */
export const scheduleAccountDeletion = async (
  userId: string,
  password: string
) => {
  const user = await UserModel.findById(userId).select("+password");

  if (!user) throw NotFound("User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw Unauthorized("Incorrect password");

  const scheduledDeletionAt = new Date();
  scheduledDeletionAt.setDate(
    scheduledDeletionAt.getDate() + DELETION_GRACE_PERIOD_DAYS
  );

  await UserModel.findByIdAndUpdate(userId, {
    scheduledDeletionAt,
    isActive: false, // hide the account immediately during grace period
  });

  return { scheduledDeletionAt };
};

/**
 * ------------------------------------------------------------------
 * Cancel Scheduled Deletion
 * ------------------------------------------------------------------
 * @desc    Reverses a scheduled deletion if still within the grace period.
 *          Restores the account to active.
 *
 * @param   userId - Authenticated user's ID
 *
 * @throws  NotFound  - If user does not exist
 * @throws  BadRequest - If no deletion was scheduled, or grace period has expired
 *
 * @returns void
 */
export const cancelScheduledDeletion = async (userId: string) => {
  const user = await UserModel.findById(userId);

  if (!user) throw NotFound("User not found");

  if (!user.scheduledDeletionAt) {
    throw BadRequest("No deletion is scheduled for this account");
  }

  if (new Date() > user.scheduledDeletionAt) {
    throw BadRequest("Grace period has expired — account cannot be recovered");
  }

  await UserModel.findByIdAndUpdate(userId, {
    scheduledDeletionAt: null,
    isActive: true,
  });
};