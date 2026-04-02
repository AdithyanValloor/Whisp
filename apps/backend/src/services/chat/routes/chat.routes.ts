import { Router } from "express";
import {
  fetchChats,
  accessChat,
  togglePinChat,
  toggleArchiveChat,
  markChatAsUnread,
  markChatAsRead,
  clearChat,
  deleteChat,
  unmuteChat,
  muteChat,
} from "../controllers/chat.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

// Chat list and access routes for the authenticated user.
router.get("/", protect, fetchChats);
router.post("/access", protect, accessChat);

// Conversation state controls.
router.patch("/pin/:chatId", protect, togglePinChat);
router.patch("/archive/:chatId", protect, toggleArchiveChat);
router.patch("/unread/:chatId", protect, markChatAsUnread);
router.patch("/read/:chatId", protect, markChatAsRead);

// Cleanup and notification preference actions for a chat.
router.delete("/:chatId/clear", protect, clearChat);
router.delete("/:chatId", protect, deleteChat);
router.post("/:chatId/mute", protect, muteChat);
router.post("/:chatId/unmute", protect, unmuteChat);

export { router as chatRouter };
