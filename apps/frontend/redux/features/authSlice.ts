import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";
import axios from "axios";
import { mapAuthUser } from "@/utils/mapAuthUser";

/**
 * Authenticated user model stored in Redux.
 * This represents the client-side view of the user,
 * not the raw API response.
 */
export interface AuthUser {
  _id: string;
  displayName: string;
  username: string;
  profilePicture: { url: string | null; public_id: string | null } | null;
  coverPicture?: { url: string | null; public_id: string | null } | null;
  bio?: string;
  pronouns?: string;
  createdAt?: string;
  isActive?: boolean;
  isBanned?: boolean;
}

/**
 * Authentication slice state.
 * Holds the current user and request status.
 */

interface AuthState {
  user: AuthUser | null;
  sessionLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  sessionLoading: true,
  error: null,
};

/**
 * Successful authentication response shape
 * shared by login refresh flows.
 */
interface AuthSuccessPayload {
  user: AuthUser;
}

// ---------------- THUNKS ----------------

/**
 * Log in a user using email and password.
 * On success, stores the authenticated user.
 */
export const loginUser = createAsyncThunk<
  AuthSuccessPayload,
  { email: string; password: string },
  { rejectValue: string }
>("auth/loginUser", async ({ email, password }, { rejectWithValue }) => {
  try {
    const response = await api.post("/user/login", { email, password });

    return {
      user: mapAuthUser(response.data.user),
    };

  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      return rejectWithValue(err.response?.data?.message ?? "Login failed");
    }
    return rejectWithValue("Login failed");
  }
});

/**
 * Fetch the currently authenticated user.
 * Used on app initialization to restore session state.
 */
export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: string }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/user/me");

    return mapAuthUser(res.data.user);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch user",
      );
    }
    return rejectWithValue("Failed to fetch user");
  }
});

/**
 * Log out the current user and clear authentication state.
 */
export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/user/logout");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        return rejectWithValue(err.response?.data?.message ?? "Logout failed");
      }
      return rejectWithValue("Logout failed");
    }
  },
);

// ---------------- SLICE ----------------

/**
 * Authentication slice.
 * Manages user session and auth-related loading/error state.
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Sets the authenticated user.
     */
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.sessionLoading = false;
        state.error = null;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload ?? "Login failed";
      })

      // SESSION RESTORE
      .addCase(fetchCurrentUser.pending, (state) => {
        state.sessionLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.sessionLoading = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.sessionLoading = false;
        state.user = null;
      })

      //LOGOUT
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.error = null;
        state.sessionLoading = false;
      });

  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
