
import { SendMessageBody } from "../types/message.types.js";
import { Request, Response } from "express";
import { deleteMessageFunction, editMessageFunction, getAllMessagesFunction, sendMessageFunction } from "../services/message.services.js";
import { handleMessageError } from "../errors/messageErrors.js";

// Fetches all messages with chatId
export const getAllMessages = async (req: Request, res: Response) => {

    try {
        const { chatId } = req.params
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        
        const messages = await getAllMessagesFunction(chatId, page, limit)
        res.json(messages)

    } catch (error) {
        handleMessageError(res, error as Error)
    }
}

// Sends message to a chatId with socket emit
export const sendMessage = async (req: Request<{}, {}, SendMessageBody>, res: Response) => {
    try {
        const { content, chatId } = req.body 
        const senderId = req.user?.id

        if(!senderId) throw new Error("Unauthorized")
        if(!content) throw new Error("Content is required")
        if(!chatId) throw new Error("ChatId is required")

        const message = await sendMessageFunction(chatId, content, senderId)

        res.status(201).json(message)

    } catch (error) {
        handleMessageError(res, error as Error)
    }
}

export const editMessage = async (req: Request< {}, {}, SendMessageBody>, res: Response) => {
    try {
        const { content } = req.body
        const { messageId } = req.params as {messageId: string}
        const userId = req.user?.id

        if(!userId) throw new Error("Unauthorized")
      
        const message = await editMessageFunction(messageId, content, userId)

        res.status(201).json(message)

    } catch (error) {
        handleMessageError(res, error as Error)
    }
}

export const deleteMessage = async (req: Request< {}, {}, SendMessageBody>, res: Response) => {
    try {
        const { messageId } = req.params as {messageId: string}
        const userId = req.user?.id

        if(!userId) throw new Error("Unauthorized")
      
        const message = await deleteMessageFunction(messageId, userId)

        res.status(201).json(message)

    } catch (error) {
        handleMessageError(res, error as Error)
    }
}
