import { BlockModel } from "../models/block.model.js";
import { UserModel } from "../models/user.model.js";
import { FriendRequestModel } from "../models/friendRequest.model.js";
import {
  BadRequest,
  NotFound,
  Unauthorized,
} from "../../../utils/errors/httpErrors.js";

export const getBlockedUsers = async (userId: string) => {
  if (!userId) throw Unauthorized();

  const blocks = await BlockModel.find({ blocker: userId })
    .populate("blocked", "_id username displayName profilePicture")
    .lean();

  return blocks.map((b) => b.blocked);
};

export const getBlockedByUsers = async (userId: string) => {
  if (!userId) throw Unauthorized();

  const blocks = await BlockModel.find({ blocked: userId }).lean();

  return blocks.map((b) => b.blocker.toString());
};

export const blockUser = async (userId: string, targetUserId: string) => {
  if (!userId) throw Unauthorized();

  if (userId === targetUserId) {
    throw BadRequest("Cannot block yourself");
  }

  const targetUser = await UserModel.findById(targetUserId);
  if (!targetUser) throw NotFound("User not found");

  const existingBlock = await BlockModel.findOne({
    blocker: userId,
    blocked: targetUserId,
  });

  if (existingBlock) {
    return { alreadyBlocked: true };
  }

  await BlockModel.create({
    blocker: userId,
    blocked: targetUserId,
  });

  // Remove friendship
  await UserModel.findByIdAndUpdate(userId, {
    $pull: { friendList: targetUserId },
  });
  await UserModel.findByIdAndUpdate(targetUserId, {
    $pull: { friendList: userId },
  });

  // Cancel friend requests
  await FriendRequestModel.deleteMany({
    $or: [
      { from: userId, to: targetUserId, status: "pending" },
      { from: targetUserId, to: userId, status: "pending" },
    ],
  });

  return { success: true };
};

export const unblockUser = async (userId: string, targetUserId: string) => {
  if (!userId) throw Unauthorized();

  const deleted = await BlockModel.findOneAndDelete({
    blocker: userId,
    blocked: targetUserId,
  });

  if (!deleted) {
    return { notBlocked: true };
  }

  return { success: true };
};

export const isBlockedEitherWay = async (userA: string, userB: string) => {
  return BlockModel.exists({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  });
};
