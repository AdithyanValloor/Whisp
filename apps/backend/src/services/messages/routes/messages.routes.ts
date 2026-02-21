import { Router } from "express";
import { 
    getAllMessages, 
    sendMessage, 
    editMessage, 
    deleteMessage, 
    markChatAsRead,
    getUnreadCounts,
    markMessagesAsSeen,
    toggleReaction,
    searchMessages,
    getMessageContext,
    getNewerMessages,
    forwardMessage
} from "../controllers/message.controller.js"
import { protect } from "../../auth/auth.middleware.js"

const router = Router()

// Get unread counts FIRST
router.get("/unread", protect, getUnreadCounts)

// Mark messages as read
router.post("/mark-read/:chatId", protect, markChatAsRead)

// Mark messages as seen
router.post("/mark-seen/:chatId", protect, markMessagesAsSeen);

// Search messages
router.get("/search", protect, searchMessages);

// Fetch all messages for a chat (dynamic)
router.get("/:chatId", protect, getAllMessages)

// Send a new message
router.post("/", protect, sendMessage)

// Forward a message
router.post("/forward", protect, forwardMessage)

// Edit a message by id
router.put("/:messageId", protect, editMessage)

// React a message by id
router.post("/react/:messageId", protect, toggleReaction);

// Delete a message by id
router.delete("/:messageId", protect, deleteMessage)

// Get message context
router.get("/context/:messageId", protect, getMessageContext);

// Get newer messages (downward fetching)
router.get("/:chatId/newer", protect, getNewerMessages);

export { router as messageRouter }