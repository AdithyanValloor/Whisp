import { Router } from "express";
import {
  blockUserController,
  getBlockedByUsersController,
  getBlockedUsersController,
  unblockUserController,
} from "../controllers/block.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

// Manage users blocked by the authenticated user.
router.get("/", protect, getBlockedUsersController);

// Block or unblock a specific user by their id.
router.post("/:targetUserId", protect, blockUserController);
router.delete("/:targetUserId", protect, unblockUserController);

// View users who have blocked the current account.
router.get("/blocked-by", protect, getBlockedByUsersController);

export { router as blockRouter };
