import express, { Router } from 'express'
import { protect } from '../../auth/auth.middleware.js'
import { acceptReq, addFriend, cancelReq, getAllFriends, getAllRequests, rejectReq, removeFriend } from '../controllers/friends.controller.js'

const router = express.Router()

/**
 * @desc Fetch friends list
 * @route get /api/friends/
 * @access Private (User)
 */

router.get("/", protect, getAllFriends)

/**
 * @desc Send a friend request
 * @route POST /api/friends
 * @access Private (User)
 */

router.post("/", protect, addFriend)

/**
 * @desc Fetch all friend requests
 * @route GET /api/friends/requests
 * @access Private (User)
 */

router.get("/requests", protect, getAllRequests)

/**
 * @desc Accept a friend request
 * @route POST /api/friends/accept
 * @access Private (User)
 */


router.post("/accept", protect, acceptReq)

/**
 * @desc Reject a friend request
 * @route POST /api/friends/reject
 * @access Private (User)
 */


router.post("/reject", protect, rejectReq)

/**
 * @desc Remove a friend
 * @route DELETE /api/friends/remove
 * @access Private (User)
 */

router.post("/remove", protect, removeFriend)


/**
 * @desc Cancel sent friend request
 * @route post /api/friends/cancel
 * @access Private (User)
 */


router.post("/cancel", protect, cancelReq);


export { router as friendRouter}