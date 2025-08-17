import express from "express"
import { protect } from "../../auth/auth.middleware"
import { editProfile, viewProfile } from "../controllers/profile.controller"

/**
 * @route GET /api/user/profile
 * @desc view user profile
 * @access user
 */

const router = express.Router()

router.get("/", protect, viewProfile)
router.put("/", protect, editProfile)

export { router as profileRouter }