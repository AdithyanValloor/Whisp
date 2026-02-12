import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/authRequest.js";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  fetchRequests,
  getFriendList,
  rejectFriendRequest,
  removeFriend as removeFriendService,
  sendFriendRequest,
} from "../services/friend.services.js";
import {
  BadRequest,
  Unauthorized,
} from "../../../utils/errors/httpErrors.js";

/**
 * ------------------------------------------------------------------
 * Fetch Friend List
 * ------------------------------------------------------------------
 * @desc    Retrieves the authenticated user's friend list
 * @route   GET /api/friends
 * @access  Private
 */
export const getAllFriends = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const friendList = await getFriendList(userId);

    res.status(200).json({
      message: "Friend list fetched",
      friendList,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Send Friend Request
 * ------------------------------------------------------------------
 * @desc    Sends a friend request to another user by username
 * @route   POST /api/friends
 * @access  Private
 */
export const addFriend = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username }: { username?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!username) throw BadRequest("Username is required");

    const request = await sendFriendRequest(userId, username);

    res.status(200).json({
      message: "Friend request sent",
      request,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Fetch Incoming & Outgoing Friend Requests
 * ------------------------------------------------------------------
 * @desc    Retrieves all pending friend requests
 * @route   GET /api/friends/requests
 * @access  Private
 */
export const getAllRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { incoming, outgoing } = await fetchRequests(userId);

    res.status(200).json({
      message: "Friend requests fetched",
      incoming,
      outgoing,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Accept Friend Request
 * ------------------------------------------------------------------
 * @desc    Accepts a pending friend request
 * @route   POST /api/friends/accept
 * @access  Private
 */
export const acceptReq = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }: { id?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!id) throw BadRequest("Request ID is required");

    const request = await acceptFriendRequest(id, userId);

    res.status(200).json({
      message: "Friend request accepted",
      request,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Reject Friend Request
 * ------------------------------------------------------------------
 * @desc    Rejects a pending friend request
 * @route   POST /api/friends/reject
 * @access  Private
 */
export const rejectReq = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }: { id?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!id) throw BadRequest("Request ID is required");

    const request = await rejectFriendRequest(id, userId);

    res.status(200).json({
      message: "Friend request rejected",
      request,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Remove Friend
 * ------------------------------------------------------------------
 * @desc    Removes an existing friend relationship
 * @route   DELETE /api/friends
 * @access  Private
 */
export const removeFriend = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }: { id?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!id) throw BadRequest("Friend ID is required");

    await removeFriendService(userId, id);

    res.status(200).json({
      message: "Friend removed successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ------------------------------------------------------------------
 * Cancel Sent Friend Request
 * ------------------------------------------------------------------
 * @desc    Cancels a previously sent friend request
 * @route   POST /api/friends/cancel
 * @access  Private
 */
export const cancelReq = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }: { id?: string } = req.body;
    const userId = req.user?.id;

    if (!userId) throw Unauthorized();
    if (!id) throw BadRequest("Request ID is required");

    const response = await cancelFriendRequest(id, userId);

    res.status(200).json({
      message: "Friend request canceled",
      response,
    });
  } catch (err) {
    next(err);
  }
};
