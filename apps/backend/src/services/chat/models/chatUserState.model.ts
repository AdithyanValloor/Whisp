import { Schema, model, Types } from "mongoose";

export interface IChatUserState {
  userId: Types.ObjectId;
  chatId: Types.ObjectId;
  isArchived: boolean;
  isPinned: boolean;
  clearedAt?: Date | null;
  lastReadAt?: Date | null;
  mutedUntil?: Date | null;
}

const chatUserStateSchema = new Schema<IChatUserState>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
    lastReadAt: {
      type: Date,
      default: null,
    },
    mutedUntil: { 
      type: Date, 
      default: null 
    },
  },
  { timestamps: true },
);

chatUserStateSchema.index({ userId: 1, chatId: 1 }, { unique: true });

export const ChatUserStateModel = model<IChatUserState>(
  "ChatUserState",
  chatUserStateSchema,
);
