import { Router } from "express";
import {
  updateUsernameController,
  updateEmailController,
  changePasswordController,
  deactivateAccountController,
  scheduleAccountDeletionController,
  cancelScheduledDeletionController,
  sendEmailChangeOtpController,
} from "../controllers/user.account.controller.js";
import { protect } from "../../auth/auth.middleware.js";
import { checkPasswordController } from "../controllers/user.controller.js";

const router = Router();

// Account settings routes for authenticated users.
router.patch("/username", protect, updateUsernameController);

// Email change flow: send OTP first, then update the address.
router.post("/email/send-otp", protect, sendEmailChangeOtpController);
router.patch("/email", protect, updateEmailController);

// Password and account state management.
router.patch("/password", protect, changePasswordController);
router.patch("/deactivate", protect, deactivateAccountController);

// Deferred deletion endpoints allow users to schedule or cancel removal.
router.post("/deletion/schedule", protect, scheduleAccountDeletionController);
router.post("/deletion/cancel", protect, cancelScheduledDeletionController);

// Used to confirm the current password before sensitive actions.
router.post("/check-password", protect, checkPasswordController);

export { router as accountRouter };
