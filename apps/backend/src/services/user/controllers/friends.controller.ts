import { Request, Response } from "express";
import { getProfileByUserId } from "../services/user.services";

/**
 * @desc Handles user add friend
 * @route GET /api/friends
 * @access User
 */

export const addFriend = async (req:Request, res:Response):Promise<void> => {
    try {
        const { friendId } = req.body
        const userId = req.user?.id

        const userProfile = getProfileByUserId(userId!)

    } catch (error) {
        
    }
}