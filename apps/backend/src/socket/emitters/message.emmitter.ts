/**
 * ------------------------------------------------------------------
 * Whisp Chat Backend - Message Socket Emitters
 * ------------------------------------------------------------------
 *
 * Purpose:
 *  Centralized real-time emitters for message-related events.
 *
 * Why This Layer Exists:
 *  - Decouples REST controllers from Socket.IO
 *  - Keeps event names centralized
 *  - Enables scalable event-driven architecture
 *  - Supports multi-device real-time sync
 *
 * Architecture Flow:
 *  Controller → Service → Message Emitter → Socket.IO Room → Clients
 *
 * Room Strategy:
 *  - chatId rooms → Used for broadcasting to all chat members
 *  - userId rooms → Used for targeted events (e.g., unread count)
 *
 * This ensures:
 *  - Group messages reach all participants
 *  - Direct messages sync across user devices
 */

import { MessageSocketPayload } from "../../services/messages/types/message.socket.js";
import { getIO } from "../io.js";

/**
 * Emits when a new message is created.
 *
 * Broadcasted to:
 *  → All users in the chat room
 *
 * @param chatId - Chat room ID
 * @param message - Serialized message payload
 */
export const emitNewMessage = (
  chatId: string,
  message: MessageSocketPayload
): void => {
  getIO().to(chatId).emit("new_message", message);
};

/**
 * Emits unread count updates.
 *
 * Targeted to:
 *  → Specific user (private room)
 *
 * @param userId - Target user ID
 * @param chatId - Chat identifier
 * @param count - Updated unread count
 */
export const emitUnreadUpdate = (
  userId: string,
  chatId: string,
  count: number
): void => {
  getIO().to(userId).emit("unread_update", { chatId, count });
};

/**
 * Emits when a message reaction is added or removed.
 *
 * Broadcasted to:
 *  → All users in the chat room
 *
 * @param chatId - Chat room ID
 * @param message - Updated message payload (with reactions)
 */
export const emitMessageReaction = (
  chatId: string,
  message: MessageSocketPayload
): void => {
  getIO().to(chatId).emit("message_reaction", message);
};

/**
 * Emits when messages are marked as seen.
 *
 * Broadcasted to:
 *  → All users in the chat room
 *
 * Typically used for:
 *  - Read receipts
 *  - Seen indicators
 *
 * @param chatId - Chat room ID
 * @param userId - User who marked messages as seen
 * @param count - Number of messages marked as seen
 */
export const emitMessagesSeen = (
  chatId: string,
  userId: string,
  count: number
): void => {
  getIO().to(chatId).emit("messages_seen", { chatId, userId, count });
};

/**
 * Emits when a message is edited.
 *
 * Broadcasted to:
 *  → All users in the chat room
 *
 * @param chatId - Chat room ID
 * @param message - Updated message payload
 */
export const emitEditMessage = (
  chatId: string,
  message: MessageSocketPayload
): void => {
  getIO().to(chatId).emit("edit_message", message);
};

/**
 * Emits when a message is deleted.
 *
 * Broadcasted to:
 *  → All users in the chat room
 *
 * @param chatId - Chat room ID
 * @param message - Message payload (usually includes ID and metadata)
 */
export const emitDeleteMessage = (
  chatId: string,
  message: MessageSocketPayload
): void => {
  getIO().to(chatId).emit("delete_message", message);
};