import { Router } from "express";
import { 
    getAllMessages, 
    sendMessage, 
    editMessage, 
    deleteMessage 
} from "../controllers/message.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

// Fetch all messages for a chat
router.get("/:chatId", protect, getAllMessages);

// Send a new message
router.post("/", protect, sendMessage);

// Edit a message by id
router.put("/:messageId", protect, editMessage);

// Delete a message by id
router.delete("/:messageId", protect, deleteMessage);

export default router;
