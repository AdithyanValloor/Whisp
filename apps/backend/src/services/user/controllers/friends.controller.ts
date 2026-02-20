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
import {
  emitFriendRemoved,
  emitFriendRequestAccepted,
  emitFriendRequestCancelled,
  emitFriendRequestReceived,
  emitFriendRequestRejected,
  emitFriendRequestSent,
} from "../../../socket/emitters/friend.emitter.js";

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
 *
 * Emits:
 * - `friend_request_received` to recipient
 * - `friend_request_sent` to sender
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

    const { request, payload, toUserId } = await sendFriendRequest(
      userId,
      username
    );

    emitFriendRequestReceived(toUserId, payload);
    emitFriendRequestSent(userId, payload);

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
 *
 * Emits:
 * - `friend_request_accepted` to both sender and recipient
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

    const { request, payload, fromUserId, toUserId } =
      await acceptFriendRequest(id, userId);

    emitFriendRequestAccepted(fromUserId, payload);
    emitFriendRequestAccepted(toUserId, payload);

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
 *
 * Emits:
 * - `friend_request_rejected` to sender
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

    const { request, fromUserId, requestId } = await rejectFriendRequest(
      id,
      userId
    );

    emitFriendRequestRejected(fromUserId, requestId);

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
 *
 * Emits:
 * - `friend_removed` to both users
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

    emitFriendRemoved(userId, id);
    emitFriendRemoved(id, userId);

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
 *
 * Emits:
 * - `friend_request_cancelled` to recipient
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

    const { toUserId, requestId } = await cancelFriendRequest(id, userId);

    emitFriendRequestCancelled(toUserId, requestId);

    res.status(200).json({
      message: "Friend request canceled",
    });
  } catch (err) {
    next(err);
  }
};