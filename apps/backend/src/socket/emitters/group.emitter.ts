import { getIO } from "../io.js";

/**
 * Emits when a new group is created.
 * → Notify all members individually (so it appears in their chat list)
 */
export const emitGroupCreated = (
  group: any,
  memberIds: string[]
) => {
  const io = getIO();

  memberIds.forEach((userId) => {
    io.to(userId).emit("group_created", group);
  });
};

/**
 * Emits when full group data changes.
 * → Broadcast to entire group room
 */
export const emitGroupUpdated = (
  chatId: string,
  group: any
) => {
  getIO().to(chatId).emit("group_updated", group);
};

/**
 * Emits when members are added.
 * → Broadcast to group
 * → Notify new members individually
 */
export const emitMembersAdded = (
  chatId: string,
  group: any,
  newMemberIds: string[]
) => {
  const io = getIO();

  // Notify entire group
  io.to(chatId).emit("members_added", group);

  // Notify newly added users (so group appears instantly)
  newMemberIds.forEach((userId) => {
    io.to(userId).emit("added_to_group", group);
  });
};

/**
 * Emits when a member is removed.
 * → Broadcast to group
 * → Notify removed user
 */
export const emitMemberRemoved = (
  chatId: string,
  removedUserId: string
) => {
  const io = getIO();

  // Notify group
  io.to(chatId).emit("member_removed", {
    chatId,
    removedUserId,
  });

  // Notify removed user
  io.to(removedUserId).emit("removed_from_group", {
    chatId,
  });
};

/**
 * Emits when admin role changes.
 */
export const emitAdminToggled = (
  chatId: string,
  memberId: string,
  isAdmin: boolean
) => {
  getIO().to(chatId).emit("admin_toggled", {
    chatId,
    memberId,
    isAdmin,
  });
};

/**
 * Emits when ownership is transferred.
 */
export const emitOwnershipTransferred = (
  chatId: string,
  newOwnerId: string
) => {
  getIO().to(chatId).emit("ownership_transferred", {
    chatId,
    newOwnerId,
  });
};

/**
 * Emits when a user leaves.
 * → Broadcast to group
 * → Notify leaver separately
 */
export const emitMemberLeft = (
  chatId: string,
  userId: string
) => {
  const io = getIO();

  io.to(chatId).emit("member_left", {
    chatId,
    userId,
  });

  io.to(userId).emit("left_group", {
    chatId,
  });
};

/**
 * Emits when group is soft deleted.
 * → Notify all members individually
 */
export const emitGroupDeleted = (
  chatId: string,
  memberIds: string[]
) => {
  const io = getIO();

  memberIds.forEach((userId) => {
    io.to(userId).emit("group_deleted", { chatId });
  });
};