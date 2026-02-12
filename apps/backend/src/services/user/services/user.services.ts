import { UserModel } from "../models/user.model.js";
import {
  Unauthorized,
  NotFound,
} from "../../../utils/errors/httpErrors.js";

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
