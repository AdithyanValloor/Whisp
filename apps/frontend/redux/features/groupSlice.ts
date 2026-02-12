import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";

/* -------------------- TYPES -------------------- */

/**
 * Lightweight user representation used within group chats.
 */
export interface GroupUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: {
    url: string | null;
    public_id: string | null;
  };
}

/**
 * Group chat model.
 * Represents a multi-user conversation with admin controls.
 */
export interface Group {
  _id: string;
  chatName: string;
  isGroup: true;

  members: GroupUser[];
  admin: GroupUser[];

  createdBy: string;

  unreadCounts: Record<string, number>;

  lastMessage?: {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
  };

  createdAt: string;
  updatedAt: string;
}

/**
 * Group slice state.
 * Manages group list, active selection, and request status.
 */
interface GroupState {
  groups: Group[];
  selectedGroupId: string | null;
  listLoading: boolean;
  actionLoading: boolean;
  error: string | null;
}

/* -------------------- THUNKS -------------------- */

/**
 * Fetch all group chats accessible to the current user.
 */
export const fetchGroups = createAsyncThunk<
  Group[],
  void,
  { rejectValue: string }
>("group/fetchGroups", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<Group[]>("/group");
    return res.data;
  } catch {
    return rejectWithValue("Failed to fetch groups");
  }
});

/**
 * Fetch a single group chat by its ID.
 * Used when navigating directly or restoring state.
 */
export const fetchGroupById = createAsyncThunk<
  Group,
  string,
  { rejectValue: string }
>("group/fetchGroupById", async (chatId, { rejectWithValue }) => {
  try {
    const res = await api.get<Group>(`/group/${chatId}`);
    return res.data;
  } catch {
    return rejectWithValue("Failed to fetch group");
  }
});

/**
 * Create a new group chat with selected members.
 */
export const createGroupChat = createAsyncThunk<
  Group,
  { name: string; userIds: string[] },
  { rejectValue: string }
>("group/createGroupChat", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post<Group>("/group", data);
    return res.data;
  } catch {
    return rejectWithValue("Failed to create group");
  }
});

/**
 * Add new members to an existing group.
 */
export const addMembers = createAsyncThunk<
  Group,
  { chatId: string; members: string[] },
  { rejectValue: string }
>("group/addMembers", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post<Group>("/group/members", data);
    return res.data;
  } catch {
    return rejectWithValue("Failed to add members");
  }
});

/**
 * Remove a member from a group.
 */
export const removeMembers = createAsyncThunk<
  Group,
  { chatId: string; member: string },
  { rejectValue: string }
>("group/removeMembers", async (data, { rejectWithValue }) => {
  try {
    const res = await api.delete<Group>("/group/members", { data });
    return res.data;
  } catch {
    return rejectWithValue("Failed to remove member");
  }
});

/**
 * Grant or revoke admin privileges for a group member.
 */
export const toggleAdmin = createAsyncThunk<
  Group,
  { chatId: string; member: string; makeAdmin: boolean },
  { rejectValue: string }
>("group/toggleAdmin", async (data, { rejectWithValue }) => {
  try {
    const res = await api.patch<Group>("/group/admin", data);
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

/* -------------------- SLICE -------------------- */

const initialState: GroupState = {
  groups: [],
  selectedGroupId: null,
  listLoading: false,
  actionLoading: false,
  error: null,
};

const groupSlice = createSlice({
  name: "group",
  initialState,
  reducers: {
    /**
     * Set the currently active group by ID.
     */
    setSelectedGroup: (state, action: PayloadAction<string | null>) => {
      state.selectedGroupId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      /* -------- FETCH GROUPS -------- */
      .addCase(fetchGroups.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.listLoading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload ?? "Failed to fetch groups";
      })

      /* -------- CREATE GROUP -------- */
      .addCase(createGroupChat.fulfilled, (state, action) => {
        state.groups.unshift(action.payload);
        state.selectedGroupId = action.payload._id;
      })

      /* -------- GROUP MUTATIONS -------- */
      .addCase(addMembers.fulfilled, (state, action) => {
        const idx = state.groups.findIndex(
          (g) => g._id === action.payload._id
        );
        if (idx !== -1) state.groups[idx] = action.payload;
      })
      .addCase(removeMembers.fulfilled, (state, action) => {
        const idx = state.groups.findIndex(
          (g) => g._id === action.payload._id
        );
        if (idx !== -1) state.groups[idx] = action.payload;
      })
      .addCase(toggleAdmin.fulfilled, (state, action) => {
        const idx = state.groups.findIndex(
          (g) => g._id === action.payload._id
        );
        if (idx !== -1) state.groups[idx] = action.payload;
      })

      /* -------- LEAVE GROUP -------- */
      .addCase(leaveGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(
          (g) => g._id !== action.payload
        );

        if (state.selectedGroupId === action.payload) {
          state.selectedGroupId = null;
        }
      })

      /* -------- FETCH GROUP BY ID -------- */
      .addCase(fetchGroupById.fulfilled, (state, action) => {
        const idx = state.groups.findIndex(
          (g) => g._id === action.payload._id
        );

        if (idx !== -1) {
          state.groups[idx] = action.payload;
        } else {
          state.groups.push(action.payload);
        }

        state.selectedGroupId = action.payload._id;
      });
  },
});

export const { setSelectedGroup } = groupSlice.actions;
export default groupSlice.reducer;
