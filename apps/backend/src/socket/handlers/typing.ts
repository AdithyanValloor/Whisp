import type { Socket } from "socket.io";

export const registerTypingHandlers = (socket: Socket) => {
  socket.on("typing", (payload) => {
    socket.to(payload.roomId).emit("typing", payload);
  });

  socket.on("stopTyping", (payload) => {
    socket.to(payload.roomId).emit("stopTyping", payload);
  });
};