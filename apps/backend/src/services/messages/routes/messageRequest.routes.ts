import { Router } from "express";
import {
  getMessageRequestsController,
  acceptMessageRequestController,
  rejectMessageRequestController,
} from "../controllers/messageRequest.controller.js";

import { protect } from "../../auth/auth.middleware.js";

const router = Router();

// Message request inbox for the authenticated user.
router.get("/", protect, getMessageRequestsController);

// Review actions for individual message requests.
router.post("/:requestId/accept", protect, acceptMessageRequestController);
router.post("/:requestId/reject", protect, rejectMessageRequestController);

export { router as messageRequestRouter };
