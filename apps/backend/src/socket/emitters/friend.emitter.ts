/**
 * ------------------------------------------------------------------
 * Whisp Chat Backend - Friend Socket Emitters
 * ------------------------------------------------------------------
 *
 * Purpose:
 *  Centralized real-time emitters for friend-related events.
 *
 * Why Emitters Exist:
 *  - Decouples REST logic from Socket.IO implementation
 *  - Prevents direct socket usage inside controllers
 *  - Improves maintainability and scalability
 *  - Makes it easier to refactor event names later
 *
 * Architecture Flow:
 *  REST Controller
 *      ↓
 *  Service Layer
 *      ↓
 *  Friend Emitter (this file)
 *      ↓
 *  getIO().to(userId).emit(...)
 *
 * Important:
 *  - Uses userId-based private rooms
 *  - Each user joins a room named after their userId
 *  - Allows direct targeted event emission
 */

import { getIO } from "../io.js";
import type { FriendRequestSocketPayload } from "../../services/user/types/friend.socket.js";

/**
 * Emits when a user RECEIVES a friend request.
 *
 * Effect on receiver:
 *  → Adds request to incoming[]
 *
 * @param userId - Receiver user ID (room name)
 * @param payload - Friend request socket payload
 */
export const emitFriendRequestReceived = (
  userId: string,
  payload: FriendRequestSocketPayload
): void => {
  getIO().to(userId).emit("friend_request_received", payload);
};

/**
 * Emits when a user SENDS a friend request.
 *
 * Effect on sender:
 *  → Adds request to outgoing[]
 *
 * @param userId - Sender user ID
 * @param payload - Friend request socket payload
 */
export const emitFriendRequestSent = (
  userId: string,
  payload: FriendRequestSocketPayload
): void => {
  getIO().to(userId).emit("friend_request_sent", payload);
};

/**
 * Emits when a friend request is ACCEPTED.
 *
 * Effect:
 *  → Both users update their friends list
 *
 * @param userId - Target user ID
 * @param payload - Friend request socket payload
 */
export const emitFriendRequestAccepted = (
  userId: string,
  payload: FriendRequestSocketPayload
): void => {
  const io = getIO();

  // Debug: Check if room exists
  const room = io.sockets.adapter.rooms.get(userId);
  console.log("🎯 Emitting friend_request_accepted to:", userId);
  console.log("🎯 Room members:", room ? Array.from(room) : "Room not found!");

  io.to(userId).emit("friend_request_accepted", payload);
};

/**
 * Emits when a friend request is REJECTED.
 *
 * Effect:
 *  → Sender removes request from outgoing[]
 *
 * @param userId - Sender user ID
 * @param requestId - ID of the rejected request
 */
export const emitFriendRequestRejected = (
  userId: string,
  requestId: string
): void => {
  getIO().to(userId).emit("friend_request_rejected", requestId);
};

/**
 * Emits when a friend request is CANCELLED.
 *
 * Effect:
 *  → Receiver removes request from incoming[]
 *
 * @param userId - Receiver user ID
 * @param requestId - ID of the cancelled request
 */
export const emitFriendRequestCancelled = (
  userId: string,
  requestId: string
): void => {
  getIO().to(userId).emit("friend_request_cancelled", requestId);
};

/**
 * Emits when a friend is REMOVED.
 *
 * Effect:
 *  → Both users remove each other from friends list
 *
 * @param userId - Target user ID
 * @param friendId - ID of removed friend
 */
export const emitFriendRemoved = (
  userId: string,
  friendId: string
): void => {
  getIO().to(userId).emit("friend_removed", { friendId });
};