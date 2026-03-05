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

// Fetch all chats for the logged-in user
router.get("/", protect, fetchChats);

// Access a chat with another user (creates one if not exists)
router.post("/access", protect, accessChat);

router.patch("/pin/:chatId", protect, togglePinChat);

router.patch("/archive/:chatId", protect, toggleArchiveChat);

router.patch("/unread/:chatId", protect, markChatAsUnread);

router.patch("/read/:chatId", protect, markChatAsRead);

router.delete("/:chatId/clear", protect, clearChat);

router.delete("/:chatId", protect, deleteChat);

router.post("/:chatId/mute",   protect, muteChat);

router.post("/:chatId/unmute", protect, unmuteChat);

export { router as chatRouter };
