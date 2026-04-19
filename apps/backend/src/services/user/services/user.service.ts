import { UserModel } from "../models/user.model.js";
import {
  Unauthorized,
  NotFound,
  BadRequest,
} from "../../../utils/errors/httpErrors.js";
import bcrypt from "bcrypt";
import { deleteFile, generateDownloadUrl } from "../../s3/s3.service.js";
import { PROFILE_KEY_REGEX } from "../constants/regex.js";

/**
 * Input type for profile updates
 * - Explicit typing prevents accidental mass assignment
 * - Keeps update logic controlled and auditable
 */
interface UpdateProfileInput {
  displayName?: string;
  username?: string;
  pronouns?: string;
  bio?: string;
  status?: string;
}

/**
 * ------------------------------------------------------------------
 * Get Profile By User ID
 * ------------------------------------------------------------------
 * @desc    Fetches a user's profile by their userId
 *
 * @param   userId - Authenticated user's ID
 *
 * @throws  Unauthorized - If userId is missing
 * @throws  NotFound     - If user does not exist
 *
 * @returns User profile document (password excluded)
 */
export const getProfileByUserId = async (userId: string) => {
  if (!userId) {
    throw Unauthorized("No user info found");
  }

  const profile = await UserModel.findById(userId).select("-password");

  if (!profile) {
    throw NotFound("User not found");
  }

  return profile;
};

/**
 * ------------------------------------------------------------------
 * Update Profile By User ID
 * ------------------------------------------------------------------
 * @desc    Updates editable profile fields for a user
 *
 * @param   userId  - Authenticated user's ID
 * @param   updates - Partial profile fields to update
 *
 * @throws  NotFound - If user does not exist
 *
 * @returns Updated user profile
 *
 * Notes:
 * - Explicit field assignment avoids accidental overwrites
 * - Validation rules (length, uniqueness, etc.) can be added here later
 */
export const updateProfileByUserId = async (
  userId: string,
  updates: UpdateProfileInput
) => {
  const profile = await UserModel.findById(userId);

  if (!profile) {
    throw NotFound("User not found");
  }

  // Apply only provided fields (safe partial update)
  if (updates.displayName !== undefined)
    profile.displayName = updates.displayName;

  if (updates.username !== undefined)
    profile.username = updates.username;

  if (updates.pronouns !== undefined)
    profile.pronouns = updates.pronouns;

  if (updates.bio !== undefined)
    profile.bio = updates.bio;

  if (updates.status !== undefined)
    profile.status = updates.status;

  await profile.save();

  return profile;
};

/**
 * ------------------------------------------------------------------
 * Check Password
 * ------------------------------------------------------------------
 * @desc    Verifies the user's current password without making any changes.
 *          Used for sensitive action gates (e.g. account deletion confirm).
 *
 * @param   userId   - Authenticated user's ID
 * @param   password - Plaintext password to verify
 *
 * @throws  Unauthorized - If password is wrong
 * @throws  NotFound     - If user does not exist
 *
 * @returns void
 */
export const checkPassword = async (userId: string, password: string) => {
  const user = await UserModel.findById(userId).select("+password");

  if (!user) throw NotFound("User not found");

  const isMatch = await bcrypt.compare(password, user.password);

  return { isMatch };
};

export const updateProfilePictureByUserId = async (
  userId: string,
  key: string
) => {
  const user = await UserModel.findById(userId);

  if (!user) throw NotFound("User not found");

  if (user.profilePicture?.key) {
    await deleteFile(user.profilePicture.key);
  }

  const url = await generateDownloadUrl(key);

  user.profilePicture = {
    key: key,
    url: url,
  };

  await user.save();

  return {
    profilePicture: user.profilePicture,
  };
};

export const getProfilePictureDownloadUrlService = async (
  userId: string,
  key: string,
) => {
  if (!key || typeof key !== "string") {
    throw BadRequest("Invalid key");
  }

  if (!PROFILE_KEY_REGEX.test(key)) {
    throw BadRequest("Invalid key format");
  }

  // Ensure user owns this file
  if (!key.startsWith(`profile/${userId}/`)) {
    throw Unauthorized();
  }

  const url = await generateDownloadUrl(key);

  return url;
};