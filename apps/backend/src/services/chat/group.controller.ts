import { Request, Response } from "express"
import { Chat } from "./chat.model.js"

// CREATE A GROUP CHAT
export const createGroupChat = async (req:Request, res:Response) => {
    const { name, userIds } = req.body

    if(!userIds || !Array.isArray(userIds) || !name || userIds.length < 1){
        res.status(400).json({ message: "Group name is required"})
        return 
    }

    try {
        const currentUserId = req.user?.id
        
        const members = Array.from(new Set([...userIds, currentUserId]))

        const groupChat = await Chat.create({
            chatName: name,
            members,
            isGroup: true,
            admin: [currentUserId],
            createdBy: currentUserId
        })

        const fullGroupChat = await Chat.findById(groupChat._id)
        .populate("members", "-password")
        .populate("admin", "-password")

        res.status(201).json(fullGroupChat)

    } catch (err) {
        res.status(500).json({ 
            message: "Failed to create group chat", 
            error: err 
        });
    }
}

// ADD NEW MEMBERS
export const addMembers = async (req:Request, res:Response) => {
    
    try {
        const { chatId, members } = req.body
        const userId = req.user?.id
    
        const chat = await Chat.findById(chatId)
        if(!chat){ 
            res.status(404).json({ message: "Chat not found" })
            return 
        }
    
        if(!chat?.admin.some((id) => id.toString() === userId?.toString()) && chat.createdBy?.toString() !== userId?.toString()){
            res.status(403).json({ message: "Only admins can add new members"})
            return 
        }
    
        const newMembers = members.filter(
          (id: string) => !chat.members.some((m) => m.toString() === id)
        )
    
        chat.members.push(...newMembers)
    
        await chat.save()
    
        res.status(200).json({ message: "Members added successfully", chat })
        
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
}

// REMOVE MEMBERS
export const removeMembers = async (req:Request, res:Response) => {
    
    try {
        const { chatId, member } = req.body
        const userId = req.user?.id
    
        const chat = await Chat.findById(chatId)
        if(!chat){ 
            res.status(404).json({ message: "Chat not found" })
            return 
        }
    
        if(!chat?.admin.some((id) => id.toString() === userId?.toString()) && chat.createdBy?.toString() !== userId?.toString()){
            res.status(403).json({ message: "Only admins can remove members"})
            return 
        }
    
        if(member === chat.createdBy?._id){
            res.status(400).json({message: "Creator can't be removed"})
            return 
        }
    
        chat.members = chat.members.filter(
            (id) => id.toString() !== member.toString()
        )

        chat.admin = chat.admin.filter(id => id.toString() !== member);

        await chat.save()
    
        res.status(200).json({ message: "Member removed successfully", chat })

    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
}

// TOGGLE ADMIN
export const toggleAdmin = async (req: Request, res: Response) => {
  try {
    const { chatId, member, makeAdmin } = req.body

    const chat = await Chat.findById(chatId);
    if (!chat){ 
        res.status(404).json({ message: "Chat not found" })
        return 
    }

    
    if (chat.createdBy?.toString() !== req.user?.id) {
        res.status(403).json({ message: "Only creator can manage admins" })
        return 
    }

    if (makeAdmin) {
      if (!chat.admin.some(id => id.toString() === member)) {
        chat.admin.push(member)
      }
    } else {
      chat.admin = chat.admin.filter(id => id.toString() !== member)
    }

    await chat.save()
    res.json({ message: makeAdmin ? "User promoted to admin" : "User demoted", chat })
  } catch (error) {
    res.status(500).json({ message: "Server error", error })
  }
}

// LEAVE GROUP
export const leaveGroup = async (req:Request, res:Response) => {
    try {
        const { chatId } = req.body
        const userId = req.user?.id
        
        const chat = await Chat.findById(chatId)
        if (!chat){ 
            res.status(404).json({ message: "Chat not found" })
            return 
        }

        chat.members = chat.members.filter(id => id.toString() !== userId);
        chat.admin = chat.admin.filter(id => id.toString() !== userId);

        if(chat.createdBy?.toString() === userId){
            if (chat.admin.length > 0) {
                chat.createdBy = chat.admin[0];
            } else if (chat.members.length > 0) {
                chat.createdBy = chat.members[0];
            } else {
                await Chat.findByIdAndDelete(chatId);
                res.json({ message: "Group deleted as no members left" });
                return 
            }
        }

        await chat.save()
        res.json({ message: "You left the group", chat });

    } catch (error) {
        res.status(500).json({ message: "Server error", error })
    }
}