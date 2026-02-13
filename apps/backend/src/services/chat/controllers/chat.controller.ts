import { Response, NextFunction } from "express";
import { AuthRequest } from "../../user/types/authRequest.js";
import {
  accessChatFunction,
  fetchChatsFunction,
} from "../services/chat.services.js";
import { Unauthorized, BadRequest } from "../../../utils/errors/httpErrors.js";

/**
 * ------------------------------------------------------------------
 * Fetch User Chats
 * ------------------------------------------------------------------
 * @desc    Retrieves all chats that the authenticated user is part of
 * @route   GET /api/chat
 * @access  Private (Requires valid access token)
 *
 * Notes:
 * - Requires `protect` middleware to attach `req.user`
 * - Returns both private and group chats
 * - Errors are forwarded to the global error handler
 */
export const fetchChats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Safety check in case auth middleware is missing/misconfigured
    if (!userId) {
      throw Unauthorized();
    }

    const chats = await fetchChatsFunction(userId);

    res.status(200).json(chats);
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Access or Create One-to-One Chat
 * ------------------------------------------------------------------
 * @desc    Returns an existing one-to-one chat or creates a new one
 * @route   POST /api/chat
 * @access  Private (Requires valid access token)
 *
 * Request Body:
 * - userId: string → ID of the user to chat with
 *
 * Notes:
 * - Prevents chat access without authentication
 * - Business logic is handled inside service layer
 * - Controller only validates inputs and auth state
 */
export const accessChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId }: { userId?: string } = req.body;
    const currentUserId = req.user?.id;

    // Validate request body
    if (!userId) {
      throw BadRequest("UserId parameter is required");
    }

    // Validate authentication
    if (!currentUserId) {
      throw Unauthorized();
    }

    const chat = await accessChatFunction(userId, currentUserId);

    res.status(200).json(chat);
  } catch (err) {
    next(err);
  }
};
