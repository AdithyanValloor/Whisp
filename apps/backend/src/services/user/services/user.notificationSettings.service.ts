import { UserModel } from "../models/user.model.js";
import { NotFound } from "../../../utils/errors/httpErrors.js";

export interface NotificationSettings {
  allNotifications: boolean;
  newMessages: boolean;
  mentions: boolean;
  replies: boolean;

  friendRequests: boolean;
  friendRequestAccepted: boolean;
  groupAdded: boolean;
}

/**
 * ------------------------------------------------------------------
 * Get Notification Settings
 * ------------------------------------------------------------------
 */
export const getNotificationSettings = async (userId: string) => {
  const user = await UserModel.findById(userId).select("notificationSettings");

  if (!user) throw NotFound("User not found");

  return user.notificationSettings;
};

/**
 * ------------------------------------------------------------------
 * Update Notification Settings
 * ------------------------------------------------------------------
 * @desc Partial update — only provided fields are changed
 */
export const updateNotificationSettings = async (
  userId: string,
  updates: Partial<NotificationSettings>,
) => {
  const user = await UserModel.findById(userId);

  if (!user) throw NotFound("User not found");

  // ── All notifications ─────────────────────────

  if (updates.allNotifications !== undefined)
    user.notificationSettings.allNotifications = updates.allNotifications;

  // ── Messages ─────────────────────────
  if (updates.newMessages !== undefined)
    user.notificationSettings.newMessages = updates.newMessages;

  if (updates.mentions !== undefined)
    user.notificationSettings.mentions = updates.mentions;

  if (updates.replies !== undefined)
    user.notificationSettings.replies = updates.replies;

  // ── Social ───────────────────────────
  if (updates.friendRequests !== undefined)
    user.notificationSettings.friendRequests = updates.friendRequests;

  if (updates.friendRequestAccepted !== undefined)
    user.notificationSettings.friendRequestAccepted =
      updates.friendRequestAccepted;

  if (updates.groupAdded !== undefined)
    user.notificationSettings.groupAdded = updates.groupAdded;

  await user.save();

  return user.notificationSettings;
};
