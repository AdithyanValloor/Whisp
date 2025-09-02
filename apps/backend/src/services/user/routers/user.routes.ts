import express from "express";
import { login, logout, register } from "../controllers/user.controller.js";

const router = express.Router()

/**
 * @route POST /api/user/signup
 * @desc Register a new user
 * @access Public
 */
router.post("/signup", register)

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
router.post("/logout", logout)

export { router as userRouter };
