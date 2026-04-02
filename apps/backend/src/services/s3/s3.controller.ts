import { NextFunction, Response } from "express";
import {
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
} from "./s3.service.js";
import { Unauthorized, BadRequest } from "../../utils/errors/httpErrors.js";
import { AuthRequest } from "../user/types/authRequest.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);

const VALID_KEY_REGEX = /^chat\/[^/]+\/[a-f0-9-]+\.(png|jpg|pdf)$/;

export const getUploadUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { fileName, fileType, fileSize } = req.body;

    if (
      typeof fileName !== "string" ||
      !fileName ||
      typeof fileType !== "string" ||
      !fileType ||
      typeof fileSize !== "number" ||
      fileSize <= 0
    ) {
      throw BadRequest("Invalid input");
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw BadRequest("File too large");
    }

    if (!ALLOWED_TYPES.has(fileType)) {
      throw BadRequest("Unsupported file type");
    }

    const data = await generateUploadUrl(userId, fileType, fileSize);

    res.json({
      uploadUrl: data.uploadUrl,
      key: data.key,
    });
  } catch (err) {
    next(err);
  }
};

export const getDownloadUrl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { key } = req.query;

    if (!key || typeof key !== "string") {
      throw BadRequest("Invalid key");
    }

    if (!VALID_KEY_REGEX.test(key) || !key.startsWith(`chat/${userId}/`)) {
      throw Unauthorized();
    }

    const url = await generateDownloadUrl(key);

    res.json({ url });
  } catch (err) {
    next(err);
  }
};

export const deleteFileController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Unauthorized();

    const { key } = req.query;

    if (!key || typeof key !== "string") {
      throw BadRequest("Invalid key");
    }

    if (!VALID_KEY_REGEX.test(key)) {
      throw Unauthorized();
    }

    if (!key.startsWith(`chat/${userId}/`)) {
      throw Unauthorized();
    }

    await deleteFile(key);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
