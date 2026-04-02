import { Router } from "express";
import {
  createGroupChat,
  addMembers,
  removeMembers,
  toggleAdmin,
  leaveGroup,
  getGroupById,
  deleteGroup,
  transferOwnership,
} from "../controllers/group.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

// Group creation and lookup routes.
router.post("/", protect, createGroupChat);
router.get("/:id", protect, getGroupById);

// Membership and role management within a group.
router.post("/members", protect, addMembers);
router.delete("/members", protect, removeMembers);
router.patch("/admin", protect, toggleAdmin);

// Group lifecycle actions for members and owners.
router.post("/leave", protect, leaveGroup);
router.delete("/delete", protect, deleteGroup);
router.patch("/transfer-ownership", protect, transferOwnership);

export { router as groupChatRouter };
