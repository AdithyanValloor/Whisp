//user.account.controller.ts

import { Request, Response, NextFunction } from "express";
import {
  updateUsername,
  updateEmail,
  changePassword,
  deactivateAccount,
  scheduleAccountDeletion,
  cancelScheduledDeletion,
  sendEmailChangeOtp,
  verifyAndUpdateEmail,
} from "../services/user.account.service.js";

/**
 * ------------------------------------------------------------------
 * Update Username
 * ------------------------------------------------------------------
 * PATCH /api/users/me/username
 *
 * Body: { username: string }
 */
export const updateUsernameController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { username } = req.body;

    const updatedUser = await updateUsername(userId, username);

    res.status(200).json({
      success: true,
      message: "Username updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ------------------------------------------------------------------
 * Change Password
 * ------------------------------------------------------------------
 * PATCH /api/users/me/password
 *
 * Body: { currentPassword: string; newPassword: string }
 */
export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    await changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ------------------------------------------------------------------
 * Deactivate Account
 * ------------------------------------------------------------------
 * PATCH /api/users/me/deactivate
 *
 * Body: none
 */
export const deactivateAccountController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    await deactivateAccount(userId);

    res.status(200).json({
      success: true,
      message: "Account deactivated. You can reactivate by logging in again.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ------------------------------------------------------------------
 * Schedule Account Deletion
 * ------------------------------------------------------------------
 * POST /api/users/me/deletion/schedule
 *
 * Body: { password: string }
 */
export const scheduleAccountDeletionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    const { scheduledDeletionAt } = await scheduleAccountDeletion(
      userId,
      password,
    );

    res.status(200).json({
      success: true,
      message:
        "Account deletion scheduled. You may cancel before the grace period expires.",
      data: { scheduledDeletionAt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ------------------------------------------------------------------
 * Cancel Scheduled Deletion
 * ------------------------------------------------------------------
 * POST /api/users/me/deletion/cancel
 *
 * Body: none
 */
export const cancelScheduledDeletionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    await cancelScheduledDeletion(userId);

    res.status(200).json({
      success: true,
      message: "Account deletion cancelled. Your account has been restored.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/account/email/send-otp
 * Step 1 — send OTP to the new email address
 * Body: { email: string }
 */
export const sendEmailChangeOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { email } = req.body;

    await sendEmailChangeOtp(userId, email);

    res.status(200).json({
      success: true,
      message: "OTP sent",
    });
  } catch (error) {
    next(error);
  } 
};

/**
 * PATCH /api/user/account/email
 * Step 2 — verify OTP then save new email
 * Body: { email: string; otp: string }
 */
export const updateEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { email, otp } = req.body;

    const updatedUser = await verifyAndUpdateEmail(userId, email, otp);

    res.status(200).json({
      success: true,
      message: "Email updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};