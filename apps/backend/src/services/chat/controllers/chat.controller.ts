import { Request, Response } from "express";
import { accessChatFunction, fetchChatsFunction } from "../services/chat.services.js";
import { handleChatError } from "../errors/chatErrors.js";



export const fetchChats = async (req:Request, res:Response) => {
    try {
        const userId = req.user?.id
        const chats = await fetchChatsFunction(userId!)

        res.json(chats)
    } catch (error) {
        handleChatError(res, error as Error)
    }
}

export const accessChat = async (req:Request, res: Response) => {
    
    try {
        const { userId } = req.body
        const currentUserId = req.user?.id
    
        if(!userId) throw new Error("UserId param not sent")
        if(!currentUserId) throw new Error("Unauthorized")

        const chat = await accessChatFunction(userId, currentUserId)
        res.status(200).json(chat)

    } catch (error) {
        handleChatError(res, error as Error)
    }
}


