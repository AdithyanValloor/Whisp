import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IChat extends Document {
  _id: Types.ObjectId;
  members: Types.ObjectId[];

  isGroup: boolean;
  chatName?: string;

  lastMessage?: Types.ObjectId;

  admin: Types.ObjectId[];
  createdBy?: Types.ObjectId;

  isDeleted: boolean;
  deletedAt: Date;

  deletedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;

  requestPending: boolean;
  requestInitiator: Types.ObjectId;
}

const ChatSchema: Schema<IChat> = new Schema(
  {
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    isGroup: {
      type: Boolean,
      default: false,
    },

    chatName: {
      type: String,
      trim: true,
    },

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },

    admin: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    requestPending: {
      type: Boolean,
      default: false,
    },

    requestInitiator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

ChatSchema.index({ members: 1, requestPending: 1 });
ChatSchema.index({ requestInitiator: 1 });

export const Chat = model<IChat>("Chat", ChatSchema);
