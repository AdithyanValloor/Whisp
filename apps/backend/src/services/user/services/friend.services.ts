import { FriendRequestModel } from "../models/friendRequest.model.js"
import { UserModel } from "../models/user.model.js"

/**
 * @desc Get all friends list
 * @route get /api/friends/
 * @access Private (User)
 */

export const getFriendList = async (userId: string) => {
    if (!userId) throw new Error("Unauthorized");
    const user = await UserModel.findById(userId).populate("friendList", "username email profilePicture");
    if (!user) throw new Error("User not found");
    return user.friendList
}

/**
 * @desc Fetch all friend requests
 * @route GET /api/friends/requests
 * @access Private (User)
 */

export const fetchRequests = async (userId: string) => {
    if (!userId) throw new Error("Unauthorized");

    const incoming = await FriendRequestModel.find({ to: userId, status: "pending" })
    .populate("from", "username email")
    const outgoing = await FriendRequestModel.find({ from: userId, status: "pending" })
    .populate("to", "username email")

  return { incoming, outgoing }
}

/**
 * @desc Send a friend request
 * @route POST /api/friends
 * @access Private (User)
 */

export const sendFriendRequest = async (fromUserId: string, toUserId: string) => {
    const fromUser = await UserModel.findById(fromUserId)
    const toUser = await UserModel.findById(toUserId)

    if(!fromUser) throw new Error("Unauthorized")
    if(!toUser) throw new Error("User not found")
    
    if(fromUser.friendList.includes(toUser.id)) throw new Error("Already friends")

    const existing = await FriendRequestModel.findOne({from: fromUserId, to: toUserId, status: "pending"})
    if(existing) throw new Error("Request already exits")
    
    const request = await FriendRequestModel.create({
        from: fromUserId,
        to: toUserId,
        status: "pending"
    })

    return request
}

/**
 * @desc Accept a friend request
 * @route POST /api/friends/accept
 * @access Private (User)
 */

export const acceptFriendRequest = async (requestId:string, userId:string ) => {
    const request = await FriendRequestModel.findById(requestId)
    if(!request) throw new Error("Request not found")
    if(request.to.toString() !== userId) throw new Error("Not authorized to accept this request")
     
    await UserModel.findByIdAndUpdate(userId, {$addToSet: { friendList: request.from }})
    await UserModel.findByIdAndUpdate(request.from, {$addToSet: {friendList: request.to}})

    request.status = "accepted"
    await request.save()

    return request
}

/**
 * @desc Reject a friend request
 * @route POST /api/friends/reject
 * @access Private (User)
 */

export const rejectFriendRequest = async (requestId:string, userId:string ) => {
    const request = await FriendRequestModel.findById(requestId)
    if(!request) throw new Error("Request not found")
    if(request.to.toString() !== userId) throw new Error("Not authorized to reject this request")
    
    request.status = "rejected"
    await request.save()

    return request
}

/**
 * @desc Remove a friend
 * @route DELETE /api/friends/:friendId
 * @access Private (User)
 */

export const removeFriend = async (userId:string, friendId:string ) => {
    const user = await UserModel.findById(userId)
    const friend = await UserModel.findById(friendId)

    if(!user) throw new Error("Unauthorized")
    if(!friend) throw new Error("User not found")
    
    if(!user.friendList.includes(friend.id)) throw new Error("Not friends")

    await UserModel.findByIdAndUpdate(user._id, {$pull: {friendList: friend._id}})
    await UserModel.findByIdAndUpdate(friend.id, {$pull: {friendList: user._id}})

    return true
}
