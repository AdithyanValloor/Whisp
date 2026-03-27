import { Request, Response, NextFunction } from "express";
import {
  getPrivacySettings,
  updatePrivacySettings,
} from "../services/user.privacy.service.js";
import { emitPrivacyUpdated } from "../../../socket/emitters/privacy.emitter.js";

/**
 * GET /api/user/privacy
 */
export const getPrivacyController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const privacy = await getPrivacySettings(userId);

    res.status(200).json({ success: true, data: privacy });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/user/privacy
 * Body: Partial<PrivacySettings>
 */
export const updatePrivacyController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const updates = req.body;

    const privacy = await updatePrivacySettings(userId, updates);
    
    emitPrivacyUpdated(userId);

    res.status(200).json({ success: true, data: privacy });
  } catch (error) {
    next(error);
  }
};