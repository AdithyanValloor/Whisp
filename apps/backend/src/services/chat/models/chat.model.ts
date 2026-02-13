import mongoose, {Schema, model, Document, Types} from "mongoose";

export interface IChat extends Document {
 _id: Types.ObjectId;  
  members: Types.ObjectId[];

  isGroup: boolean;
  chatName?: string;

  lastMessage?: Types.ObjectId;

  admin: Types.ObjectId[];
  createdBy?: Types.ObjectId;

  unreadCounts: Map<string, number>;

  createdAt: Date;
  updatedAt: Date;
}


const ChatSchema:Schema<IChat> = new Schema(
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

    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

export const Chat = model<IChat>("Chat", ChatSchema);

