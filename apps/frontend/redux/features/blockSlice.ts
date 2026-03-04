import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";
import { removeFriendFromSocket } from "./friendsSlice";
import { removeChat } from "./chatSlice";

/* -------------------- TYPES -------------------- */

export interface BlockedUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: {
    url: string | null;
    public_id: string | null;
  };
}

interface BlockState {
  blockedUsers: BlockedUser[]; // users I have blocked
  blockedByUsers: string[]; // IDs of users who blocked me (for UI gating)
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

/* -------------------- THUNKS -------------------- */

/**
 * Fetch the list of users I have blocked.
 */
export const fetchBlockedUsers = createAsyncThunk<
  BlockedUser[],
  void,
  { rejectValue: string }
>("block/fetchBlocked", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/block", { withCredentials: true });
    return res.data.blockedUsers;
  } catch {
    return rejectWithValue("Failed to fetch blocked users");
  }
});

/**
 * Block a user by their ID.
 * Also cleans up friend state and the DM chat from Redux.
 */
export const blockUser = createAsyncThunk<
  { targetUserId: string },
  string,
  { rejectValue: string }
>("block/blockUser", async (targetUserId, { dispatch, rejectWithValue }) => {
  try {
    await api.post(`/block/${targetUserId}`, {}, { withCredentials: true });

    // Remove from friend list + clean up any stray requests
    dispatch(removeFriendFromSocket(targetUserId));

    return { targetUserId };
  } catch {
    return rejectWithValue("Failed to block user");
  }
});

/**
 * Unblock a user by their ID.
 */
export const unblockUser = createAsyncThunk<
  { targetUserId: string },
  string,
  { rejectValue: string }
>("block/unblockUser", async (targetUserId, { rejectWithValue }) => {
  try {
    await api.delete(`/block/${targetUserId}`, { withCredentials: true });
    return { targetUserId };
  } catch {
    return rejectWithValue("Failed to unblock user");
  }
});

/* -------------------- SLICE -------------------- */

const initialState: BlockState = {
  blockedUsers: [],
  blockedByUsers: [],
  loading: false,
  actionLoading: false,
  error: null,
};

const blockSlice = createSlice({
  name: "block",
  initialState,
  reducers: {
    /**
     * Socket: someone blocked me.
     * Add their ID to blockedByUsers so UI can gate interactions.
     */
    addBlockedBy: (state, action: PayloadAction<string>) => {
      if (!state.blockedByUsers.includes(action.payload)) {
        state.blockedByUsers.push(action.payload);
      }
    },

    /**
     * Socket: someone unblocked me.
     * Remove their ID from blockedByUsers.
     */
    removeBlockedBy: (state, action: PayloadAction<string>) => {
      state.blockedByUsers = state.blockedByUsers.filter(
        (id) => id !== action.payload,
      );
    },
    removeBlockedUser: (state, action: PayloadAction<string>) => {
      state.blockedUsers = state.blockedUsers.filter(
        (u) => u._id !== action.payload,
      );
    },
  },

  extraReducers: (builder) => {
    builder

      /* -------- FETCH BLOCKED -------- */
      .addCase(fetchBlockedUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlockedUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.blockedUsers = action.payload;
      })
      .addCase(fetchBlockedUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to fetch blocked users";
      })

      /* -------- BLOCK USER -------- */
      .addCase(blockUser.pending, (state, action) => {
        state.actionLoading = true;
        state.error = null;
        if (!state.blockedUsers.some((u) => u._id === action.meta.arg)) {
          state.blockedUsers.push({ _id: action.meta.arg, username: "" });
        }
      })
      .addCase(blockUser.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload ?? "Failed to block user";
        state.blockedUsers = state.blockedUsers.filter(
          (u) => u._id !== action.meta.arg,
        );
      })

      /* -------- UNBLOCK USER -------- */
      .addCase(unblockUser.pending, (state, action) => {
        state.actionLoading = true;
        state.blockedUsers = state.blockedUsers.filter(
          (u) => u._id !== action.meta.arg,
        );
      })
      .addCase(unblockUser.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.blockedUsers = state.blockedUsers.filter(
          (u) => u._id !== action.payload.targetUserId,
        );
      })
      .addCase(unblockUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload ?? "Failed to unblock user";
        if (!state.blockedUsers.some((u) => u._id === action.meta.arg)) {
          state.blockedUsers.push({ _id: action.meta.arg, username: "" });
        }
      });
  },
});

export const { addBlockedBy, removeBlockedBy, removeBlockedUser } =
  blockSlice.actions;

export default blockSlice.reducer;
