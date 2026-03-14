import { Router } from "express";
import {
  getMessageRequestsController,
  acceptMessageRequestController,
  rejectMessageRequestController,
} from "../controllers/messageRequest.controller.js";

import { protect } from "../../auth/auth.middleware.js";

const router = Router();

/* --------------------------------------------------
   Get all message requests
   GET /message-request
-------------------------------------------------- */
router.get("/", protect, getMessageRequestsController);

/* --------------------------------------------------
   Accept message request
   POST /message-request/:requestId/accept
-------------------------------------------------- */
router.post("/:requestId/accept", protect, acceptMessageRequestController);

/* --------------------------------------------------
   Reject message request
   POST /message-request/:requestId/reject
-------------------------------------------------- */
router.post("/:requestId/reject", protect, rejectMessageRequestController);

export { router as messageRequestRouter };