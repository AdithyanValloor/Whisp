import { Response } from "express";
import {
  addMembersFunction,
  createGroupChatFunction,
  deleteGroupFunction,
  getGroupByIdFunction,
  leaveGroupFunction,
  removeMembersFunction,
  toggleAdminFunction,
  transferOwnershipFunction,
} from "../services/group.services.js";
import { handleChatError } from "../errors/chatErrors.js";
import { AuthRequest } from "../../user/types/authRequest.js";
import {
  BadRequest,
  Unauthorized,
} from "../../../utils/errors/httpErrors.js";
import {
  emitAdminToggled,
  emitGroupCreated,
  emitGroupDeleted,
  emitGroupUpdated,
  emitMemberLeft,
  emitMemberRemoved,
  emitMembersAdded,
  emitOwnershipTransferred,
} from "../../../socket/emitters/group.emitter.js";

/**
 * ------------------------------------------------------------------
 * Create Group Chat
 * ------------------------------------------------------------------
 * @desc    Creates a new group chat with the provided members
 * @route   POST /api/group
 * @access  Private (Authenticated users only)
 *
 * Emits:
 * - `group_created` to each member individually
 */
export const createGroupChat = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, userIds }: { name?: string; userIds?: string[] } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) throw Unauthorized();
    if (!name || !Array.isArray(userIds) || userIds.length === 0) {
      throw BadRequest("Group name and member list are required");
    }

    const { group, memberIds } = await createGroupChatFunction(
      name,
      userIds,
      currentUserId
    );

    emitGroupCreated(group, memberIds);

    res.status(201).json({
      message: "Group chat created",
      groupChat: group,
    });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};

/**
 * ------------------------------------------------------------------
 * Get Group By ID
 * ------------------------------------------------------------------
 * @desc    Fetch a single group chat by ID
 * @route   GET /api/group/:id
 * @access  Private (Group members only)
 */
export const getGroupById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!id) throw BadRequest("Group ID is required");

    const group = await getGroupByIdFunction(userId, id);

    res.status(200).json({ group });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};

/**
 * ------------------------------------------------------------------
 * Add Members to Group
 * ------------------------------------------------------------------
 * @desc    Adds new members to an existing group chat
 * @route   POST /api/group/members
 * @access  Private (Admins only)
 *
 * Emits:
 * - `members_added` to the group room
 * - `added_to_group` to each newly added member individually
 */
export const addMembers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId, members }: { chatId?: string; members?: string[] } =
      req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!chatId || !Array.isArray(members) || members.length === 0) {
      throw BadRequest("Chat ID and members array are required");
    }

    const { group, newMemberIds } = await addMembersFunction(
      chatId,
      members,
      userId
    );

    emitMembersAdded(chatId, group, newMemberIds);

    res.status(200).json({
      message: "Members added successfully",
      chat: group,
    });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};

/**
 * ------------------------------------------------------------------
 * Remove Member from Group
 * ------------------------------------------------------------------
 * @desc    Removes a member from a group chat
 * @route   DELETE /api/group/members
 * @access  Private (Admins only)
 *
 * Emits:
 * - `member_removed` to the group room
 * - `removed_from_group` to the removed user
 */
export const removeMembers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId, member }: { chatId?: string; member?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!chatId || !member) {
      throw BadRequest("Chat ID and member ID are required");
    }

    const { group, removedMemberId } = await removeMembersFunction(
      userId,
      chatId,
      member
    );

    emitMemberRemoved(chatId, removedMemberId);

    // Broadcast updated group data to remaining members
    emitGroupUpdated(chatId, group);

    res.status(200).json({
      message: "Member removed successfully",
      chat: group,
    });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};

/**
 * ------------------------------------------------------------------
 * Toggle Admin Role
 * ------------------------------------------------------------------
 * @desc    Promotes or demotes a member as group admin
 * @route   PATCH /api/group/admin
 * @access  Private (Group creator only)
 *
 * Emits:
 * - `admin_toggled` to the group room
 */
export const toggleAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      chatId,
      member,
      makeAdmin,
    }: { chatId?: string; member?: string; makeAdmin?: boolean } = req.body;

    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!chatId || !member || typeof makeAdmin !== "boolean") {
      throw BadRequest("Invalid admin toggle payload");
    }

    const { group, memberId, isAdmin } = await toggleAdminFunction(
      userId,
      chatId,
      member,
      makeAdmin
    );

    emitAdminToggled(chatId, memberId, isAdmin);

    res.status(200).json({
      message: makeAdmin ? "User promoted to admin" : "User demoted",
      chat: group,
    });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};

/**
 * ------------------------------------------------------------------
 * Leave Group
 * ------------------------------------------------------------------
 * @desc    Allows a user to leave a group chat
 * @route   POST /api/group/leave
 * @access  Private (Group members only)
 *
 * Emits:
 * - `group_deleted` to all members individually  (if group was deleted)
 * - `member_left` to group room + leaver         (if normal leave)
 */
export const leaveGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId }: { chatId?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!chatId) throw BadRequest("Chat ID is required");

    const result = await leaveGroupFunction(userId, chatId);

    if (result.deleted) {
      emitGroupDeleted(result.chatId, result.memberIds!);
    } else {
      emitMemberLeft(result.chatId, userId);
    }

    res.status(200).json({
      message: result.message,
      deleted: result.deleted,
    });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};

/**
 * ------------------------------------------------------------------
 * Delete Group
 * ------------------------------------------------------------------
 * @desc    Allows creator to delete a group chat
 * @route   POST /api/group/delete
 * @access  Private (Owner only)
 *
 * Emits:
 * - `group_deleted` to all members individually
 */
export const deleteGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId }: { chatId?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!chatId) throw BadRequest("Chat ID is required");

    const { chatId: deletedChatId, memberIds } = await deleteGroupFunction(
      userId,
      chatId
    );

    emitGroupDeleted(deletedChatId, memberIds);

    res.status(200).json({
      message: "Group deleted successfully",
    });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};

/**
 * ------------------------------------------------------------------
 * Transfer Ownership
 * ------------------------------------------------------------------
 * @desc    Allows group creator to transfer ownership to another member
 * @route   PATCH /api/group/transfer-ownership
 * @access  Private (Owner only)
 *
 * Emits:
 * - `ownership_transferred` to the group room
 */
export const transferOwnership = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { chatId, newOwnerId }: { chatId?: string; newOwnerId?: string } =
      req.body;

    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!chatId || !newOwnerId) {
      throw BadRequest("Chat ID and new owner ID are required");
    }

    const { group, newOwnerId: resolvedNewOwnerId } =
      await transferOwnershipFunction(userId, chatId, newOwnerId);

    emitOwnershipTransferred(chatId, resolvedNewOwnerId);

    res.status(200).json({
      message: "Ownership transferred successfully",
      chat: group,
    });
  } catch (error) {
    handleChatError(res, error as Error);
  }
};