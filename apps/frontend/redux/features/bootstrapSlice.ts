import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchFriends, fetchRequests } from "./friendsSlice";
import { fetchChats } from "./chatSlice";
import { fetchUnreadCounts } from "./unreadSlice";
import { logoutUser } from "./authSlice";
import { fetchMessages } from "./messageSlice";
import type { RootState } from "@/redux/store";
import type { AuthUser } from "./authSlice";
import type { Chat } from "./chatSlice";
import type { FriendUser, FriendRequest } from "./friendsSlice";
import axios from "axios";

/**
 * Result returned after successful application bootstrap.
 * Contains all core data required to render the initial UI.
 */
interface BootstrapResult {
  currentUser: AuthUser;
  friends: FriendUser[];
  requests: {
    incoming: FriendRequest[];
    outgoing: FriendRequest[];
  };
  chats: Chat[];
  unread: Record<string, number>;
}

/**
 * Application bootstrap thunk.
 *
 * Orchestrates fetching of all essential data required
 * after authentication and before rendering the main UI.
 */
export const bootstrapApp = createAsyncThunk<
  BootstrapResult,
  void,
  {
    state: RootState;
    rejectValue: string;
  }
>("app/bootstrap", async (_, { dispatch, getState, rejectWithValue }) => {
  try {
    const state = getState();
    const currentUser = state.auth.user;

    console.log("CURRENT USER ------------------------ ", currentUser);
    

    // Ensure user is authenticated before bootstrapping
    if (!currentUser) {
      console.log("⏭ Skipping bootstrap: no authenticated user");
      return {
        currentUser: null,
        friends: [],
        requests: { incoming: [], outgoing: [] },
        chats: [],
        unread: {},
        onlineUsers: [],
      } as unknown as BootstrapResult;
    }


    console.log("🚀 Bootstrapping app for user:", currentUser.username);

    /**
     * Fetch core data in parallel to reduce startup latency.
     */
    const [friends, requests, chats, unread] =
      await Promise.all([
        dispatch(fetchFriends()).unwrap(),
        dispatch(fetchRequests()).unwrap(),
        dispatch(fetchChats()).unwrap(),
        dispatch(fetchUnreadCounts()).unwrap(),
      ]);


    console.log("✅ Core data fetched, now fetching last messages");

    /**
     * Fetch the latest message for each chat (non-blocking).
     * Failures for individual chats should not break bootstrap.
     */
    if (chats.length > 0) {
      const messagePromises = chats.map((chat) =>
        dispatch(
          fetchMessages({
            chatId: chat._id,
            page: 1,
            limit: 1,
          }),
        )
          .unwrap()
          .catch((err) => {
            console.warn(
              `Failed to fetch last message for chat ${chat._id}:`,
              err,
            );
            return null;
          }),
      );

      await Promise.allSettled(messagePromises);
    }

    console.log("✅ Bootstrap complete");

    return {
      currentUser,
      friends,
      requests,
      chats,
      unread,
    };
  } catch (error: unknown) {
    console.error("❌ Bootstrap failed:", error);

    /**
     * Handle authentication-related failures explicitly.
     * If session is invalid, force logout to reset state.
     */
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (
        status === 401 ||
        status === 403 ||
        error.response?.data?.message?.toLowerCase().includes("auth")
      ) {
        console.log("🔐 Auth error during bootstrap, logging out");
        dispatch(logoutUser());
      }

      return rejectWithValue(
        error.response?.data?.message ?? "Bootstrap failed",
      );
    }

    return rejectWithValue("Bootstrap failed");
  }
});
