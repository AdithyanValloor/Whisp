import { NextFunction, Response } from "express";
import { AuthRequest } from "../../user/types/authRequest.js";
import {
  BadRequest,
  NotFound,
  Unauthorized,
} from "../../../utils/errors/httpErrors.js";
import { deleteFile, generateUploadUrl } from "../s3.service.js";
import { Chat, IChat } from "../../chat/models/chat.model.js";

const MAX_GROUP_SIZE = 2 * 1024 * 1024;

const ALLOWED_GROUP_TYPES = new Set(["image/png", "image/jpeg"]);

const GROUP_KEY_REGEX = /^group\/[^/]+\/[a-f0-9-]+\.(png|jpg)$/;

export const isGroupAdmin = (group: IChat, userId: string) => {
  return (
    group.admin.some((id) => id.toString() === userId) ||
    group.createdBy?.toString() === userId
  );
};

export const uploadGroupAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { groupId, fileType, fileSize } = req.body;

    if (!groupId || typeof groupId !== "string") {
      throw BadRequest("GroupId is required");
    }

    if (
      typeof fileType !== "string" ||
      typeof fileSize !== "number" ||
      fileSize <= 0
    ) {
      throw BadRequest("Invalid input");
    }

    if (fileSize > MAX_GROUP_SIZE) {
      throw BadRequest("File too large");
    }

    if (!ALLOWED_GROUP_TYPES.has(fileType)) {
      throw BadRequest("Invalid group image type");
    }

    const group = await Chat.findById(groupId);
    if (!group) throw NotFound("Group not found");

    const isAdmin = isGroupAdmin(group, userId);

    if (!isAdmin) throw Unauthorized();

    const data = await generateUploadUrl(
      { type: "group", groupId },
      fileType,
      fileSize,
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const deleteGroupAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { groupId, key } = req.query;

    if (!groupId || typeof groupId !== "string") {
      throw BadRequest("GroupId is required");
    }

    if (!key || typeof key !== "string") {
      throw BadRequest("Invalid key");
    }

    if (!GROUP_KEY_REGEX.test(key) || !key.startsWith(`group/${groupId}/`)) {
      throw Unauthorized();
    }

    const group = await Chat.findById(groupId);
    if (!group) throw NotFound("Group not found");

    const isAdmin = isGroupAdmin(group, userId);

    if (!isAdmin) throw Unauthorized();

    try {
      await deleteFile(key);
    } catch (err) {
      return next(err);
    }

    if (group.avatar?.key === key) {
      group.avatar = { key: null, url: null };
      await group.save();
    }

    res.json({
      message: "Group avatar deleted",
      success: true,
    });
  } catch (err) {
    next(err);
  }
};
