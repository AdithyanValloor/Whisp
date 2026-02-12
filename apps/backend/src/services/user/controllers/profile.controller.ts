import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/authRequest.js";
import {
  getProfileByUserId,
  updateProfileByUserId,
} from "../services/user.services.js";
import { Unauthorized, BadRequest } from "../../../utils/errors/httpErrors.js";

/**
 * ------------------------------------------------------------------
 * View Current User Profile
 * ------------------------------------------------------------------
 * @desc    Fetches the authenticated user's profile
 * @route   GET /api/profile
 * @access  Private (Requires valid access token)
 *
 * Notes:
 * - Relies on `protect` middleware to attach `req.user`
 * - Does NOT expose sensitive fields (password excluded at service level)
 * - Errors are forwarded to global error handler
 */
export const viewProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Safety check in case auth middleware is bypassed/misconfigured
    if (!userId) throw Unauthorized();

    const profile = await getProfileByUserId(userId);

    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
};

/**
 * Shape of allowed profile update fields
 * - All fields are optional to allow partial updates
 * - Validation is kept minimal here; business rules live in services
 */
interface EditProfileBody {
  displayName?: string;
  username?: string;
  pronouns?: string;
  bio?: string;
  status?: string;
}

/**
 * ------------------------------------------------------------------
 * Edit Current User Profile
 * ------------------------------------------------------------------
 * @desc    Updates editable fields of the authenticated user's profile
 * @route   PATCH /api/profile
 * @access  Private (Requires valid access token)
 *
 * Notes:
 * - Only provided fields are updated (PATCH semantics)
 * - Empty body is rejected to prevent no-op updates
 * - Business logic is delegated to service layer
 */
export const editProfile = async (
  req: AuthRequest<{}, {}, EditProfileBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();

    // Prevent accidental empty PATCH requests
    if (!Object.keys(req.body).length) {
      throw BadRequest("No fields provided to update");
    }

    const updatedProfile = await updateProfileByUserId(userId, req.body);

    res.status(200).json(updatedProfile);
  } catch (err) {
    next(err);
  }
};