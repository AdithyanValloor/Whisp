import { Request, Response, NextFunction } from "express";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../services/user.notificationSettings.service.js";

/**
 * GET /api/user/settings/notifications
 */
export const getNotificationSettingsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const settings = await getNotificationSettings(userId);

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/user/settings/notifications
 */
export const updateNotificationSettingsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const updates = req.body;

    const settings = await updateNotificationSettings(userId, updates);
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
