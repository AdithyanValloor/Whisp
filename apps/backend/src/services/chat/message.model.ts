import mongoose, { Schema, model } from "mongoose";

const messageSchema = new Schema(
    {
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content: {
            type: String,
            required: true
        },
    },
    {   timestamps: true    }
)

export const Message = model("Message", messageSchema)