// socket/emitters/friend.emitter.ts
import { getIO } from "../io.js";
import type { FriendRequestSocketPayload } from "../../services/user/types/friend.socket.js";

/**
 * Emits when a user RECEIVES a friend request
 * → receiver adds to incoming[]
 */
export const emitFriendRequestReceived = (
  userId: string,
  payload: FriendRequestSocketPayload
): void => {
  getIO().to(userId).emit("friend_request_received", payload);
};

/**
 * Emits when a user SENDS a friend request
 * → sender adds to outgoing[]
 */
export const emitFriendRequestSent = (
  userId: string,
  payload: FriendRequestSocketPayload
): void => {
  getIO().to(userId).emit("friend_request_sent", payload);
};

/**
 * Emits when a request is ACCEPTED
 * → both users become friends
 */
export const emitFriendRequestAccepted = (
  userId: string,
  payload: FriendRequestSocketPayload
): void => {
  console.log("🎯 ACCEPTED REQ EMITTER FIRED");
  console.log("🎯 Emitting to userId:", userId);
  console.log("🎯 Payload:", payload);
  
  const io = getIO();
  
  // Check if anyone is in this room
  const room = io.sockets.adapter.rooms.get(userId);
  console.log("🎯 Room members:", room ? Array.from(room) : "Room not found!");
  
  io.to(userId).emit("friend_request_accepted", payload);
};

/**
 * Emits when a request is REJECTED
 * → sender removes from outgoing[]
 */
export const emitFriendRequestRejected = (
  userId: string,
  requestId: string
): void => {
  getIO().to(userId).emit("friend_request_rejected", requestId);
};

/**
 * Emits when a request is CANCELLED
 * → receiver removes from incoming[]
 */
export const emitFriendRequestCancelled = (
  userId: string,
  requestId: string
): void => {
  getIO().to(userId).emit("friend_request_cancelled", requestId);
};

/**
 * Emits when a friend is REMOVED
 * → both users remove friend
 */
export const emitFriendRemoved = (
  userId: string,
  friendId: string
): void => {
  getIO().to(userId).emit("friend_removed", { friendId });
};