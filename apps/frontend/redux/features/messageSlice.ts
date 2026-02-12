import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";
import axios from "axios";

/* -------------------- TYPES -------------------- */

/**
 * Normalized message entity stored in Redux.
 * References related entities (chat, sender, reply) by ID or embedded snapshot.
 */
export interface MessageType {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    username: string;
    displayName?: string;
    profilePicture?: { url: string | null };
  };
  content: string;
  createdAt: string;
  updatedAt?: string;
  edited?: boolean;
  deleted?: boolean;
  deliveredTo?: string[];
  seenBy?: string[];
  replyTo?: {
    _id: string;
    content: string;
    sender: { _id: string; username: string; displayName?: string };
  } | null;
  reactions?: {
    emoji: string;
    user: { _id: string; username: string };
  }[];
}

/**
 * Pagination metadata tracked per chat.
 */
export interface ChatMeta {
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Messages slice state.
 * Uses normalized storage for efficient updates and lookups.
 */
interface MessagesState {
  byId: Record<string, MessageType>;      // messageId → message
  messages: Record<string, string[]>;     // chatId → ordered messageIds
  meta: Record<string, ChatMeta | undefined>;
  listLoading: boolean;
  sendLoading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  byId: {},
  messages: {},
  meta: {},
  listLoading: false,
  sendLoading: false,
  error: null,
};

/* -------------------- THUNKS -------------------- */

/**
 * Fetch paginated messages for a chat.
 * Accepts either a chatId string or an options object.
 */
type FetchArg = string | { chatId: string; page?: number; limit?: number };

export const fetchMessages = createAsyncThunk<
  {
    chatId: string;
    messages: MessageType[];
    page: number;
    totalPages?: number;
  },
  FetchArg,
  { rejectValue: string }
>("messages/fetchMessages", async (arg, { rejectWithValue }) => {
  try {
    const { chatId, page, limit } =
      typeof arg === "string"
        ? { chatId: arg, page: 1, limit: 20 }
        : { chatId: arg.chatId, page: arg.page ?? 1, limit: arg.limit ?? 20 };

    const res = await api.get(
      `/message/${chatId}?page=${page}&limit=${limit}`
    );

    const payload = res.data;

    return {
      chatId,
      messages: payload.messages ?? payload,
      page: payload.currentPage ?? page,
      totalPages: payload.totalPages,
    };
  } catch {
    return rejectWithValue("Failed to fetch messages");
  }
});

/**
 * Send a new message.
 */
export const sendMessage = createAsyncThunk<
  MessageType,
  { chatId: string; content: string; replyTo?: string | null },
  { rejectValue: string }
>("messages/send", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/message", data, {
      withCredentials: true,
    });
    return res.data;
  } catch {
    return rejectWithValue("Failed to send message");
  }
});

/**
 * Toggle a reaction on a message.
 */
export const toggleReaction = createAsyncThunk<
  MessageType,
  { messageId: string; emoji: string },
  { rejectValue: string }
>("messages/toggleReaction", async ({ messageId, emoji }, { rejectWithValue }) => {
  try {
    const res = await api.post(
      `/message/react/${messageId}`,
      { emoji },
      { withCredentials: true }
    );
    return res.data;
  } catch {
    return rejectWithValue("Failed to toggle reaction");
  }
});

/**
 * Mark all messages in a chat as read (server-side).
 */
export const markChatAsRead = createAsyncThunk<
  { chatId: string },
  string,
  { rejectValue: string }
>("messages/markChatAsRead", async (chatId, { rejectWithValue }) => {
  try {
    await api.post(`/message/mark-read/${chatId}`, {}, { withCredentials: true });
    return { chatId };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to mark chat as read"
      );
    }
    return rejectWithValue("Failed to mark chat as read");
  }
});

/**
 * Mark messages as seen by the current user.
 */
export const markMessagesAsSeen = createAsyncThunk<
  { chatId: string },
  string,
  { rejectValue: string }
>("messages/markMessagesAsSeen", async (chatId, { rejectWithValue }) => {
  try {
    await api.post(`/message/mark-seen/${chatId}`, {}, { withCredentials: true });
    return { chatId };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to mark messages as seen"
      );
    }
    return rejectWithValue("Failed to mark messages as seen");
  }
});

/**
 * Edit an existing message.
 */
export const editMessageApi = createAsyncThunk<
  MessageType,
  { chatId: string; messageId: string; content: string },
  { rejectValue: string }
>("messages/editMessage", async ({ messageId, content }, { rejectWithValue }) => {
  try {
    const res = await api.put(
      `/message/${messageId}`,
      { content },
      { withCredentials: true }
    );
    return res.data;
  } catch {
    return rejectWithValue("Failed to edit message");
  }
});

/**
 * Soft-delete a message.
 */
export const deleteMessageApi = createAsyncThunk<
  MessageType,
  { chatId: string; messageId: string },
  { rejectValue: string }
>("messages/deleteMessage", async ({ messageId }, { rejectWithValue }) => {
  try {
    const res = await api.delete(`/message/${messageId}`, {
      withCredentials: true,
    });
    return res.data;
  } catch {
    return rejectWithValue("Failed to delete message");
  }
});

/* -------------------- HELPERS -------------------- */


export function insertMessageSorted(
  state: MessagesState,
  chatId: string,
  message: MessageType
) {
  state.byId[message._id] = message;

  const prevIds = state.messages[chatId] ?? [];

  if (prevIds.includes(message._id)) return;

  const index = prevIds.findIndex(
    (id) =>
      new Date(state.byId[id].createdAt).getTime() >
      new Date(message.createdAt).getTime()
  );

  let nextIds: string[];

  if (index === -1) {
    nextIds = [...prevIds, message._id];
  } else {
    nextIds = [
      ...prevIds.slice(0, index),
      message._id,
      ...prevIds.slice(index),
    ];
  }

  state.messages[chatId] = nextIds;
}

/* -------------------- SLICE -------------------- */

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    /**
     * Insert a message locally (used by socket events).
     */
    insertMessage: (
      state,
      action: PayloadAction<{ chatId: string; message: MessageType }>
    ) => {
      insertMessageSorted(state, action.payload.chatId, action.payload.message);
    },

    /**
     * Update message content/state from socket edits.
     */
    editMessage: (
      state,
      action: PayloadAction<{ message: MessageType }>
    ) => {
      state.byId[action.payload.message._id] = action.payload.message;
    },

    /**
     * Apply soft-delete updates from socket events.
     */
    deleteMessage: (
      state,
      action: PayloadAction<{ message: MessageType }>
    ) => {
      state.byId[action.payload.message._id] = action.payload.message;
    },

    /**
     * Track delivery status per user.
     */
    updateMessageDelivery: (
      state,
      action: PayloadAction<{ chatId: string; messageId: string; userId: string }>
    ) => {
      const msg = state.byId[action.payload.messageId];
      if (!msg) return;

      msg.deliveredTo ??= [];
      if (!msg.deliveredTo.includes(action.payload.userId)) {
        msg.deliveredTo.push(action.payload.userId);
      }
    },

    /**
     * Track seen status and remove from delivery list.
     */
    updateMessageSeen: (
      state,
      action: PayloadAction<{ messageId: string; userId: string }>
    ) => {
      const msg = state.byId[action.payload.messageId];
      if (!msg) return;

      msg.seenBy ??= [];
      if (!msg.seenBy.includes(action.payload.userId)) {
        msg.seenBy.push(action.payload.userId);
      }

      msg.deliveredTo = msg.deliveredTo?.filter(
        (id) => id !== action.payload.userId
      );
    },

    /**
     * Mark all messages in a chat as seen by a user.
     */
    markAllMessagesSeen: (
      state,
      action: PayloadAction<{ chatId: string; userId: string }>
    ) => {
      const { chatId, userId } = action.payload;
      const messageIds = state.messages[chatId] || [];

      messageIds.forEach((msgId) => {
        const msg = state.byId[msgId];
        if (!msg) return;

        msg.seenBy ??= [];
        if (!msg.seenBy.includes(userId)) {
          msg.seenBy.push(userId);
        }

        msg.deliveredTo = msg.deliveredTo?.filter((id) => id !== userId);
      });
    },
  },

  extraReducers: (builder) => {
    builder
      /* -------- FETCH MESSAGES -------- */
      .addCase(fetchMessages.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.listLoading = false;

        const { chatId, messages, page, totalPages } = action.payload;
        state.messages[chatId] ??= [];

        messages.forEach((msg) => {
          insertMessageSorted(state, chatId, msg);
        });

        state.meta[chatId] = {
          page,
          totalPages: totalPages ?? page,
          hasMore: totalPages ? page < totalPages : false,
        };
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload ?? "Failed to fetch messages";
      })

      /* -------- SEND MESSAGE -------- */
      .addCase(sendMessage.pending, (state) => {
        state.sendLoading = true;
      })
     .addCase(sendMessage.fulfilled, (state, action) => {
        state.sendLoading = false;

        const msg = action.payload;
        insertMessageSorted(state, msg.chat, msg);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sendLoading = false;
        state.error = action.payload ?? "Failed to send message";
      })

      /* -------- EDIT / DELETE / REACT -------- */
      .addCase(editMessageApi.fulfilled, (state, action) => {
        state.byId[action.payload._id] = action.payload;
      })
      .addCase(deleteMessageApi.fulfilled, (state, action) => {
        state.byId[action.payload._id] = action.payload;
      })
      .addCase(toggleReaction.fulfilled, (state, action) => {
        state.byId[action.payload._id] = action.payload;
      });
  },
});

export const {
  editMessage,
  deleteMessage,
  updateMessageDelivery,
  updateMessageSeen,
  markAllMessagesSeen,
  insertMessage,
} = messagesSlice.actions;

export default messagesSlice.reducer;
