import { Request, Response, NextFunction } from "express";
import {
  blockUser,
  getBlockedByUsers,
  getBlockedUsers,
  unblockUser,
} from "../services/block.service.js";
import { emitUserBlocked, emitUserUnblocked } from "../../../socket/emitters/block.emitter.js";

export const getBlockedUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const blockedUsers = await getBlockedUsers(userId);
    res.status(200).json({ blockedUsers });
  } catch (error) {
    next(error);
  }
};

export const getBlockedByUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const blockedByUserIds = await getBlockedByUsers(userId);
    res.json({ blockedByUserIds });
  } catch (error) {
    next(error);
  }
};

export const blockUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.params;

    const result = await blockUser(userId, targetUserId);

    if (!result?.alreadyBlocked) {
      emitUserBlocked(userId, targetUserId);
    }

    res.status(200).json({
      message: "User blocked successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.params;

    const result = await unblockUser(userId, targetUserId);

    if (!result?.notBlocked) {
      emitUserUnblocked(targetUserId, userId);
    }

    res.status(200).json({
      message: "User unblocked successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};