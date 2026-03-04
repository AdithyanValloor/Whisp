/**
 * ------------------------------------------------------------------
 * Whisp Chat Backend - Block Socket Emitters
 * ------------------------------------------------------------------
 *
 * Purpose:
 *  Centralized real-time emitters for block/unblock events.
 *
 * Effects:
 *  - Disables chat UI instantly
 *  - Prevents message sending immediately
 *  - Updates friend state in real-time
 */

import { getIO } from "../io.js";

/**
 * Emits when a user BLOCKS another user.
 *
 * Effect on target:
 *  → Disable chat input
 *  → Update relationship state
 *
 * @param targetUserId - User being blocked
 * @param blockerId - User who blocked
 */
export const emitUserBlocked = (
  blockerId: string,
  targetUserId: string,
): void => {
  const io = getIO();

  io.to(targetUserId).emit("user_blocked", {
    by: blockerId,
  });

  io.to(blockerId).emit("block_success", {
    targetUserId,
  });
};

/**
 * Emits when a user UNBLOCKS another user.
 *
 * Effect on target:
 *  → Re-enable chat input (if no reverse block exists)
 *
 * @param targetUserId - User being unblocked
 * @param unblockerId - User who unblocked
 */
export const emitUserUnblocked = (
  targetUserId: string,
  unblockerId: string,
): void => {
  const io = getIO();

  io.to(targetUserId).emit("user_unblocked", {
    by: unblockerId,
  });

  io.to(unblockerId).emit("block_success", {
    targetUserId,
  });
};
