// src/socket/handlers/connection.ts
import type { Socket } from "socket.io";
import { userJoined, heartbeat, getOnlineUsers } from "../presence.js";

export const registerConnectionHandlers = (socket: Socket) => {
  socket.on("join", (userId: string) => {
    socket.join(userId);
    userJoined(userId);
    socket.emit("online_users", getOnlineUsers());
  });

  socket.on("joinGroup", (chatId: string) => {
    socket.join(chatId);
  });

  socket.on("heartbeat", ({ userId }: { userId: string }) => {
    heartbeat(userId);
  });
};