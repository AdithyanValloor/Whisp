import express from "express"
import { protect } from "../../auth/auth.middleware.js"
import { editProfile, viewProfile } from "../controllers/profile.controller.js"

const router = express.Router()

/**
 * @route GET /api/user/profile
 * @desc view user profile
 * @access user
 */

router.get("/", protect, viewProfile)

/**
 * @route PUT /api/user/profile
 * @desc EDIT user profile
 * @access user
 */

router.put("/", protect, editProfile)

export { router as profileRouter }