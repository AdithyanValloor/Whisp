import { Request, Response } from "express";
import {
  getInboxNotifications,
  markNotificationRead,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  deleteNotification,
  deleteNotificationByFriendRequest,
  markMentionsReadForChat,
} from "../services/inboxNotification.service.js";

export const fetchInboxNotificationsController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user?.id;
  const page = Number(req.query.page) || 1;

  const result = await getInboxNotifications(userId, page);

  res.json(result);
};

export const markNotificationReadController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user.id;

  const notification = await markNotificationRead(req.params.id, userId);

  res.json(notification);
};

export const getUnreadNotificationCountController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user.id;

  const result = await getUnreadNotificationCount(userId);

  res.json(result);
};

export const markAllNotificationsReadController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user.id;

  const result = await markAllNotificationsRead(userId);

  res.json(result);
};

export const deleteNotificationController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  const result = await deleteNotification(notificationId, userId);

  res.json(result);
};

export const deleteNotificationByFriendRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { friendRequestId } = req.params;

  const result = await deleteNotificationByFriendRequest(friendRequestId);

  if (!result) {
    res.status(404).json({
      message: "Notification not found",
    });
    return;
  }

  res.json({
    success: true,
    notificationId: result.notificationId,
  });
};

export const markMentionsReadController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user.id;
  const { chatId } = req.params;

  await markMentionsReadForChat(userId, chatId);

  res.json({ success: true });
};
