import { Router } from "express";
import {
  getPrivacyController,
  updatePrivacyController,
} from "../controllers/user.privacy.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

// Privacy preferences for the authenticated user.
router.get("/", protect, getPrivacyController);

router.patch("/", protect, updatePrivacyController);

export { router as privacyRouter };
