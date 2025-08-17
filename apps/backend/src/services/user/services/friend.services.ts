import { FriendRequestModel } from "../models/friendRequest.model"
import { UserModel } from "../models/user.model"


export const sendFriendRequest = async (fromUserId: string, toUserId: string) => {
    const fromUser = await UserModel.findById(fromUserId)
    const toUser = await UserModel.findById(toUserId)

    if(!fromUser) throw new Error("Unauthorized")
    if(!toUser) throw new Error("User not found")
    
    if(fromUser.friendList.includes(toUser.id)) throw new Error("Already friends")

    const existing = await FriendRequestModel.findOne({from: fromUserId, to: toUserId, status: "pending"})
    if(existing) throw new Error("Request already sent")
    
    const request = await FriendRequestModel.create({
        from: fromUserId,
        to: toUser,
        status: "pending"
    })

    return request
}

export const acceptFriendRequest = async (requestId:string, userId:string ) => {
    const request = await FriendRequestModel.findById(requestId)
    if(!request) throw new Error("Request not found")
    if(request.to.toString() !== userId) throw new Error("Not authorized to accept this request")
     
    await UserModel.findByIdAndUpdate(userId, {$push: { friendList: request.from }})
    await UserModel.findByIdAndUpdate(request.from, {$push: {friendList: request.to}})

    request.status = "accepted"
    await request.save()

    return request
}

export const removeFriend = async (requestId:string, userId:string ) => {
    const request = await FriendRequestModel.findById(requestId)
    if(!request) throw new Error("Request not found")
    if(request.to.toString() !== userId) throw new Error("Not authorized to accept this request")
     
    await UserModel.findByIdAndUpdate(userId, {$push: { friendList: request.from }})
    await UserModel.findByIdAndUpdate(request.from, {$push: {friendList: request.to}})

    request.status = "accepted"
    await request.save()

    return request
}
