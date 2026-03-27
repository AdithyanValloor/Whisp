import { FriendRequestModel } from "../models/friendRequest.model.js";
import { UserModel } from "../models/user.model.js";
import {
  BadRequest,
  Unauthorized,
  NotFound,
  Forbidden,
} from "../../../utils/errors/httpErrors.js";

import { toFriendRequestSocketPayload } from "../utils/normalizeFriendRequest.js";
import { BlockModel } from "../models/block.model.js";
import {
  createInboxNotification,
  deleteNotificationByFriendRequest,
} from "../../notifications/services/inboxNotification.service.js";
import {
  emitNotificationRemoved,
  emitUnreadNotificationCount,
} from "../../../socket/emitters/notification.emitters.js";
import { InboxNotificationModel } from "../../notifications/models/inboxNotification.model.js";

/**
 * ------------------------------------------------------------------
 * Get Friend List
 * ------------------------------------------------------------------
 * @desc    Fetches the authenticated user's friend list
 */
export const getFriendList = async (userId: string) => {
  if (!userId) throw Unauthorized();

  const user = await UserModel.findById(userId).populate(
    "friendList",
    "displayName username email profilePicture",
  );

  if (!user) throw NotFound("User not found");

  return user.friendList;
};

/**
 * ------------------------------------------------------------------
 * Fetch Incoming & Outgoing Friend Requests
 * ------------------------------------------------------------------
 * @desc    Retrieves all pending friend requests for a user
 */
export const fetchRequests = async (userId: string) => {
  if (!userId) throw Unauthorized();

  const incoming = await FriendRequestModel.find({
    to: userId,
    status: "pending",
  }).populate("from", "displayName username email profilePicture");

  const outgoing = await FriendRequestModel.find({
    from: userId,
    status: "pending",
  }).populate("to", "displayName username email profilePicture");

  return { incoming, outgoing };
};

/**
 * ------------------------------------------------------------------
 * Send Friend Request
 * ------------------------------------------------------------------
 * @desc    Sends a friend request to another user by username
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   request:  created request document,
 *   payload:  normalized socket payload,
 *   toUserId: recipient user ID string
 * }
 *
 * Validation Rules:
 * - Cannot send request to yourself
 * - Cannot send request to existing friend
 * - Cannot send duplicate pending request
 */
export const sendFriendRequest = async (
  fromUserId: string,
  toUsername: string,
) => {
  if (!fromUserId || !toUsername) {
    throw BadRequest("Invalid request parameters");
  }

  const fromUser = await UserModel.findById(fromUserId);
  if (!fromUser) throw Unauthorized();

  const toUser = await UserModel.findOne({ username: toUsername });
  if (!toUser) throw NotFound("User not found");

  // Self-check first — most obvious validation
  if (fromUser.id === toUser.id) {
    throw BadRequest("Cannot send friend request to yourself");
  }

  // Already friends
  if (fromUser.friendList.some((id) => id.toString() === toUser.id)) {
    throw BadRequest("Already friends");
  }
  // Block check
  const blockExists = await BlockModel.findOne({
    $or: [
      { blocker: fromUserId, blocked: toUser.id },
      { blocker: toUser.id, blocked: fromUserId },
    ],
  });

  if (blockExists) {
    throw BadRequest("Cannot send friend request to this user");
  }

  // Privacy check — only reached by legitimate new requests
  if (toUser.privacy?.friendRequests === "nobody") {
    throw BadRequest("This user is not accepting friend requests");
  }

  if (toUser.privacy?.friendRequests === "friends") {
    // fromUser is already fetched, reuse its friendList
    const senderFriendSet = new Set(
      fromUser.friendList.map((id) => id.toString()),
    );

    const hasMutualFriend = toUser.friendList.some((id) =>
      senderFriendSet.has(id.toString()),
    );

    if (!hasMutualFriend) {
      throw BadRequest(
        "This user only accepts requests from friends of friends",
      );
    }
  }

  // Duplicate request check
  const existingRequest = await FriendRequestModel.findOne({
    from: fromUserId,
    to: toUser.id,
    status: "pending",
  });

  if (existingRequest) {
    throw BadRequest("Friend request already sent");
  }

  const request = await FriendRequestModel.create({
    from: fromUserId,
    to: toUser.id,
    status: "pending",
  });

  await createInboxNotification({
    userId: toUser.id,
    actorId: fromUserId,
    type: "friend_request_received",
    friendRequestId: request.id,
  });

  const populated = await request.populate([
    { path: "from", select: "username displayName profilePicture" },
    { path: "to", select: "username displayName profilePicture" },
  ]);

  return {
    request,
    payload: toFriendRequestSocketPayload(populated),
    toUserId: toUser.id.toString(),
  };
};
/**
 * ------------------------------------------------------------------
 * Accept Friend Request
 * ------------------------------------------------------------------
 * @desc    Accepts a pending friend request.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   request:    updated request document,
 *   payload:    normalized socket payload,
 *   fromUserId: sender ID string,
 *   toUserId:   recipient ID string
 * }
 *
 * Rules:
 * - Only recipient can accept
 * - Friendship is added bidirectionally
 */
export const acceptFriendRequest = async (
  requestId: string,
  userId: string,
) => {
  const request = await FriendRequestModel.findById(requestId);
  if (!request) throw NotFound("Request not found");

  if (request.to.toString() !== userId) {
    throw Forbidden("Not authorized to accept this request");
  }

  const fromUserId = request.from.toString();
  const toUserId = request.to.toString();

  await UserModel.findByIdAndUpdate(userId, {
    $addToSet: { friendList: request.from },
  });

  await UserModel.findByIdAndUpdate(request.from, {
    $addToSet: { friendList: request.to },
  });

  request.status = "accepted";
  await request.save();

  await createInboxNotification({
    userId: fromUserId,
    actorId: toUserId,
    type: "friend_request_accepted",
  });

  const populated = await request.populate([
    { path: "from", select: "username displayName profilePicture" },
    { path: "to", select: "username displayName profilePicture" },
  ]);

  return {
    request,
    payload: toFriendRequestSocketPayload(populated),
    fromUserId,
    toUserId,
  };
};

/**
 * ------------------------------------------------------------------
 * Reject Friend Request
 * ------------------------------------------------------------------
 * @desc    Rejects a pending friend request.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   request:    updated request document,
 *   fromUserId: sender ID string (for emitting rejection)
 *   requestId:  request ID string
 * }
 */
export const rejectFriendRequest = async (
  requestId: string,
  userId: string,
) => {
  const request = await FriendRequestModel.findById(requestId);
  if (!request) throw NotFound("Request not found");

  if (request.to.toString() !== userId) {
    throw Forbidden("Not authorized to reject this request");
  }

  request.status = "rejected";
  await request.save();

  return {
    request,
    fromUserId: request.from.toString(),
    requestId: request._id.toString(),
  };
};

/**
 * ------------------------------------------------------------------
 * Remove Friend
 * ------------------------------------------------------------------
 * @desc    Removes an existing friendship (bidirectional).
 *          Socket emissions are handled by the controller.
 */
export const removeFriend = async (userId: string, friendId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw Unauthorized();

  const friend = await UserModel.findById(friendId);
  if (!friend) throw NotFound("User not found");

  if (!user.friendList.includes(friend.id)) {
    throw BadRequest("Users are not friends");
  }

  await UserModel.findByIdAndUpdate(userId, {
    $pull: { friendList: friend._id },
  });

  await UserModel.findByIdAndUpdate(friendId, {
    $pull: { friendList: user._id },
  });

  return true;
};

/**
 * ------------------------------------------------------------------
 * Cancel Sent Friend Request
 * ------------------------------------------------------------------
 * @desc    Cancels a pending friend request sent by the user.
 *          Socket emissions are handled by the controller.
 *
 * @returns {
 *   toUserId:  recipient ID string (for emitting cancellation),
 *   requestId: request ID string
 * }
 */
export const cancelFriendRequest = async (
  requestId: string,
  userId: string,
) => {
  const request = await FriendRequestModel.findById(requestId);
  if (!request) throw NotFound("Request not found");

  if (request.from.toString() !== userId) {
    throw Forbidden("Not authorized to cancel this request");
  }

  if (request.status !== "pending") {
    throw BadRequest("Cannot cancel processed request");
  }

  const toUserId = request.to.toString();
  const reqId = request._id.toString();

  const deleted = await deleteNotificationByFriendRequest(reqId);

  if (deleted) {
    emitNotificationRemoved(toUserId, reqId);

    const freshCount = await InboxNotificationModel.countDocuments({
      user: deleted.userId,
      read: false,
    });
    emitUnreadNotificationCount(deleted.userId, freshCount);
  }
  await request.deleteOne();

  return { toUserId, requestId: reqId };
};
