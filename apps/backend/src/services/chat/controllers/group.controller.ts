import { Request, Response } from "express"
import { addMembersFunction, createGroupChatFunction, leaveGroupFunction, removeMembersFunction, toggleAdminFunction } from "../services/group.services.js"
import { handleChatError } from "../errors/chatErrors.js"

/**
 * @desc Create a group chat
 * @route POST /api/group/
 * @access Private (User)
 */
export const createGroupChat = async (req:Request, res:Response) => {
    try{

        const { name, userIds } = req.body
        const currentUserId = req.user?.id
    
        const groupChat = await createGroupChatFunction(name, userIds, currentUserId!)
    
        res.status(201).json({message: "Group chat created", groupChat})
    
    } catch (error) {
        handleChatError(res, error as Error)
    }
}

/**
 * @desc Add members to gourp chat
 * @route POST /api/group/members
 * @access Private (User)
 */
export const addMembers = async (req:Request, res:Response) => {
    
    try {
        const { chatId, members } = req.body
        const userId = req.user?.id

        const chat =  await addMembersFunction(chatId, members, userId!)

        res.status(200).json({ message: "Members added successfully", chat })
        
    } catch (error) {
        handleChatError(res, error as Error)
    }
}

/**
 * @desc Remove members from group chat
 * @route DELETE /api/group/members
 * @access Private (User)
 */
export const removeMembers = async (req:Request, res:Response) => {
    
    try {
        const { chatId, member } = req.body
        const userId = req.user?.id

        const chat = await removeMembersFunction(userId!, chatId, member)
    
        res.status(200).json({ message: "Member removed successfully", chat })

    } catch (error) {
        handleChatError(res, error as Error)
    }
}

/**
 * @desc Toggle admin
 * @route PATCH /api/group/admin
 * @access Private (User)
 */
export const toggleAdmin = async (req: Request, res: Response) => {
  try {
    const { chatId, member, makeAdmin } = req.body
    const userId = req.user?.id
    
    const chat = await toggleAdminFunction(userId!, chatId, member, makeAdmin)

    res.json({ message: makeAdmin ? "User promoted to admin" : "User demoted", chat })
  } catch (error) {
    handleChatError(res, error as Error)
  }
}

/**
 * @desc Leave group
 * @route POST /api/group/leave
 * @access Private (User)
 */
export const leaveGroup = async (req:Request, res:Response) => {
    try {
        const { chatId } = req.body
        const userId = req.user?.id

        const response = await leaveGroupFunction(userId!, chatId)
        
        res.json(response);

    } catch (error) {
        handleChatError(res, error as Error)
    }
}