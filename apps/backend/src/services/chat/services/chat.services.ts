import { Chat } from "../models/chat.model.js"

export const fetchChatsFunction = async (userId:string) => {
    try {
        const chats = await Chat.find({ members: { $in: [userId]}})
        .populate("members", "-password")
        .populate("admin", "-password")
        .populate("lastMessage")
        .sort({updatedAt: -1})

        return chats
    } catch (error) {
        throw error
    }
}

export const accessChatFunction = async (userId:string, currentUserId:string) => {
    try {
        let chat = await Chat.findOne({
            isGroup: false,
            members: { $all: [userId, currentUserId], $size: 2}
        }).populate("members", "-password")
        .populate({
            path: "lastMessage",
            populate: { path: "sender", select: "username profilePicture email" }
        })

        if(chat) return chat
        
        const newChat = await Chat.create({
            chatName: "sender",
            isGroup: false,
            members: [userId, currentUserId]
        })

        const fullChat = await Chat.findById(newChat._id).populate("members", "-password")
        return fullChat

    } catch (error) {
        throw error
    }
}

