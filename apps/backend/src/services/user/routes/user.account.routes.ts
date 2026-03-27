import { Router } from "express";
import {
  updateUsernameController,
  updateEmailController,
  changePasswordController,
  deactivateAccountController,
  scheduleAccountDeletionController,
  cancelScheduledDeletionController,
} from "../controllers/user.account.controller.js";
import { protect } from "../../auth/auth.middleware.js";
import { checkPasswordController } from "../controllers/user.controller.js";

const router = Router();

/**
 * PATCH /username
 * Change the authenticated user's username
 * Body: { username: string }
 */
router.patch("/username", protect, updateUsernameController);

/**
 * PATCH /email
 * Change the authenticated user's email (triggers re-verification)
 * Body: { email: string }
 */
router.patch("/email", protect, updateEmailController);

/**
 * PATCH /password
 * Change the authenticated user's password
 * Body: { currentPassword: string; newPassword: string }
 */
router.patch("/password", protect, changePasswordController);

/**
 * PATCH /deactivate
 * Soft-disable the authenticated user's account (reversible)
 * Body: none
 */
router.patch("/deactivate", protect, deactivateAccountController);

/**
 * POST /deletion/schedule
 * Schedule account for hard deletion after a grace period
 * Body: { password: string }
 */
router.post("/deletion/schedule", protect, scheduleAccountDeletionController);

/**
 * POST /deletion/cancel
 * Cancel a scheduled deletion if still within the grace period
 * Body: none
 */
router.post("/deletion/cancel", protect, cancelScheduledDeletionController);

/**
 * POST /check-password
 * Verify the user's current password (used before sensitive actions)
 * Body: { password: string }
 */
router.post("/check-password", protect, checkPasswordController);

export { router as accountRouter}