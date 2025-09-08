import { Router } from "express";
import { fetchChats, accessChat } from "../controllers/chat.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

// Fetch all chats for the logged-in user
router.get("/", protect, fetchChats);

// Access a chat with another user (creates one if not exists)
router.post("/access", protect, accessChat);

export {router as chatRouter}
