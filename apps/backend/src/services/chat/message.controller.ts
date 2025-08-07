import { io } from "../../index";
import { SendMessageBody } from "./message.types";
import { Request, Response } from "express";
import { Message } from "./message.model";

export const sendMessage = async (req: Request<{}, {}, SendMessageBody>, res: Response) => {
    const { receiverId, content, chatId } = req.body
    const senderId = req.user?.id

    const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content,
        chat: chatId
    })

    io.to(receiverId).emit("recieve message", {
        message,
        senderId,
    })

    return res.status(201).json(message)
}

export const getMessage = async (req: Request, res: Response) => {
    const { chatId } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const skip = (page - 1) * limit

    const messages = await Message.find({ chat: chatId })
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit)
    .populate("sender", "username")

    const total = await Message.countDocuments({ chat: chatId })

    return res.json({
        messages,
        totalPages: Math.ceil(total/ limit),
        currentPage: page,
    })
}
