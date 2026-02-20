import mongoose from "mongoose";
import { Chat } from "../models/chat.model.js";
import {
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
} from "../../../utils/errors/httpErrors.js";

/**
 * Populates a group chat with all required related fields.
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
 * Soft deletion helper
 */
const softDeleteGroup = async (
  chat: any,
  userId: string,
  message = "Group deleted successfully"
) => {
  if (chat.isDeleted) {
    return { message: "Group already deleted", deleted: true };
  }

  chat.isDeleted = true;
  chat.deletedAt = new Date();
  chat.deletedBy = new mongoose.Types.ObjectId(userId);

  await chat.save();

  return { message, deleted: true };
};

/**
 * ------------------------------------------------------------------
 * Create Group Chat
 * ------------------------------------------------------------------
 * @desc    Creates a new group chat and assigns creator as admin.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   group:     populated group document,
 *   memberIds: all member ID strings (for emitGroupCreated)
 * }
 */
export const createGroupChatFunction = async (
  name: string,
  userIds: string[],
  currentUserId: string
) => {
  if (!name || !Array.isArray(userIds) || userIds.length < 1) {
    throw BadRequest("Group name and at least one member are required");
  }

  const members = Array.from(new Set([...userIds, currentUserId]));

  const groupChat = await Chat.create({
    chatName: name,
    members,
    isGroup: true,
    admin: [currentUserId],
    createdBy: currentUserId,
  });

  const group = await populateGroup(groupChat._id.toString());

  return {
    group,
    memberIds: members,
  };
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
 * @desc    Adds new members to a group chat.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   group:        populated group document,
 *   newMemberIds: IDs of members that were actually added (for emitMembersAdded)
 * }
 *
 * Rules:
 * - Only admins or creator can add members
 * - Existing members are ignored (deduplicated)
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

  if (!isAdmin) throw Forbidden("Only admins can add new members");

  const newMemberIds = members.filter(
    (id) => !chat.members.some((m) => m.toString() === id)
  );

  chat.members.push(...newMemberIds.map((id) => new mongoose.Types.ObjectId(id)));
  await chat.save();

  const group = await populateGroup(chat._id.toString());

  return {
    group,
    newMemberIds,
  };
};

/**
 * ------------------------------------------------------------------
 * Remove Member from Group
 * ------------------------------------------------------------------
 * @desc    Removes a member from a group chat.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   group:           populated group document,
 *   removedMemberId: ID of the removed member (for emitMemberRemoved)
 * }
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

  if (!isAdmin) throw Forbidden("Only admins can remove members");

  if (chat.createdBy?.toString() === memberId) {
    throw BadRequest("Creator can't be removed");
  }

  chat.members = chat.members.filter((id) => id.toString() !== memberId);
  chat.admin = chat.admin.filter((id) => id.toString() !== memberId);

  await chat.save();

  const group = await populateGroup(chat._id.toString());

  return {
    group,
    removedMemberId: memberId,
  };
};

/**
 * ------------------------------------------------------------------
 * Toggle Admin Role
 * ------------------------------------------------------------------
 * @desc    Promotes or demotes a group member as admin.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   group:     populated group document,
 *   memberId:  ID of the affected member (for emitAdminToggled),
 *   isAdmin:   resulting admin state
 * }
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
    chat.admin = chat.admin.filter((id) => id.toString() !== memberId);
  }

  await chat.save();

  const group = await populateGroup(chat._id.toString());

  return {
    group,
    memberId,
    isAdmin: makeAdmin,
  };
};

/**
 * ------------------------------------------------------------------
 * Leave Group
 * ------------------------------------------------------------------
 * @desc    Allows a user to leave a group chat.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   message:    status message,
 *   deleted:    whether the group was soft-deleted,
 *   memberIds?: all member ID strings before leaving (only if deleted, for emitGroupDeleted),
 *   chatId:     group ID string (for emitMemberLeft / emitGroupDeleted)
 * }
 *
 * Behavior:
 * - Owner is only member → soft deletes the group
 * - Owner with others present → blocked (must transfer first)
 * - Normal member → removed from members & admins
 */
type LeaveGroupResult =
  | { message: string; deleted: true;  chatId: string; memberIds: string[] }
  | { message: string; deleted: false; chatId: string };

export const leaveGroupFunction = async (
  userId: string,
  chatId: string
): Promise<LeaveGroupResult> => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  if (!chat.isGroup) throw BadRequest("This is not a group chat");

  const isOwner = chat.createdBy?.toString() === userId;
  const memberCount = chat.members.length;

  // Owner is only member → soft delete
  if (isOwner && memberCount === 1) {
    const memberIds = chat.members.map((m) => m.toString());
    const result = await softDeleteGroup(chat, userId, "Group deleted (last member left)");
    return { ...result, chatId, memberIds };
  }

  // Owner with others → block
  if (isOwner && memberCount > 1) {
    throw Forbidden("Transfer ownership before leaving the group");
  }

  // Normal member leaves
  chat.members = chat.members.filter((id) => id.toString() !== userId);
  chat.admin = chat.admin.filter((id) => id.toString() !== userId);

  await chat.save();

  return {
    message: "You left the group",
    deleted: false,
    chatId,
  };
};

/**
 * ------------------------------------------------------------------
 * Delete Group
 * ------------------------------------------------------------------
 * @desc    Soft deletes a group chat.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   message:   status message,
 *   deleted:   true,
 *   chatId:    group ID string,
 *   memberIds: all member ID strings before deletion (for emitGroupDeleted)
 * }
 *
 * Rules:
 * - Only the group owner (createdBy) can delete
 */
export const deleteGroupFunction = async (userId: string, chatId: string) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  if (!chat.isGroup) throw BadRequest("This is not a group chat");

  if (chat.createdBy?.toString() !== userId) {
    throw Forbidden("Only creator can delete this group");
  }

  // Capture member IDs before deletion
  const memberIds = chat.members.map((m) => m.toString());

  const result = await softDeleteGroup(chat, userId);

  return {
    ...result,
    chatId,
    memberIds,
  };
};

/**
 * ------------------------------------------------------------------
 * Transfer Ownership
 * ------------------------------------------------------------------
 * @desc    Transfers group ownership to another member.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   group:      populated group document,
 *   newOwnerId: new owner ID string (for emitOwnershipTransferred)
 * }
 *
 * Rules:
 * - Only current owner can transfer
 * - New owner must be an existing member
 */
export const transferOwnershipFunction = async (
  userId: string,
  chatId: string,
  newOwnerId: string
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw NotFound("Chat not found");

  if (!chat.isGroup) throw BadRequest("This is not a group chat");

  if (chat.createdBy?.toString() !== userId) {
    throw Forbidden("Only group owner can transfer ownership");
  }

  if (userId === newOwnerId) throw BadRequest("You are already the owner");

  const isMember = chat.members.some((m) => m.toString() === newOwnerId);
  if (!isMember) throw BadRequest("New owner must be a group member");

  chat.createdBy = new mongoose.Types.ObjectId(newOwnerId);

  if (!chat.admin.some((a) => a.toString() === newOwnerId)) {
    chat.admin.push(new mongoose.Types.ObjectId(newOwnerId));
  }

  await chat.save();

  const group = await populateGroup(chat._id.toString());

  return {
    group,
    newOwnerId,
  };
};