import { Schema, Document, model, Types } from "mongoose";

export interface IMessage extends Document {
  _id: Types.ObjectId;  
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;

  edited: boolean;
  deleted: boolean;

  deliveredTo: Types.ObjectId[];
  seenBy: Types.ObjectId[];

  replyTo?: Types.ObjectId | null;

  reactions: {
    emoji: string;
    user: Types.ObjectId;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

const messageSchema:Schema<IMessage> = new Schema(
{
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    seenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// For chat pagination 
messageSchema.index({ chat: 1, createdAt: -1 });

// Optional
messageSchema.index({ chat: 1, content: "text" });


export const Message = model<IMessage>("Message", messageSchema);