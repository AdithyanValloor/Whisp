import { Chat } from "../models/chat.model.js";
import { BadRequest, NotFound } from "../../../utils/errors/httpErrors.js";

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
    throw BadRequest("User ID is required to fetch chats");
  }

  const chats = await Chat.find({
    members: { $in: [userId] },
  })
    .populate("members", "-password")
    .populate("admin", "-password")
    .populate("createdBy", "-password")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

  return chats;
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

  /**
   * Attempt to find an existing one-to-one chat
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
   * Create a new one-to-one chat if none exists
   */
  const newChat = await Chat.create({
    chatName: "sender", // frontend typically replaces this
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
