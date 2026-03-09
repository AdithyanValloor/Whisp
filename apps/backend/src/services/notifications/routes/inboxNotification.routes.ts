import { Router } from "express";
import {
  fetchInboxNotificationsController,
  markNotificationReadController,
  getUnreadNotificationCountController,
  markAllNotificationsReadController,
  deleteNotificationByFriendRequestController,
  deleteNotificationController,
  markMentionsReadController,
} from "../controllers/inboxNotification.controller.js";
import { protect } from "../../auth/auth.middleware.js";

const router = Router();

router.get("/", protect, fetchInboxNotificationsController);

router.get("/unread-count", protect, getUnreadNotificationCountController);

router.patch(
  "/chat/:chatId/read-mentions",
  protect,
  markMentionsReadController,
);

router.patch("/:id/read", protect, markNotificationReadController);

router.patch("/read-all", protect, markAllNotificationsReadController);

router.delete(
  "/friend-request/:friendRequestId",
  protect,
  deleteNotificationByFriendRequestController,
);

router.delete("/:id", protect, deleteNotificationController);

export { router as inboxNotificationsRouter };
