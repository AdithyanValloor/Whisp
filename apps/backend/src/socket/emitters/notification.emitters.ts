import { getIO } from "../io.js";
import { InboxNotificationSocketPayload } from "../../services/notifications/types/notification.socket.js";

export const emitInboxNotification = (
  userId: string,
  payload: InboxNotificationSocketPayload,
) => {
  getIO().to(userId).emit("inbox_notification", payload);
};

export const emitNotificationRemoved = (
  userId: string,
  friendRequestId: string,
) => {
  getIO().to(userId).emit("notification_removed", {
    friendRequestId,
  });
};

export const emitUnreadNotificationCount = (
  userId: string, 
  count: number
) => {
  getIO().to(userId).emit("notification_unread_count", { count });
};
