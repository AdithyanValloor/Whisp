import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";
import { sendMessage } from "./messageSlice";

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
  createdBy?: ChatUser;
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

interface CreateGroupResponse {
  message: string;
  groupChat: Chat;
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

/* -------------------- GROUP THUNKS ------------------ */

/**
 * Create a new group chat with selected members.
 */
export const createGroupChat = createAsyncThunk<
  Chat,
  { name: string; userIds: string[] },
  { rejectValue: string }
>("group/createGroupChat", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post<CreateGroupResponse>("/group", data);
    return res.data.groupChat;
  } catch {
    return rejectWithValue("Failed to create group");
  }
});

/**
 * Add new members to an existing group.
 */
export const addMembers = createAsyncThunk<
  Chat,
  { chatId: string; members: string[] },
  { rejectValue: string }
>("group/addMembers", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post<Chat>("/group/members", data);
    return res.data;
  } catch {
    return rejectWithValue("Failed to add members");
  }
});

/**
 * Remove a member from a group.
 */
export const removeMembers = createAsyncThunk<
  Chat,
  { chatId: string; member: string },
  { rejectValue: string }
>("group/removeMembers", async (data, { rejectWithValue }) => {
  try {
    const res = await api.delete<Chat>("/group/members", { data });
    return res.data;
  } catch {
    return rejectWithValue("Failed to remove member");
  }
});

/**
 * Grant or revoke admin privileges for a group member.
 */
export const toggleAdmin = createAsyncThunk<
  Chat,
  { chatId: string; member: string; makeAdmin: boolean },
  { rejectValue: string }
>("group/toggleAdmin", async (data, { rejectWithValue }) => {
  try {
    const res = await api.patch<Chat>("/group/admin", data);
    return res.data;
  } catch {
    return rejectWithValue("Failed to toggle admin");
  }
});

/**
 * Leave a group chat.
 */
export const leaveGroup = createAsyncThunk<
  string,
  { chatId: string },
  { rejectValue: string }
>("group/leaveGroup", async (data, { rejectWithValue }) => {
  try {
    await api.post("/group/leave", data);
    return data.chatId;
  } catch {
    return rejectWithValue("Failed to leave group");
  }
});

/**
 * Delete group ( owner only )
 */
export const deleteGroup = createAsyncThunk<
  string,
  { chatId: string },
  { rejectValue: string }
>("group/deleteGroup", async (data, { rejectWithValue }) => {
  try {
    await api.delete("/group/delete", { data });
    return data.chatId;
  } catch {
    return rejectWithValue("Failed to delete group");
  }
});

/***
 * Transfer group ownership
 */
export const transferOwnership = createAsyncThunk<
  Chat,
  { chatId: string; newOwnerId: string },
  { rejectValue: string }
>("group/transferOwnership", async (data, { rejectWithValue }) => {
  try {
    const res = await api.patch("/group/transfer-ownership", data);
    return res.data.chat;
  } catch {
    return rejectWithValue("Failed to transfer ownership");
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
      action: PayloadAction<{ chatId: string; message: ChatMessage }>,
    ) => {
      const { chatId, message } = action.payload;

      const chat = state.chats.find((c) => c._id === chatId);
      if (!chat) return;

      chat.lastMessage = message;

      // Re-sort chats by latest activity
      state.chats.sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt ?? 0).getTime() -
          new Date(a.lastMessage?.createdAt ?? 0).getTime(),
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
            new Date(a.lastMessage?.createdAt ?? 0).getTime(),
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
      })
      .addCase(createGroupChat.pending, (state) => {
        state.accessLoading = true;
      })

      .addCase(createGroupChat.fulfilled, (state, action) => {
        state.accessLoading = false;
        state.chats.unshift(action.payload);
      })

      .addCase(createGroupChat.rejected, (state, action) => {
        state.accessLoading = false;
        state.error = action.payload ?? "Failed to create group";
      })

      /* -------- GROUP MUTATIONS -------- */
      .addCase(addMembers.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((g) => g._id === action.payload._id);
        if (idx !== -1) state.chats[idx] = action.payload;
      })
      .addCase(removeMembers.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((g) => g._id === action.payload._id);
        if (idx !== -1) state.chats[idx] = action.payload;
      })
      .addCase(toggleAdmin.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((g) => g._id === action.payload._id);
        if (idx !== -1) state.chats[idx] = action.payload;
      })

      /* -------- LEAVE GROUP -------- */
      .addCase(leaveGroup.fulfilled, (state, action) => {
        state.chats = state.chats.filter((g) => g._id !== action.payload);
      })

      /* -------- DELETE GROUP -------- */
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.chats = state.chats.filter((g) => g._id !== action.payload);
      })

      /* -------- TRANSFER OWNERSHIP -------- */
      .addCase(transferOwnership.fulfilled, (state, action) => {
        const idx = state.chats.findIndex((g) => g._id === action.payload._id);
        if (idx !== -1) state.chats[idx] = action.payload;
      })

      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;

        const chat = state.chats.find((c) => c._id === msg.chat);
        if (!chat) return;

        chat.lastMessage = {
          _id: msg._id,
          chat: msg.chat,
          sender: msg.sender._id,
          content: msg.content,
          edited: msg.edited ?? false,
          deleted: msg.deleted ?? false,
          deliveredTo: msg.deliveredTo ?? [],
          seenBy: msg.seenBy ?? [],
          replyTo: msg.replyTo?._id ?? null,
          reactions: [],
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt ?? msg.createdAt,
        };

        state.chats.sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt ?? 0).getTime() -
            new Date(a.lastMessage?.createdAt ?? 0).getTime(),
        );
      });
  },
});

export const { updateChatLatestMessage } = chatSlice.actions;
export default chatSlice.reducer;
