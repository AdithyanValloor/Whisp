import { MessageSocketPayload } from "../../services/messages/types/message.socket.js";
import { getIO } from "../io.js";

export const emitNewMessage = (
  chatId: string,
  message: MessageSocketPayload
) => {
  getIO().to(chatId).emit("new_message", message);
};

export const emitUnreadUpdate = (
  userId: string,
  chatId: string,
  count: number
) => {
  getIO().to(userId).emit("unread_update", { chatId, count });
};

export const emitMessageReaction = (
  chatId: string,
  message: MessageSocketPayload
) => {
  getIO().to(chatId).emit("message_reaction", message);
};

export const emitMessagesSeen = (
  chatId: string,
  userId: string,
  count: number
) => {
  getIO().to(chatId).emit("messages_seen", { chatId, userId, count });
};

export const emitEditMessage = (
  chatId: string,
  message: MessageSocketPayload
) => {
  getIO().to(chatId).emit("edit_message", message);
};

export const emitDeleteMessage = (
  chatId: string,
  message: MessageSocketPayload
) => {
  getIO().to(chatId).emit("delete_message", message);
};