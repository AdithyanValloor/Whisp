import mongoose, {Schema, model} from "mongoose";

const ChatSchema = new Schema(
    {
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        isGroup: {
            type: Boolean,
            default: false
        },
        chatName: {
            type: String,
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        admin: [
            {   
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {   timestamps: true    }
)

export const Chat = model("Chat", ChatSchema)
