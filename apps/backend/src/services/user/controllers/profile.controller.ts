import { Request, Response } from "express";
import { getProfileByUserId } from "../services/user.services.js";
import { handleProfileError } from "../errors/ProfileErrors.js";

/**
 * @desc Handles user profile view
 * @route GET /api/profile
 * @access User
 */

export const viewProfile = async (req: Request, res: Response): Promise<void> => {
  try {

    const userId = req.user?.id
    const profile = await getProfileByUserId(userId!)

    res.status(200).json(profile)

  } catch (error) {
    handleProfileError(res, error as Error)
  }
}

/**
 * @desc Handles user profile edit
 * @route GET /api/profile
 * @access User
 */

export const editProfile = async (req:Request, res:Response): Promise<void> => {
    try {
        const { username, pronouns, bio, status } = req.body
        
        const userId = req.user?.id
        const profile = await getProfileByUserId(userId!)

        if(username){
            profile.username = username 
        }
        if(pronouns){
            profile.pronouns = pronouns
        }
        if(bio){
            profile.bio = bio
        }
        if(status){
            profile.status = status
        }

        await profile.save()
        res.status(200).json(profile)

    } catch (error) {  
        handleProfileError(res, error as Error)
    }
}

