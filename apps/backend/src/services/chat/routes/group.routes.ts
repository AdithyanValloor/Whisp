import { Router } from "express"
import { 
    createGroupChat, 
    addMembers, 
    removeMembers, 
    toggleAdmin, 
    leaveGroup, 
    getGroupById
} from "../controllers/group.controller.js"
import { protect } from "../../auth/auth.middleware.js"


const router = Router()

// Create a new group chat
router.post("/", protect, createGroupChat)

// Fetch single group
router.get("/:id", protect, getGroupById);

// Add members to a group
router.post("/members", protect, addMembers)

// Remove members from a group
router.delete("/members", protect, removeMembers)

// Toggle admin role for a member
router.patch("/admin", protect, toggleAdmin)

// Leave a group
router.post("/leave", protect, leaveGroup)

export {router as groupChatRouter}
