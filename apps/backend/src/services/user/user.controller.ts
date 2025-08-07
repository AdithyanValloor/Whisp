import { registerUser, loginUser } from "../auth/auth.controller";
import { Request, Response } from "express";

/**
 * @desc Handles user registration
 * @route POST /api/user/signup
 * @access Public
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Call the service layer
    const {accessToken, refreshToken, safeUser} = await registerUser(username, email, password);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(201).json({accessToken, user: safeUser});
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

/**
 * @desc Handles user login
 * @route POST /api/user/login
 * @access Public
 */

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Call the service layer
    const {accessToken, refreshToken, safeUser} = await loginUser(email, password);
    
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(200).json({accessToken, user: safeUser});
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

/**
 * @desc Handles user logout
 * @route POST /api/user/logout
 * @access User
 */
export const logout = async (req: Request, res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }).clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }).status(200).json({ message: "Logged out successfully"})
}
