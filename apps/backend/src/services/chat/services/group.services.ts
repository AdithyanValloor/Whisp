import mongoose from "mongoose";
import { Chat } from "../models/chat.model.js";
import {
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
} from "../../../utils/errors/httpErrors.js";

/**
 * ------------------------------------------------------------------
 * Create Group Chat
 * ------------------------------------------------------------------
 * @desc    Creates a new group chat and assigns creator as admin
 *
 * Rules:
 * - Group must have a name
 * - At least one additional member is required
 * - Creator is automatically added to members & admins
 */
export const createGroupChatFunction = async (
  name: string,
  userIds: string[],
  currentUserId: string
) => {
  if (!name || !Array.isArray(userIds) || userIds.length < 1) {
    throw BadRequest("Group name and at least one member are required");
  }

  // Ensure creator is always included and avoid duplicates
  const members = Array.from(new Set([...userIds, currentUserId]));

  const groupChat = await Chat.create({
    chatName: name,
    members,
    isGroup: true,
    admin: [currentUserId],
    createdBy: currentUserId,
  });

  return Chat.findById(groupChat._id)
    .populate("members", "-password")
    .populate("admin", "-password");
};

/**
 * ------------------------------------------------------------------
 * Get Group By ID
 * ------------------------------------------------------------------
 * @desc    Fetch a group chat only if requester is a member
 */
export const getGroupByIdFunction = async (
  userId: string,
  chatId: string
) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("Group ID is required");

  const group = await Chat.findOne({
    _id: chatId,
    isGroup: true,
    members: userId,
  })
    .populate("members", "-password")
    .populate("admin", "-password")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username profilePicture email" },
    });

  if (!group) throw NotFound("Group not found");

  return group;
};

/**
 * ------------------------------------------------------------------
 * Add Members to Group
 * ------------------------------------------------------------------
 * @desc    Adds new members to a group chat
 *
 * Rules:
 * - Only admins or creator can add members
 * - Existing members are ignored
 */
export const addMembersFunction = async (
  chatId: string,
  members: string[],
  userId: string
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  const isAdmin =
    chat.admin.some((id) => id.toString() === userId) ||
    chat.createdBy?.toString() === userId;

  if (!isAdmin) {
    throw Forbidden("Only admins can add new members");
  }

  const newMembers = members.filter(
    (id) => !chat.members.some((m) => m.toString() === id)
  );

  chat.members.push(
    ...newMembers.map((id) => new mongoose.Types.ObjectId(id))
  );

  await chat.save();
  return chat;
};

/**
 * ------------------------------------------------------------------
 * Remove Member from Group
 * ------------------------------------------------------------------
 * @desc    Removes a member from a group chat
 *
 * Rules:
 * - Only admins or creator can remove members
 * - Group creator cannot be removed
 */
export const removeMembersFunction = async (
  userId: string,
  chatId: string,
  memberId: string
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  const isAdmin =
    chat.admin.some((id) => id.toString() === userId) ||
    chat.createdBy?.toString() === userId;

  if (!isAdmin) {
    throw Forbidden("Only admins can remove members");
  }

  if (chat.createdBy?.toString() === memberId) {
    throw BadRequest("Creator can't be removed");
  }

  chat.members = chat.members.filter(
    (id) => id.toString() !== memberId
  );

  chat.admin = chat.admin.filter(
    (id) => id.toString() !== memberId
  );

  await chat.save();
  return chat;
};

/**
 * ------------------------------------------------------------------
 * Toggle Admin Role
 * ------------------------------------------------------------------
 * @desc    Promotes or demotes a group member as admin
 *
 * Rules:
 * - Only the group creator can manage admins
 */
export const toggleAdminFunction = async (
  userId: string,
  chatId: string,
  memberId: string,
  makeAdmin: boolean
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  if (chat.createdBy?.toString() !== userId) {
    throw Forbidden("Only creator can manage admins");
  }

  if (makeAdmin) {
    if (!chat.admin.some((id) => id.toString() === memberId)) {
      chat.admin.push(new mongoose.Types.ObjectId(memberId));
    }
  } else {
    chat.admin = chat.admin.filter(
      (id) => id.toString() !== memberId
    );
  }

  await chat.save();
  return chat;
};

/**
 * ------------------------------------------------------------------
 * Leave Group
 * ------------------------------------------------------------------
 * @desc    Allows a user to leave a group chat
 *
 * Behavior:
 * - Removes user from members & admins
 * - Reassigns creator if needed
 * - Deletes group if no members remain
 */
export const leaveGroupFunction = async (
  userId: string,
  chatId: string
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  chat.members = chat.members.filter(
    (id) => id.toString() !== userId
  );
  chat.admin = chat.admin.filter(
    (id) => id.toString() !== userId
  );

  // Handle creator leaving
  if (chat.createdBy?.toString() === userId) {
    if (chat.admin.length > 0) {
      chat.createdBy = new mongoose.Types.ObjectId(
        chat.admin[0].toString()
      );
    } else if (chat.members.length > 0) {
      chat.createdBy = new mongoose.Types.ObjectId(
        chat.members[0].toString()
      );
    } else {
      await Chat.findByIdAndDelete(chatId);
      return { message: "Group deleted as no members left", deleted: true };
    }
  }

  await chat.save();
  return { message: "You left the group", chat };
};
