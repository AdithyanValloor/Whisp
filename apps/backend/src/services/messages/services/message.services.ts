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
