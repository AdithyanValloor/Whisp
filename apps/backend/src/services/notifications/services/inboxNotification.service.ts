import { emitInboxNotification } from "../../../socket/emitters/notification.emitters.js";
import { NotFound } from "../../../utils/errors/httpErrors.js";
import { InboxNotificationModel } from "../models/inboxNotification.model.js";
import {
  InboxNotificationDTO,
  InboxNotificationSocketPayload,
} from "../types/notification.socket.js";

export const createInboxNotification = async ({
  userId,
  actorId,
  type,
  chatId,
  messageId,
  friendRequestId,
  groupId,
}: {
  userId: string;
  actorId?: string;
  type: string;
  chatId?: string;
  messageId?: string;
  friendRequestId?: string;
  groupId?: string;
}) => {
  const notification = await InboxNotificationModel.create({
    user: userId,
    actor: actorId,
    type,
    chat: chatId,
    message: messageId,
    friendRequest: friendRequestId,
    group: groupId,
  });

  const populated = await notification.populate([
    { path: "actor", select: "username displayName profilePicture" },
    { path: "chat", select: "chatName isGroup" },
    { path: "message", select: "content chat" },
    { path: "group", select: "chatName isGroup" }
  ]);

  const obj = populated.toObject() as unknown as InboxNotificationDTO;

  const dto: InboxNotificationDTO = {
    ...obj,
    _id: obj._id.toString(),
    actor: obj.actor
      ? { ...obj.actor, _id: obj.actor._id.toString() }
      : undefined,
    chat: obj.chat ? { ...obj.chat, _id: obj.chat._id.toString() } : undefined,
    message: obj.message
      ? { ...obj.message, _id: obj.message._id.toString() }
      : undefined,
      group: obj.group ? { ...obj.group, _id: obj.group._id.toString() } : undefined,
  };

  const payload: InboxNotificationSocketPayload = {
    type: dto.type,
    notification: dto,
  };

  emitInboxNotification(userId, payload);

  return dto;
};

export const getUnreadNotificationCount = async (userId: string) => {
  const count = await InboxNotificationModel.countDocuments({
    user: userId,
    read: false,
  });

  return { unreadCount: count };
};

export const markAllNotificationsRead = async (userId: string) => {
  await InboxNotificationModel.updateMany(
    { user: userId, read: false },
    { $set: { read: true } },
  );

  return { success: true };
};

export const getInboxNotifications = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
) => {
  const skip = (page - 1) * limit;

  const notifications = await InboxNotificationModel.find({
    user: userId,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("actor", "username displayName profilePicture")
    .populate("chat", "chatName isGroup")
    .populate("group", "chatName isGroup")
    .populate("message", "content chat",);

  const total = await InboxNotificationModel.countDocuments({
    user: userId,
  });

  const unreadCount = await InboxNotificationModel.countDocuments({
    user: userId,
    read: false,
  });

  return {
    notifications,
    unreadCount,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

export const markNotificationRead = async (
  notificationId: string,
  userId: string,
) => {
  const notification = await InboxNotificationModel.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true },
  );

  if (!notification) throw NotFound("Notification not found");

  return notification;
};

export const deleteNotificationByFriendRequest = async (
  friendRequestId: string
) => {
  const notification = await InboxNotificationModel.findOneAndDelete({
    friendRequest: friendRequestId,
  });

  if (!notification) return null;

  return {
    notificationId: String(notification._id),
    userId: String(notification.user),
  };
};

export const deleteNotification = async (
  notificationId: string,
  userId: string,
) => {
  const notification = await InboxNotificationModel.findOneAndDelete({
    _id: notificationId,
    user: userId,
  });

  if (!notification) throw NotFound("Notification not found");

  return {
    success: true,
    notificationId: String(notification._id),
  };
};

export const markMentionsReadForChat = async (
  userId: string,
  chatId: string
) => {
  await InboxNotificationModel.updateMany(
    {
      user: userId,
      chat: chatId,
      type: "mention",
      read: false,
    },
    {
      $set: { read: true },
    }
  );

  return { success: true };
};