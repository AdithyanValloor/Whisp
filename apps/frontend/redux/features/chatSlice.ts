import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";

/* -------------------- TYPES -------------------- */

/**
 * Minimal user representation used within chat contexts.
 */
export interface ChatUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: {
    url: string | null;
    public_id: string | null;
  };
}

/**
 * Reaction metadata attached to a message.
 */
export interface MessageReaction {
  _id: string;
  emoji: string;
  user: string;
}

/**
 * Normalized message model used in chat state.
 * References related entities by ID.
 */
export interface ChatMessage {
  _id: string;
  chat: string;
  sender: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  deliveredTo: string[];
  seenBy: string[];
  replyTo: string | null;
  reactions: MessageReaction[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Chat / conversation model.
 * Contains participants and metadata, with an optional last-message preview.
 */
export interface Chat {
  _id: string;
  members: ChatUser[];
  isGroup: boolean;
  chatName: string;
  admin: ChatUser[];
  createdBy?: string;
  unreadCounts: Record<string, number>;
  lastMessage?: ChatMessage;
  createdAt: string;
  updatedAt: string;
}

/**
 * Chat slice state.
 * Tracks chat list, active chat selection, and request status.
 */
interface ChatState {
  chats: Chat[];
  listLoading: boolean;
  accessLoading: boolean;
  error: string | null;
}

/* -------------------- THUNKS -------------------- */

/**
 * Fetch all chats accessible to the current user.
 */
export const fetchChats = createAsyncThunk<
  Chat[],
  void,
  { rejectValue: string }
>("chat/fetchChats", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<Chat[]>("/chat");
    return res.data;
  } catch {
    return rejectWithValue("Failed to fetch chats");
  }
});

/**
 * Create or access a direct chat with another user.
 */
export const accessChat = createAsyncThunk<
  Chat,
  string,
  { rejectValue: string }
>("chat/accessChat", async (userId, { rejectWithValue }) => {
  try {
    const res = await api.post<Chat>("/chat/access", { userId });
    return res.data;
  } catch {
    return rejectWithValue("Failed to access chat");
  }
});

/* -------------------- SLICE -------------------- */

const initialState: ChatState = {
  chats: [],
  listLoading: false,
  accessLoading: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {

    /**
     * Update the latest message for a chat and
     * re-order chats based on recent activity.
     */
    updateChatLatestMessage: (
      state,
      action: PayloadAction<{ chatId: string; message: ChatMessage }>
    ) => {
      const { chatId, message } = action.payload;

      const chat = state.chats.find((c) => c._id === chatId);
      if (!chat) return;

      chat.lastMessage = message;

      // Re-sort chats by latest activity
      state.chats.sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt ?? 0).getTime() -
          new Date(a.lastMessage?.createdAt ?? 0).getTime()
      );
    },
  },

  extraReducers: (builder) => {
    builder
      /* -------- FETCH CHATS -------- */
      .addCase(fetchChats.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.listLoading = false;

        // Sort chats by most recent message
        state.chats = action.payload.sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt ?? 0).getTime() -
            new Date(a.lastMessage?.createdAt ?? 0).getTime()
        );
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload ?? "Failed to fetch chats";
      })

      /* -------- ACCESS CHAT -------- */
      .addCase(accessChat.pending, (state) => {
        state.accessLoading = true;
        state.error = null;
      })
      .addCase(accessChat.fulfilled, (state, action) => {
        state.accessLoading = false;

        const chat = action.payload;
        const existing = state.chats.find((c) => c._id === chat._id);

        if (!existing) {
          state.chats.unshift(chat);
        }
      })
      .addCase(accessChat.rejected, (state, action) => {
        state.accessLoading = false;
        state.error = action.payload ?? "Failed to access chat";
      });
  },
});

export const { updateChatLatestMessage } = chatSlice.actions;
export default chatSlice.reducer;
