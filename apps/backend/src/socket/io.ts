/**
 * Socket.IO instance manager.
 *
 * Provides a shared IO reference so other layers (e.g., REST controllers)
 * can emit events without importing the socket bootstrap logic.
 *
 * Must be initialized during server startup before use.
 */

import type { Server } from "socket.io";

let io: Server | null = null;

export const setIO = (instance: Server): void => {
  io = instance;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};