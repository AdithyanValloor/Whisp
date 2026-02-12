import express from "express";
import { currentUser, login, logout, register } from "../controllers/user.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = express.Router()

/**
 * @route POST /api/user/signup
 * @desc Register a new user
 * @access Public
 */
router.post("/register", register);

/**
 * @route POST /api/user/login
 * @desc Login existing user
 * @access Public
 */
router.post("/login", login);

/**
 * @route POST /api/user/logout
 * @desc Logout session
 * @access Public
 */
router.post("/logout", logout);

/**
 * @route GET /api/user/me
 * @desc Current user info
 * @access Protected
 */
router.get("/me", protect, currentUser);

export { router as userRouter }
