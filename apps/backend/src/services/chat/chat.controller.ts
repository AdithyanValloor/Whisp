import { Request, Response } from "express";
import { Chat } from "./chat.model";

export const accessChat = async (req:Request, res: Response) => {
    const { userId } = req.body

    if(!userId) res.status(400).json({ message: "UserId param not sent"})

    const currentUserId = req.user?.id

    try {
        let chat = await Chat.findOne({
            isGroup: false,
            members: { $all: [userId, currentUserId], $size: 2}
        }).populate("members", "-password")
        .populate("lastMessage")

        if(chat) return res.json(chat)
        
        const newChat = await Chat.create({
            chatName: "sender",
            isGroup: false,
            members: [userId, currentUserId]
        })

        const fullChat = await Chat.findById(newChat._id).populate("members", "-password")
        res.status(201).json(fullChat)

    } catch (err) {
        res.status(500).json({ message: "Failed to access chat", error:err })
    }
}

export const fetchChats = async (req:Request, res:Response) => {
    try {
        const chats = await Chat.find({ members: { $in: [req.user?.id ]}})
        .populate("members", "-password")
        .populate("admin", "-password")
        .populate("lastMessage")
        .sort({updateAt: -1})

        res.json(chats)
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch chats", error: err })
    }
}

