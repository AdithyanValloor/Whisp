import { Router } from "express";
import { 
    getAllMessages, 
    sendMessage, 
    editMessage, 
    deleteMessage, 
    markChatAsRead,
    getUnreadCounts,
    markMessagesAsSeen,
    toggleReaction
} from "../controllers/message.controller.js"
import { protect } from "../../auth/auth.middleware.js"

const router = Router()

// Get unread counts FIRST
router.get("/unread", protect, getUnreadCounts)

// Mark messages as read
router.post("/mark-read/:chatId", protect, markChatAsRead)

// Mark messages as seen
router.post("/mark-seen/:chatId", protect, markMessagesAsSeen);

// Fetch all messages for a chat (dynamic)
router.get("/:chatId", protect, getAllMessages)

// Send a new message
router.post("/", protect, sendMessage)

// Edit a message by id
router.put("/:messageId", protect, editMessage)

// React a message by id
router.post("/react/:messageId", protect, toggleReaction);

// Delete a message by id
router.delete("/:messageId", protect, deleteMessage)

export { router as messageRouter }
