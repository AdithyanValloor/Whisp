import { Response } from "express";
import {
  addMembersFunction,
  createGroupChatFunction,
  getGroupByIdFunction,
  leaveGroupFunction,
  removeMembersFunction,
  toggleAdminFunction,
} from "../services/group.services.js";
import { handleChatError } from "../errors/chatErrors.js";
import { AuthRequest } from "../../user/types/authRequest.js";
import {
  BadRequest,
  Unauthorized,
} from "../../../utils/errors/httpErrors.js";

/**
 * ------------------------------------------------------------------
 * Create Group Chat
 * ------------------------------------------------------------------
 * @desc    Creates a new group chat with the provided members
 * @route   POST /api/group
 * @access  Private (Authenticated users only)
 *
 * Notes:
 * - The requesting user becomes the group creator & admin
 * - At least one additional member is required
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

    const groupChat = await createGroupChatFunction(
      name,
      userIds,
      currentUserId
    );

    res.status(201).json({
      message: "Group chat created",
      groupChat,
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

    const chat = await addMembersFunction(chatId, members, userId);

    res.status(200).json({
      message: "Members added successfully",
      chat,
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

    const chat = await removeMembersFunction(userId, chatId, member);

    res.status(200).json({
      message: "Member removed successfully",
      chat,
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
    }: {
      chatId?: string;
      member?: string;
      makeAdmin?: boolean;
    } = req.body;

    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!chatId || !member || typeof makeAdmin !== "boolean") {
      throw BadRequest("Invalid admin toggle payload");
    }

    const chat = await toggleAdminFunction(
      userId,
      chatId,
      member,
      makeAdmin
    );

    res.status(200).json({
      message: makeAdmin ? "User promoted to admin" : "User demoted",
      chat,
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
 * Notes:
 * - If the creator leaves, ownership is reassigned or group deleted
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

    const response = await leaveGroupFunction(userId, chatId);

    res.status(200).json(response);
  } catch (error) {
    handleChatError(res, error as Error);
  }
};
