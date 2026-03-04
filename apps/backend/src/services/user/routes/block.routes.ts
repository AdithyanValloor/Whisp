import { Router } from "express";
import {
  blockUserController,
  getBlockedUsersController,
  unblockUserController,
} from "../controllers/block.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

router.get("/", protect, getBlockedUsersController);
router.post("/:targetUserId", protect, blockUserController);
router.delete("/:targetUserId", protect, unblockUserController);

export { router as blockRouter };
