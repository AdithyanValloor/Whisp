import express from "express";
import { protect } from "../../auth/auth.middleware.js";
import { editProfile, viewProfile } from "../controllers/profile.controller.js";

const router = express.Router();

// Profile read and update routes for the authenticated user.
router.get("/", protect, viewProfile);
router.put("/", protect, editProfile);

export { router as profileRouter };
