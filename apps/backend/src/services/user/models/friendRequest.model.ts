import mongoose, { Schema, Types } from "mongoose";

export interface IFriendRequest extends Document{
    from: Types.ObjectId
    to: Types.ObjectId
    status: "pending" | "accepted" | "rejected"
    createdAt: Date
}

const friendRequestSchema: Schema<IFriendRequest> = new Schema({
    from: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"], 
        default: null
    }
})

export const FriendRequestModel = mongoose.model<IFriendRequest>("FriendRequest", friendRequestSchema)