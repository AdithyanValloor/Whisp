/**
 * Registers typing-related socket handlers.
 *
 * Re-broadcasts typing state to the room excluding the sender.
 */

import type { Socket } from "socket.io";

export const registerTypingHandlers = (socket: Socket): void => {
  socket.on("typing", (payload) => {
    socket.to(payload.roomId).emit("typing", payload);
  });

  socket.on("stopTyping", (payload) => {
    socket.to(payload.roomId).emit("stopTyping", payload);
  });
};