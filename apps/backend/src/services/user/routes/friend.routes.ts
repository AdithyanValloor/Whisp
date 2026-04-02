import express from "express";
import { protect } from "../../auth/auth.middleware.js";
import {
  acceptReq,
  addFriend,
  cancelReq,
  getAllFriends,
  getAllRequests,
  rejectReq,
  removeFriend,
} from "../controllers/friends.controller.js";

const router = express.Router();

// Friend list and request management for authenticated users.
router.get("/", protect, getAllFriends);

// Request lifecycle endpoints: create, review, and cancel requests.
router.post("/", protect, addFriend);
router.get("/requests", protect, getAllRequests);
router.post("/accept", protect, acceptReq);
router.post("/reject", protect, rejectReq);
router.post("/cancel", protect, cancelReq);

// Removes an existing friend connection.
router.post("/remove", protect, removeFriend);

export { router as friendRouter };
