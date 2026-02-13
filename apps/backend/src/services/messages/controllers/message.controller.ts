import { Request, Response, NextFunction } from "express";
import { MessageBody, MessageParams } from "../types/message.types.js";
import {
  deleteMessageFunction,
  editMessageFunction,
  getAllMessagesFunction,
  getMessageContextFunction,
  getNewerMessagesFunction,
  getUnreadCountsFunction,
  markChatAsReadFunction,
  markMessagesAsSeenFunction,
  searchMessagesFunction,
  sendMessageFunction,
  toggleReactionFunction,
} from "../services/message.services.js";
import { BadRequest, Unauthorized } from "../../../utils/errors/httpErrors.js";

/**
 * ------------------------------------------------------------------
 * Fetch Messages for a Chat (Paginated)
 * ------------------------------------------------------------------
 * @desc    Retrieves paginated messages for a specific chat
 * @route   GET /api/message/:chatId
 * @access  Private (Requires valid access token)
 *
 * Query Params:
 * - page?: number   → Page number (default: 1)
 * - limit?: number  → Messages per page (default: 20)
 *
 * Notes:
 * - Messages are returned newest-first from DB
 * - Pagination metadata is included
 * - Business logic is handled in service layer
 */
export const getAllMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (!chatId) throw BadRequest("ChatId is required");

    const data = await getAllMessagesFunction(chatId, page, limit);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Send Message to Chat
 * ------------------------------------------------------------------
 * @desc    Sends a new message to a chat and emits socket events
 * @route   POST /api/message
 * @access  Private (Requires valid access token)
 *
 * Body:
 * - chatId: string
 * - content: string
 * - replyTo?: string
 *
 * Notes:
 * - Updates unread counts for other members
 * - Emits `new_message` and `unread_update` socket events
 */
export const sendMessage = async (
  req: Request<{}, {}, MessageBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const senderId = req.user?.id;
    if (!senderId) throw Unauthorized();

    const { chatId, content, replyTo } = req.body;

    if (!chatId) throw BadRequest("ChatId is required");
    if (!content) throw BadRequest("Message content is required");

    const message = await sendMessageFunction(
      chatId,
      content,
      senderId,
      replyTo
    );

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};


/**
 * ------------------------------------------------------------------
 * Toggle Reaction on Message
 * ------------------------------------------------------------------
 * @desc    Adds or removes a reaction on a message
 * @route   POST /api/message/react/:messageId
 * @access  Private
 *
 * Body:
 * - emoji: string
 *
 * Notes:
 * - If reaction exists → removed
 * - If not → added
 * - Emits `message_reaction` socket event
 */
export const toggleReaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const updated = await toggleReactionFunction(
      req.params.messageId,
      userId,
      req.body.emoji
    );

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Get Unread Message Counts
 * ------------------------------------------------------------------
 * @desc    Retrieves unread message count per chat for user
 * @route   GET /api/message/unread
 * @access  Private
 *
 * Notes:
 * - Used during app bootstrap
 * - Returned as { chatId: count }
 */
export const getUnreadCounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const unread = await getUnreadCountsFunction(userId);
    res.status(200).json({ unread });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Mark Chat as Read
 * ------------------------------------------------------------------
 * @desc    Resets unread count for a chat
 * @route   POST /api/message/mark-read/:chatId
 * @access  Private
 *
 * Notes:
 * - Emits `unread_update` to the user socket
 */
export const markChatAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    await markChatAsReadFunction(userId, req.params.chatId);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Mark Messages as Seen
 * ------------------------------------------------------------------
 * @desc    Marks all unseen messages as seen in a chat
 * @route   POST /api/message/mark-seen/:chatId
 * @access  Private
 *
 * Notes:
 * - Updates `seenBy` and `deliveredTo`
 * - Emits `messages_seen` socket event
 */
export const markMessagesAsSeen = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const result = await markMessagesAsSeenFunction(
      userId,
      req.params.chatId
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Edit Message
 * ------------------------------------------------------------------
 * @desc    Updates message content (soft edit)
 * @route   PUT /api/message/:messageId
 * @access  Private (Sender only)
 *
 * Notes:
 * - Sets `edited = true`
 * - Emits `edit_message` socket event
 */
export const editMessage = async (
  req: Request<MessageParams, {}, MessageBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const messageId = req.params.messageId;
    const content = req.body.content;

    if (!messageId) throw BadRequest("MessageId is required");
    if (!content) throw BadRequest("Content is required");

    const message = await editMessageFunction(
      messageId,
      content,
      userId
    );

    res.status(200).json(message);
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Delete Message (Soft Delete)
 * ------------------------------------------------------------------
 * @desc    Soft deletes a message
 * @route   DELETE /api/message/:messageId
 * @access  Private (Sender only)
 *
 * Notes:
 * - Message is not removed from DB
 * - Content replaced with placeholder
 * - Emits `delete_message` socket event
 */
export const deleteMessage = async (
  req: Request<MessageParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const messageId = req.params.messageId;
    if (!messageId) throw BadRequest("MessageId is required");

    const message = await deleteMessageFunction(
      messageId,
      userId
    );

    res.status(200).json(message);
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Search Messages
 * ------------------------------------------------------------------
 * @route   GET /api/message/search
 * @access  Private
 *
 * Query:
 * - chatId
 * - query?
 * - date?
 * - page?
 * - limit?
 */
export const searchMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { chatId, query, date } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (!chatId) throw BadRequest("ChatId is required");

    const result = await searchMessagesFunction(
      chatId as string,
      userId,
      query as string,
      date as string,
      page,
      limit
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getMessageContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { messageId } = req.params;
    if (!messageId) throw BadRequest("MessageId is required");

    const limit = Number(req.query.limit) || 20;

    const result = await getMessageContextFunction(
      messageId,
      userId,
      limit
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};


export const getNewerMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();
    const { chatId } = req.params;
    const after = req.query.after as string;
    const limit = Number(req.query.limit) || 20;
    if (!after) throw BadRequest("'after' timestamp is required");
    const result = await getNewerMessagesFunction(chatId, after, limit);
    res.status(200).json(result);
  } catch (err) { next(err); }
};