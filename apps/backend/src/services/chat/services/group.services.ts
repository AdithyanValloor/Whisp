import { Chat } from "../models/chat.model.js"
import mongoose, { ObjectId } from "mongoose"

/**
 * @desc Create a group chat
 * @route POST /api/group/
 * @access Private (User)
 */
export const createGroupChatFunction = async ( name:string, userIds:Array<string>, currentUserId:string ) => {

    if(!userIds || !Array.isArray(userIds) || !name || userIds.length < 1){
        throw new Error("Group name is required")
    }

    try {
        
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

        return fullGroupChat

    } catch (error) {
        throw error
    }
}

/**
 * @desc Add members to gourp chat
 * @route POST /api/group/members
 * @access Private (User)
 */
export const addMembersFunction = async (chatId:string, members:string[], userId:string) => {
    
    try {
    
        const chat = await Chat.findById(chatId)
        if(!chat){ 
            throw new Error("Chat not found")
        }
    
        if(!chat?.admin.some((id) => id.toString() === userId?.toString()) && chat.createdBy?.toString() !== userId?.toString()){
            throw new Error("Only admins can add new members")
        }
    
        const newMembers = members.filter(
          (id: string) => !chat.members.some((m) => m.toString() === id)
        )
    
        chat.members.push(...newMembers.map((id) => new mongoose.Types.ObjectId(id)))
    
        await chat.save()

        return chat
        
    } catch (error) {
        throw error
    }
}

/**
 * @desc Remove members from group chat
 * @route DELETE /api/group/members
 * @access Private (User)
 */
export const removeMembersFunction = async (userId:string, chatId:string, member:string) => {
    
    try {
        const chat = await Chat.findById(chatId)
        if(!chat){ 
            throw new Error("Chat not found")
        }
    
        if(!chat?.admin.some((id) => id.toString() === userId?.toString()) && chat.createdBy?.toString() !== userId?.toString()){
            throw new Error("Only admins can remove members")
        }
    
        if(chat.createdBy && member.toString() === chat.createdBy?.toString()){
            throw new Error("Creator can't be removed")
        }
    
        chat.members = chat.members.filter(
            (id) => id.toString() !== member.toString()
        )

        chat.admin = chat.admin.filter(id => id.toString() !== member);

        await chat.save()
    
        return chat

    } catch (error) {
        throw error
    }
}

/**
 * @desc Toggle admin
 * @route PATCH /api/group/admin
 * @access Private (User)
 */
export const toggleAdminFunction = async (userId:string, chatId:string, member:string, makeAdmin:string) => {
  try {

    const chat = await Chat.findById(chatId);
    if (!chat){ 
        throw new Error("Chat not found")
    }

    if (chat.createdBy?.toString() !== userId) {
        throw new Error("Only creator can manage admins")
    }

    if (makeAdmin) {
      if (!chat.admin.some(id => id.toString() === member.toString())) {
        chat.admin.push(new mongoose.Types.ObjectId(member))
      }
    } else {
      chat.admin = chat.admin.filter(id => id.toString() !== member)
    }

    await chat.save()
    return chat

  } catch (error) {
    throw  error
  }
}

/**
 * @desc Leave group
 * @route POST /api/group/leave
 * @access Private (User)
 */
export const leaveGroupFunction = async (userId:string, chatId:string) => {
    try {
        
        const chat = await Chat.findById(chatId)
        if (!chat){ 
            throw new Error("Chat not found")
        }

        chat.members = chat.members.filter(id => id.toString() !== userId)
        chat.admin = chat.admin.filter(id => id.toString() !== userId)

        if(chat.createdBy?.toString() === userId){
            if (chat.admin.length > 0) {
                chat.createdBy = new mongoose.Types.ObjectId(chat.admin[0].toString())
            } else if (chat.members.length > 0) {
                chat.createdBy = new mongoose.Types.ObjectId(chat.members[0].toString())
            } else {
                await Chat.findByIdAndDelete(chatId)

                return {message: "Group deleted as no members left", deleted: true}
            }
        }

        await chat.save()
        return { message: "You left the group", chat }

    } catch (error) {
        throw error
    }
}