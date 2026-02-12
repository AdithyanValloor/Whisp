import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/utils/axiosInstance";
import axios from "axios";
import { setUser } from "./authSlice";
import type { AuthUser } from "./authSlice";

/* -------------------- TYPES -------------------- */

/**
 * User profile model.
 * Represents editable profile data separate from auth state.
 */
export interface Profile {
  _id: string;
  displayName: string;
  username: string;
  pronouns?: string;
  bio?: string;
  status?: string;
  createdAt?: string;
  profilePicture?: {
    url: string | null;
  };
}

/**
 * Profile slice state.
 * Tracks profile data and request lifecycle.
 */
interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  fetched: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  fetched: false,
  error: null,
};

/* -------------------- THUNKS -------------------- */

/**
 * Fetch the current user's profile.
 */
export const fetchProfile = createAsyncThunk<
  Profile,
  void,
  { rejectValue: string }
>("profile/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/profile", { withCredentials: true });
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch profile"
      );
    }
    return rejectWithValue("Failed to fetch profile");
  }
});

/**
 * Update the user's profile.
 * Also synchronizes relevant fields with the auth slice.
 */
export const updateProfile = createAsyncThunk<
  Profile,
  Partial<Profile>,
  { rejectValue: string }
>("profile/update", async (data, { dispatch, rejectWithValue }) => {
  try {
    const res = await api.put("/profile", data, { withCredentials: true });

    const updatedProfile: Profile = res.data;

    /**
     * Sync auth user with updated profile fields
     * (e.g., display name and profile picture).
     */
    dispatch(
      setUser({
        user: {
          _id: updatedProfile._id,
          displayName: updatedProfile.displayName,
          username: updatedProfile.username,
          profilePicture: updatedProfile.profilePicture ?? null,
        } as AuthUser,
      })
    );

    return updatedProfile;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to update profile"
      );
    }
    return rejectWithValue("Failed to update profile");
  }
});

/* -------------------- SLICE -------------------- */

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    /**
     * Clear profile state (e.g., on logout).
     */
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
      state.fetched = false;
    },
  },
  extraReducers: (builder) => {
    builder
      /* -------- FETCH PROFILE -------- */
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.fetched = true;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to fetch profile";
      })

      /* -------- UPDATE PROFILE -------- */
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to update profile";
      });
  },
});

export const { clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
