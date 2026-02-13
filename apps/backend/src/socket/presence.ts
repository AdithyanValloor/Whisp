/**
 * In-memory presence tracker.
 *
 * Uses heartbeat timestamps to determine online/offline status.
 * NOTE: This works only for single-instance deployments.
 * Use Redis or a shared store for horizontal scaling.
 */

import { getIO } from "./io.js";

const presence = new Map<string, number>();
const TIMEOUT = 35_000;

export const userJoined = (userId: string): void => {
  const wasOffline = !presence.has(userId);

  presence.set(userId, Date.now());

  if (wasOffline) {
    getIO().emit("presence_update", {
      userId,
      status: "online",
    });
  }
};

export const heartbeat = (userId: string): void => {
  presence.set(userId, Date.now());
};

export const cleanupPresence = (): void => {
  const now = Date.now();

  for (const [userId, lastActive] of presence.entries()) {
    if (now - lastActive > TIMEOUT) {
      presence.delete(userId);

      getIO().emit("presence_update", {
        userId,
        status: "offline",
      });
    }
  }
};

export const getOnlineUsers = (): string[] => {
  return [...presence.keys()];
};