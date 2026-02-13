import mongoose from "mongoose";
import { Chat } from "../../chat/models/chat.model.js";
import { Message } from "../models/message.model.js";
import {
  BadRequest,
  Unauthorized,
  NotFound,
  Forbidden,
} from "../../../utils/errors/httpErrors.js";


import { toMessageSocketPayload } from "../utils/normalizeMessage.js";
import { 
  emitDeleteMessage, 
  emitEditMessage, 
  emitMessageReaction, 
  emitMessagesSeen, 
  emitNewMessage, 
  emitUnreadUpdate 
} from "../../../socket/emitters/message.emmitter.js";

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
  limit: number
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
 * Send Message + Emit Socket Events
 * ------------------------------------------------------------------
 * @desc    Creates a new message, updates unread counts,
 *          and emits real-time socket events
 *
 * @param   chatId   - ID of the chat
 * @param   content  - Message text
 * @param   senderId - ID of the sender
 * @param   replyTo  - Optional message ID being replied to
 *
 * @returns Populated message document
 *
 * Side Effects:
 * - Updates Chat.lastMessage
 * - Increments unread counts for other members
 * - Emits:
 *   - `new_message` to chat room
 *   - `unread_update` to individual users
 */
export const sendMessageFunction = async (
  chatId: string,
  content: string,
  senderId: string,
  replyTo?: string | null
) => {
  if (!senderId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");
  if (!content) throw BadRequest("Message content is required");

  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  const deliveredTo = chat.members.filter(
    (id) => id.toString() !== senderId
  );

  const message = await Message.create({
    sender: senderId,
    content,
    chat: chatId,
    deliveredTo,
    replyTo: replyTo || null,
  });

  const populated = await message.populate([
    { path: "sender", select: "displayName username profilePicture" },
    {
      path: "replyTo",
      select: "content sender",
      populate: { path: "sender", select: "username displayName" },
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

  // Emit socket events
  const payload = toMessageSocketPayload(populated);

  emitNewMessage(chatId, payload);

  chat.members.forEach((memberId) => {
    const id = memberId.toString();
    if (id !== senderId) {
      emitUnreadUpdate(id, chatId, chat.unreadCounts.get(id) || 0);
    }
  });

  return populated;
};

/**
 * ------------------------------------------------------------------
 * Toggle Reaction on Message
 * ------------------------------------------------------------------
 * @desc    Adds or removes a reaction for a message
 *
 * @param   messageId - ID of the message
 * @param   userId    - ID of the reacting user
 * @param   emoji     - Emoji identifier
 *
 * @returns Updated message with populated reactions
 *
 * Notes:
 * - Same emoji + user toggles reaction
 * - Emits `message_reaction` socket event
 */
export const toggleReactionFunction = async (
  messageId: string,
  userId: string,
  emoji: string
) => {
  if (!userId) throw Unauthorized();
  if (!emoji) throw BadRequest("Emoji is required");

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  // Find any existing reaction by this user
  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.user.toString() === userId
  );

  if (existingReactionIndex !== -1) {
    const existingReaction = message.reactions[existingReactionIndex];

    if (existingReaction.emoji === emoji) {
      // Same emoji clicked → remove reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Different emoji clicked → replace reaction
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    // No reaction yet → add new one
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

  emitMessageReaction(
    message.chat.toString(),
    toMessageSocketPayload(populated)
  );

  return populated;
};

/**
 * ------------------------------------------------------------------
 * Mark Chat as Read
 * ------------------------------------------------------------------
 * @desc    Resets unread count for a chat for the given user
 *
 * @param   userId - ID of the user
 * @param   chatId - ID of the chat
 *
 * Side Effects:
 * - Updates Chat.unreadCounts
 * - Emits `unread_update` to user socket
 */
export const markChatAsReadFunction = async (
  userId: string,
  chatId: string
) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");

  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  chat.unreadCounts.set(userId.toString(), 0);
  await chat.save();

  emitUnreadUpdate(userId, chatId, 0);

  return true;
};

/**
 * ------------------------------------------------------------------
 * Mark Messages as Seen
 * ------------------------------------------------------------------
 * @desc    Marks all unseen messages in a chat as seen by the user
 *
 * @param   userId - ID of the user
 * @param   chatId - ID of the chat
 *
 * Side Effects:
 * - Updates Message.seenBy
 * - Removes user from deliveredTo
 * - Resets unread count
 * - Emits `messages_seen` socket event
 */
export const markMessagesAsSeenFunction = async (
  userId: string,
  chatId: string
) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");

  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  const updated = await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, seenBy: { $ne: userId } },
    { $addToSet: { seenBy: userId } }
  );

  await Message.updateMany(
    { chat: chatId, sender: { $ne: userId }, deliveredTo: userId },
    { $pull: { deliveredTo: userId } }
  );

  chat.unreadCounts.set(userId.toString(), 0);
  await chat.save();

  emitMessagesSeen(chatId, userId, updated.modifiedCount);

  return { success: true };
};

/**
 * ------------------------------------------------------------------
 * Edit Message
 * ------------------------------------------------------------------
 * @desc    Edits message content (soft edit)
 *
 * @param   messageId  - ID of the message
 * @param   newContent - Updated message content
 * @param   userId     - ID of the requester
 *
 * Notes:
 * - Only sender can edit
 * - Sets `edited = true`
 * - Emits `edit_message` socket event
 */
export const editMessageFunction = async (
  messageId: string,
  newContent: string,
  userId: string
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
  emitEditMessage(
    message.chat.toString(),
    toMessageSocketPayload(populated)
  );

  return populated;
};

/**
 * ------------------------------------------------------------------
 * Delete Message (Soft Delete)
 * ------------------------------------------------------------------
 * @desc    Soft deletes a message instead of removing it
 *
 * @param   messageId - ID of the message
 * @param   userId    - ID of the requester
 *
 * Notes:
 * - Message is retained for audit/history
 * - Content replaced with placeholder
 * - Emits `delete_message` socket event
 */
export const deleteMessageFunction = async (
  messageId: string,
  userId: string
) => {
  if (!userId) throw Unauthorized();

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  if (message.sender.toString() !== userId) {
    throw Forbidden("Not authorized to delete this message");
  }

  message.content = "This message was deleted";
  message.deleted = true;
  await message.save();

  const populated = await message.populate("sender", "username profilePicture");
  emitDeleteMessage(
    message.chat.toString(),
    toMessageSocketPayload(populated)
  );
  return populated;
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
  limit: number = 20
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

  // -------------------------
  // TEXT SEARCH
  // -------------------------
  if (query && query.trim() !== "") {
    filter.$text = { $search: query };
  }

  // -------------------------
  // DATE FILTER
  // -------------------------
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
    query ? { score: { $meta: "textScore" } } : {}
  )
    .sort(
      query
        ? { score: { $meta: "textScore" }, createdAt: -1 }
        : { createdAt: -1 }
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
 *          This ensures:
 *            ✓ Efficient loading
 *            ✓ Smooth scroll anchoring
 *            ✓ Scalable chat performance
 *
 * @param   messageId - Target message ID
 * @param   userId    - Authenticated user ID (must belong to chat)
 * @param   limit     - Number of messages before/after (default: 20)
 *
 * @returns {
 *   target:  Message,
 *   before:  Message[],   // chronological (older → newer)
 *   after:   Message[]    // chronological (older → newer)
 * }
 *
 * @security
 *   - Verifies user belongs to the chat before returning data
 *
 * @performance
 *   - Uses compound index: 
 *       messageSchema.index({ chat: 1, createdAt: -1 });
 *   - Queries efficiently using:
 *       chat + createdAt
 *
 * @use-case
 *   - Search result jump
 *   - Reply-to jump
 *   - Message permalink
 * ------------------------------------------------------------------
 */

export const getMessageContextFunction = async (
  messageId: string,
  userId: string,
  limit: number = 20
) => {

  // --------------------------------------------------
  // Common populate configuration
  // This ensures returned messages match Redux MessageType
  // --------------------------------------------------
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

  // --------------------------------------------------
  // 1️⃣ Get target message (with populate)
  // --------------------------------------------------
  const target = await Message.findById(messageId)
    .populate(populateConfig);

  if (!target) throw NotFound("Message not found");

  // --------------------------------------------------
  // 2️⃣ Validate user belongs to the chat
  // --------------------------------------------------
  const chat = await Chat.findOne({
    _id: target.chat,
    members: userId,
  });

  if (!chat) throw Forbidden("Not allowed");

  // --------------------------------------------------
  // 3️⃣ Fetch messages BEFORE the target
  // We sort descending first for efficiency,
  // then reverse later to keep chronological order.
  // --------------------------------------------------
  const before = await Message.find({
    chat: target.chat,
    createdAt: { $lt: target.createdAt },
    deleted: false,
  })
    .sort({ createdAt: -1 }) // newest first
    .limit(limit)
    .populate(populateConfig);

  // --------------------------------------------------
  // 4️⃣ Fetch messages AFTER the target
  // These are naturally chronological (ascending)
  // --------------------------------------------------
  const after = await Message.find({
    chat: target.chat,
    createdAt: { $gt: target.createdAt },
    deleted: false,
  })
    .sort({ createdAt: 1 }) // oldest first
    .limit(limit)
    .populate(populateConfig);

  // --------------------------------------------------
  // 5️⃣ Return structured context
  // before is reversed so final order becomes:
  // [older → newer] → target → [newer]
  // --------------------------------------------------
  return {
    target,
    before: before.reverse(),
    after,
  };
};

export const getNewerMessagesFunction = async (
  chatId: string,
  after: string,
  limit: number = 20
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
      populate: { path: "sender", select: "username displayName profilePicture" },
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