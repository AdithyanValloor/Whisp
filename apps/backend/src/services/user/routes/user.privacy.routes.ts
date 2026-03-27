import { Router } from "express";
import {
  getPrivacyController,
  updatePrivacyController,
} from "../controllers/user.privacy.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

/**
 * @route   GET /api/user/privacy
 * @desc    Get current user's privacy settings
 * @access  Private
 */
router.get("/", protect, getPrivacyController);

/**
 * @route   PATCH /api/user/privacy
 * @desc    Update current user's privacy settings
 * @access  Private
 */
router.patch("/", protect, updatePrivacyController);

export { router as privacyRouter };