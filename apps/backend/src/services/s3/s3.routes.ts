import express from "express";
import { protect } from "../auth/auth.middleware.js";
import { deleteChatFile, getChatDownloadUrl, getChatUploadUrl } from "./message/message.controller.js";
import { deleteProfilePicture, uploadProfilePicture } from "./user/user.controller.js";
import { deleteGroupAvatar, uploadGroupAvatar } from "./group/group.controller.js";
import { updateProfilePicture } from "../user/controllers/profile.controller.js";
    
const router = express.Router();

// s3.routes.ts
router.post("/chat/upload", protect, getChatUploadUrl);
router.get("/chat/download", protect, getChatDownloadUrl);
router.delete("/chat", protect, deleteChatFile);

// user.routes.ts
router.post("/profile-picture", protect, uploadProfilePicture);
router.put("/profile-picture", protect, updateProfilePicture); 
router.delete("/profile-picture", protect, deleteProfilePicture);

// group.routes.ts
router.post("/avatar", protect, uploadGroupAvatar);
router.delete("/avatar", protect, deleteGroupAvatar);

export {router as s3Router};