import { Request, Response } from "express";
import { acceptFriendRequest, fetchRequests, getFriendList, rejectFriendRequest, removeFriend as removeFriendService, sendFriendRequest } from "../services/friend.services.js";
import { handleFriendError } from "../errors/ProfileError.js";

/**
 * @desc Fetch friends list
 * @route get /api/friends/
 * @access Private (User)
 */

export const getAllFriends = async (req:Request, res:Response):Promise<void> => {
    try {
        const userId = req.user?.id
        const friendList = await getFriendList(userId!)
        
        res.status(200).json({message: "Friend list fetched", friendList })

    } catch (error) {
        handleFriendError(res, error as Error)
    }
}

/**
 * @desc Send a friend request
 * @route POST /api/friends
 * @access Private (User)
 */

export const addFriend = async (req:Request, res:Response):Promise<void> => {
    try {
        const { friendId } = req.body
        const userId = req.user?.id

        const request = await sendFriendRequest(userId!, friendId)
        res.status(200).json({message: "Friend request sent", request })

    } catch (error) {
        handleFriendError(res, error as Error)
    }
}

/**
 * @desc Fetch all friend requests
 * @route GET /api/friends/requests
 * @access Private (User)
 */

export const getAllRequests = async (req:Request, res:Response):Promise<void> => {
    try {
        const userId = req.user?.id
        const { incoming, outgoing } = await fetchRequests(userId!)
        res.status(200).json({message:"All incoming and outgoing requests fetched", incoming, outgoing})
    } catch (error) {
        handleFriendError(res, error as Error)
    }
}

/**
 * @desc Accept a friend request
 * @route POST /api/friends/accept
 * @access Private (User)
 */

export const acceptReq = async (req:Request, res:Response):Promise<void> => {
    try {
        const { requestId } = req.body
        const userId = req.user?.id
        const request = await acceptFriendRequest(requestId, userId!)
        res.status(200).json({message: "Friend request accepted", request })

    } catch (error) {
        handleFriendError(res, error as Error)
    }
}

/**
 * @desc Reject a friend request
 * @route POST /api/friends/reject
 * @access Private (User)
 */

export const rejectReq = async (req:Request, res:Response):Promise<void> => {
    try {
        const { requestId } = req.body
        const userId = req.user?.id

        const request = await rejectFriendRequest(requestId, userId!)
        res.status(200).json({message: "Friend request rejected", request })

    } catch (error) {
        handleFriendError(res, error as Error)
    }
}

/**
 * @desc Remove a friend
 * @route DELETE /api/friends/:friendId
 * @access Private (User)
 */

export const removeFriend = async (req:Request, res:Response):Promise<void> => {
    try {
        const { friendId } = req.body
        const userId = req.user?.id

        const response = await removeFriendService(userId!, friendId)

        if(response){
            res.status(200).json({message: "Friend removed successfully" })
        }

    } catch (error) {
        handleFriendError(res, error as Error)
    }
}