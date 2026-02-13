/**
 * Registers connection-level socket handlers.
 *
 * Uses userId-based private rooms for targeted emits and
 * chatId rooms for group broadcasting.
 */

import type { Socket } from "socket.io";
import { userJoined, heartbeat, getOnlineUsers } from "../presence.js";

export const registerConnectionHandlers = (socket: Socket): void => {
  // User joins their private room (multi-device safe)
  socket.on("join", (userId: string) => {
    socket.join(userId);
    userJoined(userId);

    socket.emit("online_users", getOnlineUsers());
  });

  // Join a group/chat room
  socket.on("joinGroup", (chatId: string) => {
    socket.join(chatId);
  });

  // Heartbeat to maintain presence
  socket.on("heartbeat", ({ userId }: { userId: string }) => {
    heartbeat(userId);
  });
};