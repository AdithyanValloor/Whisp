import { Request, Response, NextFunction } from "express";
import { MessageBody, MessageParams } from "../types/message.types.js";
import {
  deleteMessageFunction,
  editMessageFunction,
  forwardMessageFunction,
  getAllMessagesFunction,
  getMessageContextFunction,
  getNewerMessagesFunction,
  getUnreadCountsFunction,
  markChatAsReadFunction,
  markMessagesAsSeenFunction,
  searchMessagesFunction,
  sendMessageFunction,
  toggleReactionFunction,
} from "../services/message.service.js";
import { BadRequest, Unauthorized } from "../../../utils/errors/httpErrors.js";
import { toMessageSocketPayload } from "../utils/normalizeMessage.js";
import {
  emitDeleteMessage,
  emitEditMessage,
  emitMessageReaction,
  emitMessagesSeen,
  emitNewMessage,
  emitUnreadUpdate,
} from "../../../socket/emitters/message.emmitter.js";
import { fetchLinkPreview } from "../utils/linkPreview.js";
import { Message } from "../models/message.model.js";

/**
 * GET /api/message/:chatId?page&limit
 * Returns paginated messages for a chat, newest-first.
 */
export const getAllMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (!chatId) throw BadRequest("ChatId is required");

    const data = await getAllMessagesFunction(chatId, userId, page, limit);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/message
 * Creates a message, emits it to the chat room, and updates unread counts.
 * After responding, asynchronously fetches a link preview if a URL is present
 * and emits an edit event to push the enriched message to clients.
 *
 * Body: { chatId, content, replyTo? }
 * Emits: new_message, unread_update, edit_message (async, link preview only)
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

    const { populated, messageId, firstUrl, chatMembers, unreadCounts } =
      await sendMessageFunction(chatId, content, senderId, replyTo);

    emitNewMessage(chatId, toMessageSocketPayload(populated));

    chatMembers.forEach((memberId) => {
      if (memberId !== senderId) {
        emitUnreadUpdate(memberId, chatId, unreadCounts[memberId]);
      }
    });

    // Respond immediately — link preview runs in the background
    res.status(201).json(populated);

    if (firstUrl) {
      fetchLinkPreview(firstUrl)
        .then(async (preview) => {
          if (!preview) return;

          const message = await Message.findById(messageId);
          if (!message) return;

          message.linkPreview = preview;
          await message.save();

          const updated = await message.populate([
            { path: "sender", select: "displayName username profilePicture" },
            {
              path: "replyTo",
              select: "content sender",
              populate: { path: "sender", select: "username displayName" },
            },
          ]);

          // Re-emit the message so clients receive the enriched version
          emitEditMessage(chatId, toMessageSocketPayload(updated));
        })
        .catch(() => {});
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/message/forward
 * Duplicates a message into one or more target chats.
 * Silently skips chats where the sender is blocked or not a member.
 *
 * Body: { messageId, targetChatIds: string[] }
 * Emits: new_message, unread_update — once per successful target chat
 */
export const forwardMessage = async (
  req: Request<{}, {}, MessageBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const senderId = req.user?.id;
    if (!senderId) throw Unauthorized();

    const { messageId, targetChatIds } = req.body;

    if (!messageId || !Array.isArray(targetChatIds) || targetChatIds.length === 0)
      throw BadRequest("MessageId and targeted chatIds are required");

    const results = await forwardMessageFunction(messageId, targetChatIds, senderId);

    results.forEach(({ chatId, message, chatMembers, unreadCounts }) => {
      emitNewMessage(chatId, toMessageSocketPayload(message));

      chatMembers.forEach((memberId) => {
        if (memberId !== senderId) {
          emitUnreadUpdate(memberId, chatId, unreadCounts[memberId]);
        }
      });
    });

    res.status(201).json(results.map((r) => r.message));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/message/react/:messageId
 * Toggles a reaction on a message. Same emoji removes it; different emoji replaces it.
 *
 * Body: { emoji }
 * Emits: message_reaction
 */
export const toggleReaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { populated, chatId } = await toggleReactionFunction(
      req.params.messageId,
      userId,
      req.body.emoji
    );

    emitMessageReaction(chatId, toMessageSocketPayload(populated));

    res.status(200).json(populated);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/message/unread
 * Returns unread message counts keyed by chatId. Used on bootstrap and reconnect.
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
 * POST /api/message/mark-read/:chatId
 * Resets the unread count to 0 for the requesting user in a chat.
 *
 * Emits: unread_update
 */
export const markChatAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { unreadCount } = await markChatAsReadFunction(
      userId,
      req.params.chatId
    );

    emitUnreadUpdate(userId, req.params.chatId, unreadCount);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/message/mark-seen/:chatId
 * Marks all unread messages as seen and resets the unread count.
 *
 * Emits: messages_seen
 */
export const markMessagesAsSeen = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { success, modifiedCount } = await markMessagesAsSeenFunction(
      userId,
      req.params.chatId
    );

    emitMessagesSeen(req.params.chatId, userId, modifiedCount);
    emitUnreadUpdate(userId, req.params.chatId, 0);

    res.status(200).json({ success });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/message/:messageId
 * Updates message content in-place. Sender only.
 *
 * Body: { content }
 * Emits: edit_message
 */
export const editMessage = async (
  req: Request<MessageParams, {}, MessageBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { messageId } = req.params;
    const { content } = req.body;

    if (!messageId) throw BadRequest("MessageId is required");
    if (!content) throw BadRequest("Content is required");

    const { populated, chatId } = await editMessageFunction(messageId, content, userId);

    emitEditMessage(chatId, toMessageSocketPayload(populated));

    res.status(200).json(populated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/message/:messageId
 * Soft-deletes a message — content is replaced, metadata cleared, document retained.
 * Sender only.
 *
 * Emits: delete_message
 */
export const deleteMessage = async (
  req: Request<MessageParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { messageId } = req.params;
    if (!messageId) throw BadRequest("MessageId is required");

    const { populated, chatId } = await deleteMessageFunction(messageId, userId);

    emitDeleteMessage(chatId, toMessageSocketPayload(populated));

    res.status(200).json(populated);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/message/search?chatId&query?&date?&page?&limit?
 * Searches messages by text and/or calendar date. Results are paginated.
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

/**
 * GET /api/message/context/:messageId?limit?
 * Returns a target message plus `limit` messages before and after it.
 * Used for jump-to-message from search results, reply clicks, and deep links.
 */
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

    const result = await getMessageContextFunction(messageId, userId, limit);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/message/newer/:chatId?after&limit?
 * Returns messages created after the given timestamp, sorted ascending.
 * Used for incremental loading when scrolling toward recent messages.
 *
 * @param after - ISO timestamp (exclusive lower bound)
 */
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

    const result = await getNewerMessagesFunction(chatId, after, userId, limit);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};