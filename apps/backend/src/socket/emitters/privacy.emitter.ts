import { getIO } from "../io.js";

/**
 * Notifies the user's own socket that their privacy settings changed.
 * Used to bust cached settings in socket handlers (e.g. typing indicators).
 */
export const emitPrivacyUpdated = (userId: string): void => {
  const io = getIO();
  io.to(userId).emit("privacy:updated");
};