import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";

/* -------------------- TYPES -------------------- */

/**
 * Lightweight user representation used in friends context.
 */
export interface FriendUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: {
    url: string | null;
    public_id: string | null;
  };
  isActive?: boolean;
  isBanned?: boolean;
}

/**
 * Friend request model representing incoming and outgoing requests.
 */
export interface FriendRequest {
  _id: string;
  from: FriendUser;
  to: FriendUser;
  createdAt?: string;
}

/**
 * Friends slice state.
 * Manages friend list, requests, and related loading states.
 */
interface FriendsState {
  friends: FriendUser[];
  requests: {
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
  };
  listLoading: boolean;
  requestLoading: boolean;
  actionLoading: boolean;
  error: string | null;
}

/* -------------------- THUNKS -------------------- */

/**
 * Fetch the current user's friend list.
 */
export const fetchFriends = createAsyncThunk<
  FriendUser[],
  void,
  { rejectValue: string }
>("friends/fetchFriends", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/friends", { withCredentials: true });
    return res.data.friendList;
  } catch {
    return rejectWithValue("Failed to fetch friends");
  }
});

/**
 * Fetch incoming and outgoing friend requests.
 */
export const fetchRequests = createAsyncThunk<
  { incoming: FriendRequest[]; outgoing: FriendRequest[] },
  void,
  { rejectValue: string }
>("friends/fetchRequests", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/friends/requests", { withCredentials: true });
    return res.data;
  } catch {
    return rejectWithValue("Failed to fetch requests");
  }
});

/**
 * Send a friend request to another user.
 */
export const addFriend = createAsyncThunk<
  FriendRequest,
  string,
  { rejectValue: string }
>("friends/addFriend", async (username, { rejectWithValue }) => {
  try {
    const res = await api.post(
      "/friends",
      { username },
      { withCredentials: true }
    );
    return res.data.request;
  } catch {
    return rejectWithValue("Failed to send request");
  }
});

/**
 * Accept an incoming friend request.
 */
export const acceptFriend = createAsyncThunk<
  FriendRequest,
  string,
  { rejectValue: string }
>("friends/acceptFriend", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(
      "/friends/accept",
      { id },
      { withCredentials: true }
    );
    return res.data.request;
  } catch {
    return rejectWithValue("Failed to accept request");
  }
});

/**
 * Reject an incoming friend request.
 */
export const rejectFriend = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("friends/rejectFriend", async (id, { rejectWithValue }) => {
  try {
    await api.post(
      "/friends/reject",
      { id },
      { withCredentials: true }
    );
    return id;
  } catch {
    return rejectWithValue("Failed to reject request");
  }
});

/**
 * Cancel an outgoing friend request.
 */
export const cancelFriend = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("friends/cancelFriend", async (id, { rejectWithValue }) => {
  try {
    await api.post(
      "/friends/cancel",
      { id },
      { withCredentials: true }
    );
    return id;
  } catch {
    return rejectWithValue("Failed to cancel request");
  }
});

/**
 * Remove an existing friend.
 */
export const removeFriend = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("friends/removeFriend", async (id, { rejectWithValue }) => {
  try {
    await api.post(
      "/friends/remove",
      { id },
      { withCredentials: true }
    );
    return id;
  } catch {
    return rejectWithValue("Failed to remove friend");
  }
});

/* -------------------- SLICE -------------------- */

const initialState: FriendsState = {
  friends: [],
  requests: { incoming: [], outgoing: [] },
  listLoading: false,
  requestLoading: false,
  actionLoading: false,
  error: null,
};

const friendSlice = createSlice({
  name: "friends",
  initialState,
  reducers: {
    // ---------- SOCKET: REQUESTS ----------
    addIncomingRequest: (state, action) => {
      const exists = state.requests.incoming.some(
        (r) => r._id === action.payload._id
      );
      if (!exists) {
        state.requests.incoming.push(action.payload);
      }
    },

    addOutgoingRequest: (state, action) => {
      const exists = state.requests.outgoing.some(
        (r) => r._id === action.payload._id
      );
      if (!exists) {
        state.requests.outgoing.push(action.payload);
      }
    },

    removeIncomingRequest: (state, action) => {
      state.requests.incoming = state.requests.incoming.filter(
        (r) => r._id !== action.payload
      );
    },

    removeOutgoingRequest: (state, action) => {
      state.requests.outgoing = state.requests.outgoing.filter(
        (r) => r._id !== action.payload
      );
    },

    // ---------- SOCKET: FRIENDS ----------
   addFriendFromSocket: (state, action) => {
      const { requestId, friend } = action.payload;

      state.requests.incoming =
        state.requests.incoming.filter(r => r._id !== requestId);

      state.requests.outgoing =
        state.requests.outgoing.filter(r => r._id !== requestId);

      if (!state.friends.some(f => f._id === friend._id)) {
        state.friends.push(friend);
      }
    },
    removeFriendFromSocket: (state, action) => {
      const removedUserId = action.payload;

      state.friends = state.friends.filter(
        f => f._id !== removedUserId
      );

      state.requests.incoming = state.requests.incoming.filter(
        r => r.from._id !== removedUserId && r.to._id !== removedUserId
      );

      state.requests.outgoing = state.requests.outgoing.filter(
        r => r.from._id !== removedUserId && r.to._id !== removedUserId
      );
    },
    setActionLoading: (state, action) => {
      state.actionLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      /* -------- FETCH FRIENDS -------- */
      .addCase(fetchFriends.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.listLoading = false;
        state.friends = action.payload;
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload ?? "Failed to fetch friends";
      })

      /* -------- FETCH REQUESTS -------- */
      .addCase(fetchRequests.pending, (state) => {
        state.requestLoading = true;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.requestLoading = false;
        state.requests = action.payload;
      })
      .addCase(fetchRequests.rejected, (state, action) => {
        state.requestLoading = false;
        state.error = action.payload ?? "Failed to fetch requests";
      })

      /* -------- ADD FRIEND -------- */
      .addCase(addFriend.fulfilled, (state, action) => {
        state.requests.outgoing.push(action.payload);
      })

      /* -------- ACCEPT FRIEND -------- */
      .addCase(acceptFriend.fulfilled, (state, action) => {
        const request = action.payload;

        state.requests.incoming = state.requests.incoming.filter(
          (r) => r._id !== request._id
        );

        state.friends.push(request.from);
      })

      /* -------- REJECT / CANCEL -------- */
      .addCase(rejectFriend.fulfilled, (state, action) => {
        state.requests.incoming = state.requests.incoming.filter(
          (r) => r._id !== action.payload
        );
      })
      .addCase(cancelFriend.fulfilled, (state, action) => {
        state.requests.outgoing = state.requests.outgoing.filter(
          (r) => r._id !== action.payload
        );
      })

      /* -------- REMOVE FRIEND -------- */
      .addCase(removeFriend.fulfilled, (state, action) => {
        state.friends = state.friends.filter(
          (f) => f._id !== action.payload
        );
      });
  },
});

export const {
  addIncomingRequest,
  addOutgoingRequest,
  removeIncomingRequest,
  removeOutgoingRequest,
  addFriendFromSocket,
  removeFriendFromSocket,
} = friendSlice.actions;

export default friendSlice.reducer;
