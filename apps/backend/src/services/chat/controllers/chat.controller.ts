import { Response, NextFunction } from "express";
import { AuthRequest } from "../../user/types/authRequest.js";
import {
  accessChatFunction,
  clearChatForUser,
  deleteChatForUser,
  fetchChatsFunction,
  markChatAsReadFunction,
  markChatAsUnreadFunction,
  toggleArchiveChatFunction,
  togglePinChatFunction,
} from "../services/chat.service.js";
import {
  Unauthorized,
  BadRequest,
  Forbidden,
} from "../../../utils/errors/httpErrors.js";
import { Chat } from "../models/chat.model.js";

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
  next: NextFunction,
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
  next: NextFunction,
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

export const togglePinChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      members: userId,
    });

    if (!chat) throw Forbidden("Not allowed");

    if (!userId) {
      throw Unauthorized();
    }

    const result = await togglePinChatFunction(userId, chatId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const toggleArchiveChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      members: userId,
    });

    if (!chat) throw Forbidden("Not allowed");

    if (!userId) {
      throw Unauthorized();
    }

    const result = await toggleArchiveChatFunction(userId, chatId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const markChatAsUnread = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) throw Unauthorized();
    if (!chatId) throw BadRequest("ChatId is required");

    const result = await markChatAsUnreadFunction(userId, chatId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const markChatAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) throw Unauthorized();
    if (!chatId) throw BadRequest("ChatId is required");

    const result = await markChatAsReadFunction(userId, chatId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const clearChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) throw Unauthorized();
    if (!chatId) throw BadRequest("ChatId is required");

    await clearChatForUser(userId, chatId);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const deleteChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) throw Unauthorized();
    if (!chatId) throw BadRequest("ChatId is required");

    await deleteChatForUser(userId, chatId);

    res.status(200).json({ success: true, chatId });
  } catch (err) {
    next(err);
  }
};