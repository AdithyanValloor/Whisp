import mongoose from "mongoose";
import { Chat } from "../../chat/models/chat.model.js";
import { Message } from "../models/message.model.js";
import {
  BadRequest,
  Unauthorized,
  NotFound,
  Forbidden,
} from "../../../utils/errors/httpErrors.js";
import { extractFirstUrl, fetchLinkPreview } from "../utils/linkPreview.js";

/**
 * ------------------------------------------------------------------
 * Fetch Paginated Messages for a Chat
 * ------------------------------------------------------------------
 * @desc    Retrieves paginated messages for a given chat
 *
 * @param   chatId - ID of the chat
 * @param   page   - Current page number (1-based)
 * @param   limit  - Number of messages per page
 *
 * @returns {
 *   messages: Message[],
 *   totalPages: number,
 *   currentPage: number
 * }
 *
 * Notes:
 * - Messages are sorted newest-first at DB level
 * - Population includes sender, replyTo, reactions, and chat metadata
 * - Pagination metadata is calculated server-side
 */
export const getAllMessagesFunction = async (
  chatId: string,
  page: number,
  limit: number,
) => {
  if (!chatId) throw BadRequest("ChatId is required");

  const skip = (page - 1) * limit;

  const messages = await Message.find({ chat: chatId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "displayName username profilePicture")
    .populate({
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    })
    .populate("reactions.user", "username displayName profilePicture")
    .populate("chat", "_id chatName isGroup");

  const total = await Message.countDocuments({ chat: chatId });

  return {
    messages,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

/**
 * ------------------------------------------------------------------
 * Get Unread Message Counts (Per Chat)
 * ------------------------------------------------------------------
 * @desc    Returns unread message counts for each chat the user belongs to
 *
 * @param   userId - ID of the authenticated user
 *
 * @returns Record<chatId, unreadCount>
 *
 * Notes:
 * - Uses Chat.unreadCounts Map
 * - Used during app bootstrap and socket reconnect
 */
export const getUnreadCountsFunction = async (userId: string) => {
  if (!userId) throw Unauthorized();

  const chats = await Chat.find({ members: userId }).select("_id unreadCounts");

  const unreadData: Record<string, number> = {};

  chats.forEach((chat) => {
    unreadData[chat._id.toString()] =
      chat.unreadCounts?.get(userId.toString()) || 0;
  });

  return unreadData;
};

/**
 * ------------------------------------------------------------------
 * Send Message
 * ------------------------------------------------------------------
 * @desc    Creates a new message and updates unread counts.
 *          Socket emissions are handled by the controller.
 *
 * @param   chatId   - ID of the chat
 * @param   content  - Message text
 * @param   senderId - ID of the sender
 * @param   replyTo  - Optional message ID being replied to
 *
 * @returns {
 *   populated: populated message document,
 *   chatMembers: member ID strings,
 *   unreadCounts: Map<memberId, count>
 * }
 *
 * Side Effects:
 * - Updates Chat.lastMessage
 * - Increments unread counts for other members
 */
export const sendMessageFunction = async (
  chatId: string,
  content: string,
  senderId: string,
  replyTo?: string | null,
) => {
  if (!senderId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");
  if (!content) throw BadRequest("Message content is required");

  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  const deliveredTo = chat.members.filter(
    (id) => id.toString() !== senderId
  );

  const firstUrl = extractFirstUrl(content);

  const message = await Message.create({
    sender: senderId,
    content,
    chat: chatId,
    deliveredTo,
    replyTo: replyTo || null,
    linkPreview: null,
  });

  const populated = await message.populate([
    { path: "sender", select: "displayName username profilePicture" },
    {
      path: "replyTo",
      select: "content sender",
      populate: {
        path: "sender",
        select: "username displayName",
      },
    },
  ]);

  // Update unread counts
  chat.lastMessage = message._id;
  chat.unreadCounts ??= new Map();

  chat.members.forEach((memberId) => {
    const id = memberId.toString();
    if (id !== senderId) {
      chat.unreadCounts.set(id, (chat.unreadCounts.get(id) || 0) + 1);
    }
  });

  await chat.save();

  return {
    populated,
    messageId: message._id.toString(),
    firstUrl,
    chatMembers: chat.members.map((m) => m.toString()),
    unreadCounts: chat.unreadCounts,
  };
};

/**
 * ------------------------------------------------------------------
 * Forward Message (Core Logic)
 * ------------------------------------------------------------------
 * @desc    Duplicates an existing message into one or more target chats.
 *
 * @param   messageId      - ID of original message
 * @param   targetChatIds  - Array of destination chat IDs
 * @param   senderId       - Authenticated user ID
 *
 * @returns Array<{
 *   chatId: string,
 *   message: PopulatedMessage,
 *   chatMembers: string[],
 *   unreadCounts: Map<string, number>
 * }>
 *
 * Notes:
 * - Sets `forwarded = true`
 * - Sets `forwardedFrom = originalMessageId`
 * - Updates Chat.lastMessage
 * - Increments unread counts
 * - Validates sender membership in both origin and target chats
 */

export const forwardMessageFunction = async (
  messageId: string,
  targetChatIds: string[],
  senderId: string,
) => {
  if (!senderId) throw Unauthorized();
  if (!messageId) throw BadRequest("MessageId is required");
  if (!targetChatIds || targetChatIds.length === 0)
    throw BadRequest("At least one target chat is required");

  const original = await Message.findById(messageId);

  if (!original) throw NotFound("Original message not found");

  const originChat = await Chat.findOne({
    _id: original.chat,
    members: senderId,
  });

  if (!originChat) {
    throw Forbidden("Not allowed to forward this message");
  }

  const results = [];

  for (const chatId of targetChatIds) {
    const chat = await Chat.findById(chatId);
    if (!chat) continue;

    // Ensure sender is member
    if (!chat.members.some((m) => m.toString() === senderId)) {
      continue;
    }

    const deliveredTo = chat.members.filter((id) => id.toString() !== senderId);

    const forwardedMessage = await Message.create({
      chat: chatId,
      sender: senderId,
      content: original.content,
      deliveredTo,
      forwarded: true,
      forwardedFrom: original._id,
      linkPreview: original.linkPreview || null, 
    });

    chat.lastMessage = forwardedMessage._id;
    chat.unreadCounts ??= new Map();

    chat.members.forEach((memberId) => {
      const id = memberId.toString();
      if (id !== senderId) {
        chat.unreadCounts.set(id, (chat.unreadCounts.get(id) || 0) + 1);
      }
    });

    await chat.save();

    const populated = await forwardedMessage.populate([
      { path: "sender", select: "displayName username profilePicture" },
      {
        path: "forwardedFrom",
        select: "content sender",
        populate: {
          path: "sender",
          select: "username displayName profilePicture",
        },
      },
    ]);

    results.push({
      chatId,
      message: populated,
      chatMembers: chat.members.map((m) => m.toString()),
      unreadCounts: chat.unreadCounts,
    });
  }

  return results;
};

/**
 * ------------------------------------------------------------------
 * Toggle Reaction on Message
 * ------------------------------------------------------------------
 * @desc    Adds or removes a reaction for a message.
 *          Socket emissions are handled by the controller.
 *
 * @param   messageId - ID of the message
 * @param   userId    - ID of the reacting user
 * @param   emoji     - Emoji identifier
 *
 * @returns {
 *   populated: updated message with populated reactions,
 *   chatId: string
 * }
 *
 * Notes:
 * - Same emoji + user toggles reaction off
 * - Different emoji replaces existing reaction
 */
export const toggleReactionFunction = async (
  messageId: string,
  userId: string,
  emoji: string,
) => {
  if (!userId) throw Unauthorized();
  if (!emoji) throw BadRequest("Emoji is required");

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.user.toString() === userId,
  );

  if (existingReactionIndex !== -1) {
    const existingReaction = message.reactions[existingReactionIndex];

    if (existingReaction.emoji === emoji) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    message.reactions.push({
      emoji,
      user: new mongoose.Types.ObjectId(userId),
    });
  }

  await message.save();

  const populated = await message.populate([
    { path: "sender", select: "displayName username profilePicture" },
    { path: "reactions.user", select: "username displayName profilePicture" },
  ]);

  return {
    populated,
    chatId: message.chat.toString(),
  };
};

/**
 * ------------------------------------------------------------------
 * Mark Chat as Read
 * ------------------------------------------------------------------
 * @desc    Resets unread count for a chat for the given user.
 *          Socket emissions are handled by the controller.
 *
 * @param   userId - ID of the user
 * @param   chatId - ID of the chat
 */
export const markChatAsReadFunction = async (
  userId: string,
  chatId: string,
) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");

  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  chat.unreadCounts.set(userId.toString(), 0);
  await chat.save();

  return true;
};

/**
 * ------------------------------------------------------------------
 * Mark Messages as Seen
 * ------------------------------------------------------------------
 * @desc    Marks all unseen messages in a chat as seen by the user.
 *          Socket emissions are handled by the controller.
 *
 * @param   userId - ID of the user
 * @param   chatId - ID of the chat
 *
 * @returns { success: true, modifiedCount: number }
 *
 * Side Effects:
 * - Updates Message.seenBy
 * - Removes user from deliveredTo
 * - Resets unread count
 */
export const markMessagesAsSeenFunction = async (
  userId: string,
  chatId: string,
) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");

  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  const updated = await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, seenBy: { $ne: userId } },
    { $addToSet: { seenBy: userId } },
  );

  await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, deliveredTo: userId },
    { $pull: { deliveredTo: userId } },
  );

  chat.unreadCounts.set(userId.toString(), 0);
  await chat.save();

  return { success: true, modifiedCount: updated.modifiedCount };
};

/**
 * ------------------------------------------------------------------
 * Edit Message
 * ------------------------------------------------------------------
 * @desc    Edits message content (soft edit).
 *          Socket emissions are handled by the controller.
 *
 * @param   messageId  - ID of the message
 * @param   newContent - Updated message content
 * @param   userId     - ID of the requester
 *
 * @returns {
 *   populated: updated message,
 *   chatId: string
 * }
 *
 * Notes:
 * - Only sender can edit
 * - Sets `edited = true`
 */
export const editMessageFunction = async (
  messageId: string,
  newContent: string,
  userId: string,
) => {
  if (!userId) throw Unauthorized();
  if (!newContent) throw BadRequest("Content is required");

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  if (message.sender.toString() !== userId) {
    throw Forbidden("Not authorized to edit this message");
  }

  message.content = newContent;
  message.edited = true;
  await message.save();

  const populated = await message.populate("sender", "username profilePicture");

  return {
    populated,
    chatId: message.chat.toString(),
  };
};

/**
 * ------------------------------------------------------------------
 * Delete Message (Soft Delete)
 * ------------------------------------------------------------------
 * @desc    Soft deletes a message instead of removing it.
 *          Socket emissions are handled by the controller.
 *
 * @param   messageId - ID of the message
 * @param   userId    - ID of the requester
 *
 * @returns {
 *   populated: updated message,
 *   chatId: string
 * }
 *
 * Notes:
 * - Message is retained for audit/history
 * - Content replaced with placeholder
 */
export const deleteMessageFunction = async (
  messageId: string,
  userId: string,
) => {
  if (!userId) throw Unauthorized();

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  if (message.sender.toString() !== userId) {
    throw Forbidden("Not authorized to delete this message");
  }

  message.content = "This message was deleted";
  message.deleted = true;
  message.edited = false;
  message.replyTo = null;
  message.forwarded = false;
  message.forwardedFrom = null;
  message.reactions = [];
  message.linkPreview = undefined;

  await message.save();

  const populated = await message.populate(
    "sender",
    "username displayName profilePicture"
  );

  return {
    populated,
    chatId: message.chat.toString(),
  };
};

/**
 * ------------------------------------------------------------------
 * Search Messages (Scalable)
 * ------------------------------------------------------------------
 * @desc    Searches messages in a chat with text and/or date filters
 *
 * @param   chatId - Chat ID
 * @param   userId - Authenticated user
 * @param   query  - Optional text search
 * @param   date   - Optional ISO date string
 * @param   page   - Page number
 * @param   limit  - Results per page
 *
 * @returns {
 *   messages,
 *   totalPages,
 *   currentPage,
 *   hasMore
 * }
 */
export const searchMessagesFunction = async (
  chatId: string,
  userId: string,
  query?: string,
  date?: string,
  page: number = 1,
  limit: number = 20,
) => {
  if (!chatId) throw BadRequest("ChatId is required");
  if (!userId) throw Unauthorized();

  const chat = await Chat.findOne({
    _id: chatId,
    members: userId,
  });

  if (!chat) throw Forbidden("Not allowed to search this chat");

  const filter: any = {
    chat: chatId,
    deleted: false,
  };

  if (query && query.trim() !== "") {
    filter.$text = { $search: query };
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const skip = (page - 1) * limit;

  const messages = await Message.find(
    filter,
    query ? { score: { $meta: "textScore" } } : {},
  )
    .sort(
      query
        ? { score: { $meta: "textScore" }, createdAt: -1 }
        : { createdAt: -1 },
    )
    .skip(skip)
    .limit(limit)
    .populate("sender", "displayName username profilePicture")
    .populate({
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    })
    .populate("reactions.user", "username displayName profilePicture");

  const total = await Message.countDocuments(filter);

  return {
    messages,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    hasMore: skip + messages.length < total,
  };
};

/**
 * ------------------------------------------------------------------
 * Get Message Context (Jump-to-Message System)
 * ------------------------------------------------------------------
 * @desc    Fetches a message along with surrounding context messages.
 *          Used for dynamic jump-to-message from:
 *            • Search results
 *            • Reply click
 *            • Deep links
 *
 *          Instead of loading the entire chat history, this function
 *          retrieves a limited window of messages:
 *            - `limit` messages BEFORE the target
 *            - The target message itself
 *            - `limit` messages AFTER the target
 *
 * @param   messageId - Target message ID
 * @param   userId    - Authenticated user ID (must belong to chat)
 * @param   limit     - Number of messages before/after (default: 20)
 *
 * @returns {
 *   target:  Message,
 *   before:  Message[],
 *   after:   Message[]
 * }
 */
export const getMessageContextFunction = async (
  messageId: string,
  userId: string,
  limit: number = 20,
) => {
  const populateConfig = [
    {
      path: "sender",
      select: "username displayName profilePicture",
    },
    {
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    },
    {
      path: "reactions.user",
      select: "username displayName profilePicture",
    },
  ];

  const target = await Message.findById(messageId).populate(populateConfig);
  if (!target) throw NotFound("Message not found");

  const chat = await Chat.findOne({
    _id: target.chat,
    members: userId,
  });

  if (!chat) throw Forbidden("Not allowed");

  const before = await Message.find({
    chat: target.chat,
    createdAt: { $lt: target.createdAt },
    deleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate(populateConfig);

  const after = await Message.find({
    chat: target.chat,
    createdAt: { $gt: target.createdAt },
    deleted: false,
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate(populateConfig);

  return {
    target,
    before: before.reverse(),
    after,
  };
};

export const getNewerMessagesFunction = async (
  chatId: string,
  after: string,
  limit: number = 20,
) => {
  if (!chatId) throw BadRequest("ChatId is required");

  const afterDate = new Date(after);

  const messages = await Message.find({
    chat: chatId,
    createdAt: { $gt: afterDate },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate("sender", "displayName username profilePicture")
    .populate({
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    })
    .populate("reactions.user", "username displayName profilePicture");

  const totalNewer = await Message.countDocuments({
    chat: chatId,
    createdAt: { $gt: afterDate },
  });

  return {
    messages,
    hasMore: messages.length < totalNewer,
  };
};
