import type { Socket } from "socket.io";
import { userJoined, heartbeat, getOnlineUsers } from "../presence.js";
import { Chat } from "../../services/chat/models/chat.model.js";


export const registerConnectionHandlers = (socket: Socket): void => {

  /**
   * ---------------------------------------------------
   * Join Private User Room
   * ---------------------------------------------------
   */
  socket.on("join", async (userId: string) => {
    if (!userId) return;

    socket.join(userId);
    userJoined(userId);

    socket.emit("online_users", getOnlineUsers());
  });

  /**
   * ---------------------------------------------------
   * Join Chat Room (SECURE)
   * ---------------------------------------------------
   */
  socket.on("joinGroup", async ({ chatId, userId }) => {
    if (!chatId || !userId) return;

    const chat = await Chat.findOne({
      _id: chatId,
      members: userId,
      isDeleted: false,
    }).select("_id");

    if (!chat) return;

    socket.join(chatId);
  });

  /**
   * ---------------------------------------------------
   * Leave Chat Room
   * ---------------------------------------------------
   */
  socket.on("leaveGroup", (chatId: string) => {
    if (!chatId) return;
    socket.leave(chatId);
  });

  /**
   * ---------------------------------------------------
   * Heartbeat
   * ---------------------------------------------------
   */
  socket.on("heartbeat", ({ userId }: { userId: string }) => {
    if (!userId) return;
    heartbeat(userId);
  });
};