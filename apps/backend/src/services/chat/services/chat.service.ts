import { Chat } from "../models/chat.model.js";
import { BadRequest, Forbidden, NotFound, Unauthorized } from "../../../utils/errors/httpErrors.js";
import { ChatUserStateModel } from "../models/chatUserState.model.js";
import { BlockModel } from "../../user/models/block.model.js";
import { Message } from "../../messages/models/message.model.js";

/**
 * ------------------------------------------------------------------
 * Fetch Chats for User
 * ------------------------------------------------------------------
 * @desc    Retrieves all chats (private + group) that the user is part of
 *
 * @param   userId - Authenticated user's ID
 * @returns Array of chat documents sorted by last activity
 *
 * Notes:
 * - Population ensures frontend receives full member/admin info
 * - Sorting by `updatedAt` keeps most recent chats on top
 */
export const fetchChatsFunction = async (userId: string) => {
  if (!userId) {
    throw BadRequest("User ID is required");
  }

  const chats = await Chat.find({
    members: userId,
    isDeleted: { $ne: true },
  })
    .populate("members", "-password")
    .populate("admin", "-password")
    .populate("createdBy", "-password")
    .populate("lastMessage");

  const states = await ChatUserStateModel.find({ userId });

  const stateMap = new Map(
    states.map((s) => [s.chatId.toString(), s])
  );

  const enriched = chats.map((chat) => {
    const state = stateMap.get(chat._id.toString());

    return {
      ...chat.toObject(),
      isPinned: state?.isPinned || false,
      isArchived: state?.isArchived || false,
      clearedAt: state?.clearedAt || null,
      lastReadAt: state?.lastReadAt || null,
    };
  });

  enriched.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.updatedAt).getTime() -
           new Date(a.updatedAt).getTime();
  });

  return enriched;
};

/**
 * ------------------------------------------------------------------
 * Access or Create One-to-One Chat
 * ------------------------------------------------------------------
 * @desc    Fetches an existing private chat or creates one if missing
 *
 * @param   userId         - ID of the target user
 * @param   currentUserId - ID of the authenticated user
 * @returns Chat document
 *
 * Notes:
 * - Enforces strict 1-to-1 chat uniqueness
 * - Group chats are excluded explicitly
 * - Chat creation is idempotent
 */
export const accessChatFunction = async (
  userId: string,
  currentUserId: string
) => {
  if (!userId || !currentUserId) {
    throw BadRequest("Both user IDs are required");
  }

  if (userId === currentUserId) {
    throw BadRequest("Cannot create chat with yourself");
  }

  const blockExists = await BlockModel.exists({
    $or: [
      { blocker: userId, blocked: currentUserId },
      { blocker: currentUserId, blocked: userId },
    ],
  });

  if (blockExists) {
    throw Forbidden("Cannot access chat with this user");
  }

  /**
   * Attempt to find existing 1-to-1 chat
   */
  const existingChat = await Chat.findOne({
    isGroup: false,
    members: { $all: [userId, currentUserId], $size: 2 },
  })
    .populate("members", "-password")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "username profilePicture email",
      },
    });

  if (existingChat) {
    return existingChat;
  }

  /**
   * Create new 1-to-1 chat
   */
  const newChat = await Chat.create({
    chatName: "sender",
    isGroup: false,
    members: [userId, currentUserId],
  });

  const fullChat = await Chat.findById(newChat._id).populate(
    "members",
    "-password"
  );

  if (!fullChat) {
    throw NotFound("Chat creation failed");
  }

  return fullChat;
};

export const togglePinChatFunction = async (
  userId: string,
  chatId: string
) => {
  if (!userId) throw Unauthorized();

  const state = await ChatUserStateModel.findOne({ userId, chatId });

  const newValue = !state?.isPinned;

  await ChatUserStateModel.findOneAndUpdate(
    { userId, chatId },
    { isPinned: newValue },
    { upsert: true }
  );

  return { isPinned: newValue };
};

export const toggleArchiveChatFunction = async (
  userId: string,
  chatId: string
) => {
  if (!userId) throw Unauthorized();

  const state = await ChatUserStateModel.findOne({ userId, chatId });

  const newValue = !state?.isArchived;

  await ChatUserStateModel.findOneAndUpdate(
    { userId, chatId },
    { isArchived: newValue },
    { upsert: true }
  );

  return { isArchived: newValue };
};

export const markChatAsUnreadFunction = async (
  userId: string,
  chatId: string
) => {
  if (!userId) throw Unauthorized();

  const latestIncomingMessage = await Message.findOne({
    chat: chatId,
    deleted: false,
    sender: { $ne: userId },
  })
    .sort({ createdAt: -1 })
    .select("createdAt");

  if (!latestIncomingMessage) {
    return { chatId, count: 0 };
  }

  const newLastReadAt = new Date(
    latestIncomingMessage.createdAt.getTime() - 1
  );

  await ChatUserStateModel.findOneAndUpdate(
    { userId, chatId },
    { lastReadAt: newLastReadAt },
    { upsert: true }
  );

  return { chatId, count: 1 };
};

export const markChatAsReadFunction = async (
  userId: string,
  chatId: string
) => {
  if (!userId) throw Unauthorized();

  const latestMessage = await Message.findOne({
  chat: chatId,
  deleted: false,
})
.sort({ createdAt: -1 })
.select("createdAt");

await ChatUserStateModel.findOneAndUpdate(
  { userId, chatId },
  { lastReadAt: latestMessage?.createdAt ?? new Date() },
  { upsert: true }
);

  return { chatId };
};

export const clearChatForUser = async (userId: string, chatId: string) => {
  const chat = await Chat.findOne({
    _id: chatId,
    members: userId,
  });

  if (!chat) {
    throw Forbidden("Not allowed");
  }

  const now = new Date();

  await ChatUserStateModel.findOneAndUpdate(
    { userId, chatId },
    {
      clearedAt: now,
      lastReadAt: now,
      isArchived: false,
    },
    { upsert: true }
  );

  return true;
};

export const deleteChatForUser = async (userId: string, chatId: string) => {
  const chat = await Chat.findOne({ _id: chatId, members: userId });
  if (!chat) throw Forbidden("Not allowed");

  const now = new Date();

  await ChatUserStateModel.findOneAndUpdate(
    { userId, chatId },
    { clearedAt: now, lastReadAt: now, isArchived: false, isPinned: false },
    { upsert: true }
  );

  await Chat.findByIdAndUpdate(chatId, {
    $pull: { members: userId },
  });

  return { chatId };
};