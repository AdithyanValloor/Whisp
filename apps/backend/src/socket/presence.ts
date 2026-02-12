import { getIO } from "./io.js";

const presence = new Map<string, number>();

export const userJoined = (userId: string) => {
  const wasOffline = !presence.has(userId);
  presence.set(userId, Date.now());

  if (wasOffline) {
    getIO().emit("presence_update", { userId, status: "online" });
  }
};

export const heartbeat = (userId: string) => {
  userJoined(userId);
};

export const cleanupPresence = () => {
  const now = Date.now();

  for (const [userId, lastActive] of presence.entries()) {
    if (now - lastActive > 35_000) {
      presence.delete(userId);
      getIO().emit("presence_update", { userId, status: "offline" });
    }
  }
};

export const getOnlineUsers = () => [...presence.keys()];