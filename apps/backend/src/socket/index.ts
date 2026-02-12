import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

import { setIO } from "./io.js";
import { cleanupPresence } from "./presence.js";
import { registerConnectionHandlers } from "./handlers/connection.js";
import { registerTypingHandlers } from "./handlers/typing.js";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://192.168.20.3:3000",
  "http://192.168.20.4:3000",
  "http://192.168.20.50:3000",
];

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  setIO(io);

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    registerConnectionHandlers(socket);
    registerTypingHandlers(socket);
  });

  setInterval(cleanupPresence, 10_000);

  return io;
};