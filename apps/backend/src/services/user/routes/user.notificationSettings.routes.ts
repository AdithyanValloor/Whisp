import { Router } from "express";
import {
  getNotificationSettingsController,
  updateNotificationSettingsController,
} from "../controllers/user.notificationSettings.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

/**
 * @route   GET /api/user/settings/notifications
 * @desc    Get current user's notification settings
 * @access  Private
 */
router.get("/", protect, getNotificationSettingsController);

/**
 * @route   PATCH /api/user/settings/notifications
 * @desc    Update current user's notification settings
 * @access  Private
 */
router.patch("/", protect, updateNotificationSettingsController);

export { router as notificationSettingsRouter };