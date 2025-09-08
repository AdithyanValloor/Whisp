import { io } from "../../../index.js"
import { Message } from "../models/message.model.js"


export const getAllMessagesFunction = async (chatId:string, page:number, limit:number) => {
 
    const skip = (page - 1) * limit

    const messages = await Message.find({ chat: chatId })
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limit)
    .populate("sender", "username")
    
    if (!messages || messages.length === 0) {
        return {
            messages: [],
            totalPages: 0,
            currentPage: page,
        }
    }

    const total = await Message.countDocuments({ chat: chatId })

    return {
        messages,
        totalPages: Math.ceil(total/ limit),
        currentPage: page,
    }
}

export const sendMessageFunction = async (chatId:string, content:string, senderId:string) => {

    const message = await Message.create({
        sender: senderId,
        content,
        chat: chatId
    })

    const populatedMessage = await message.populate("sender", "username profilePicture");
    io.to(chatId).emit("new_message", populatedMessage);

    return populatedMessage
}

export const editMessageFunction = async (messageId:string, newContent:string, userId:string) => {

    const message = await Message.findById(messageId)

    if(!message) throw new Error("Message not found")
    if(message.sender.toString() !== userId.toString()) throw new Error("Not authorized to edit this message")

    message.content = newContent
    message.edited = true
    await message.save()

    const populatedMessage = await message.populate("sender", "username profilePicture");
    io.to(message.chat.toString()).emit("new_message", populatedMessage);

    return populatedMessage
}

export const deleteMessageFunction = async (messageId:string, userId:string) => {

    const message = await Message.findById(messageId)

    if(!message) throw new Error("Message not found")
    if(message.sender.toString() !== userId.toString()) throw new Error("Not authorized to edit this message")

    message.content = "This message was deleted"
    message.deleted = true
    await message.save()

    const populatedMessage = await message.populate("sender", "username profilePicture");
    io.to(message.chat.toString()).emit("new_message", populatedMessage);

    return populatedMessage
}
