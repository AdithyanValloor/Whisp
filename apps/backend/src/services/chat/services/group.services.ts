import mongoose, { ObjectId } from "mongoose";
import { Chat } from "../models/chat.model.js";
import {
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
} from "../../../utils/errors/httpErrors.js";

/**
 * Populates a group chat with all required related fields.
 *
 * - members (without password)
 * - admin (without password)
 * * createdBy (without password)
 * - lastMessage + sender details
 *
 * Use this after any group update to ensure
 * the frontend receives complete data.
 */
const populateGroup = (chatId: string) => {
  return Chat.findById(chatId)
    .populate("members", "-password")
    .populate("admin", "-password")
    .populate("createdBy", "-password")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "username profilePicture email",
      },
    });
};

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
  currentUserId: string,
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

  return populateGroup(groupChat._id.toString());
};

/**
 * ------------------------------------------------------------------
 * Get Group By ID
 * ------------------------------------------------------------------
 * @desc    Fetch a group chat only if requester is a member
 */
export const getGroupByIdFunction = async (userId: string, chatId: string) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("Group ID is required");

  const group = await Chat.findOne({
    _id: chatId,
    isGroup: true,
    members: userId,
  });

  if (!group) throw NotFound("Group not found");

  return populateGroup(group._id.toString());
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
  userId: string,
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
    (id) => !chat.members.some((m) => m.toString() === id),
  );

  chat.members.push(...newMembers.map((id) => new mongoose.Types.ObjectId(id)));

  await chat.save();
  return populateGroup(chat._id.toString());
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
  memberId: string,
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

  chat.members = chat.members.filter((id) => id.toString() !== memberId);

  chat.admin = chat.admin.filter((id) => id.toString() !== memberId);

  await chat.save();
  return populateGroup(chat._id.toString());
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
  makeAdmin: boolean,
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
    chat.admin = chat.admin.filter((id) => id.toString() !== memberId);
  }

  await chat.save();
  return populateGroup(chat._id.toString());
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
export const leaveGroupFunction = async (userId: string, chatId: string) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  if (chat.createdBy?.toString() === userId) {
    throw Forbidden("Transfer ownership before leaving the group");
  }

  chat.members = chat.members.filter((id) => id.toString() !== userId);

  chat.admin = chat.admin.filter((id) => id.toString() !== userId);

  await chat.save();

  return { message: "You left the group", chat };
};

/**
 * Soft deletes a group chat.
 *
 * - Only the group owner (createdBy) can delete.
 * - Marks group as deleted (isDeleted = true).
 *
 * @param userId - ID of requesting user
 * @param chatId - Group chat ID
 *
 * @throws NotFound | BadRequest | Forbidden
 */

export const deleteGroupFunction = async (userId: string, chatId: string) => {
  const chat = await Chat.findById(chatId);

  if (!chat) throw NotFound("Chat not found");

  if (!chat.isGroup) {
    throw BadRequest("This is not a group chat");
  }

  // Only creator can delete
  if (chat.createdBy?.toString() !== userId) {
    throw Forbidden("Only creator can delete this group");
  }

  // Prevent double deletion
  if (chat.isDeleted) {
    throw BadRequest("Group already deleted");
  }

  // Soft delete
  chat.isDeleted = true;
  chat.deletedAt = new Date();
  chat.deletedBy = new mongoose.Types.ObjectId(userId);

  await chat.save();

  return {
    message: "Group deleted successfully",
    deleted: true,
  };
};

/**
 * Transfers group ownership to another member.
 *
 * - Only current owner can transfer.
 * - New owner must be an existing member.
 * - New owner is promoted to admin if needed.
 *
 * @param userId - Current owner ID
 * @param chatId - Group chat ID
 * @param newOwnerId - Member to become new owner
 *
 * @throws NotFound | BadRequest | Forbidden
 */

export const transferOwnershipFunction = async (
  userId: string,
  chatId: string,
  newOwnerId: string,
) => {
  const chat = await Chat.findById(chatId);

  if (!chat) throw NotFound("Chat not found");

  if (!chat.isGroup) {
    throw BadRequest("This is not a group chat");
  }

  // Only current owner can transfer
  if (chat.createdBy?.toString() !== userId) {
    throw Forbidden("Only group owner can transfer ownership");
  }

  // New owner must be different
  if (userId === newOwnerId) {
    throw BadRequest("You are already the owner");
  }

  // New owner must be a member
  const isMember = chat.members.some(
    (member) => member.toString() === newOwnerId,
  );

  if (!isMember) {
    throw BadRequest("New owner must be a group member");
  }

  // Assign new owner
  chat.createdBy = new mongoose.Types.ObjectId(newOwnerId);

  // Ensure new owner is admin
  const isAlreadyAdmin = chat.admin.some(
    (admin) => admin.toString() === newOwnerId,
  );

  if (!isAlreadyAdmin) {
    chat.admin.push(new mongoose.Types.ObjectId(newOwnerId));
  }

  await chat.save();
  return populateGroup(chat._id.toString());
};
