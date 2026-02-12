import { io, Socket } from "socket.io-client";
import { store } from "@/redux/store";

import {
  editMessage,
  deleteMessage,
  updateMessageDelivery,
  markAllMessagesSeen,
  insertMessage,
} from "@/redux/features/messageSlice";

import { updateChatLatestMessage } from "@/redux/features/chatSlice";
import { setUnreadCount } from "@/redux/features/unreadSlice";
import { updatePresence } from "@/redux/features/presenceSlice";

import type {
  NewMessagePayload,
  UnreadUpdatePayload,
  PresenceUpdatePayload,
} from "@/types/socket.types";

import { normalizeSocketMessage, toChatLastMessage } from "./normalizeMessage";
import { typingStarted, typingStopped } from "@/redux/features/typingSlice";
import { addFriendFromSocket, addIncomingRequest, addOutgoingRequest, removeFriendFromSocket, removeIncomingRequest, removeOutgoingRequest } from "@/redux/features/friendsSlice";

/* -------------------- SINGLETON STATE -------------------- */

/**
 * Singleton socket instance shared across the application.
 * Ensures only one active WebSocket connection exists.
 */
let socket: Socket | null = null;

/**
 * Heartbeat interval used to keep user presence alive
 * while the socket connection is active.
 */
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const socketURL = process.env.NEXT_SOCKET_URL;

/* -------------------- SOCKET INITIALIZATION -------------------- */

/**
 * Returns the active socket instance or initializes a new one.
 *
 * Responsibilities:
 * - Manage connection lifecycle
 * - Join user and chat rooms
 * - Bind all real-time event listeners
 */
export const getSocket = (
  userId?: string,
  allChats: string[] = []
): Socket => {
  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(socketURL || "http://localhost:9000", {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    /* -------------------- CONNECT -------------------- */

    /**
     * On successful connection:
     * - Join personal user room
     * - Join all chat rooms
     * - Start heartbeat for presence tracking
     */
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket?.id);

      if (userId) {
        store.dispatch(updatePresence({ userId, status: "online" }));
        socket?.emit("join", userId);
      }
      allChats.forEach((chatId) => socket?.emit("joinGroup", chatId));

      if (heartbeatInterval) clearInterval(heartbeatInterval);

      heartbeatInterval = setInterval(() => {
        if (socket?.connected && userId) {
          socket.emit("heartbeat", { userId });
        }
      }, 10_000);
    });

    /* -------------------- NEW MESSAGE -------------------- */

    /**
     * Handle incoming messages.
     * Messages are normalized once and then distributed
     * to message state and chat preview state.
     */

    socket.on("new_message", (msg: NewMessagePayload) => {     
      const state = store.getState();
      const currentUserId = state.auth.user?._id;
      
      console.log("👤 Current user:", currentUserId, "Message sender:", msg.sender._id);

      // Ignore own messages (already handled optimistically)
      if (msg.sender._id === currentUserId) {
        console.log("⏭️ Skipping own message");
        return;
      }

      const normalized = normalizeSocketMessage(msg);
      
      store.dispatch(
        insertMessage({
          chatId: normalized.chat,
          message: normalized,
        })
      );

      store.dispatch(
        updateChatLatestMessage({
          chatId: normalized.chat,
          message: toChatLastMessage(msg),
        })
      );
      
      console.log("✅ Message dispatched successfully");
    });

    /* -------------------- EDIT MESSAGE -------------------- */

    /**
     * Apply message edits from real-time events.
     */
    socket.on("edit_message", (msg) => {
      store.dispatch(
        editMessage({ message: normalizeSocketMessage(msg) })
      );
    });

    /* -------------------- DELETE MESSAGE -------------------- */

    /**
     * Apply soft-delete updates to messages.
     */
    socket.on("delete_message", (msg) => {
      store.dispatch(
        deleteMessage({ message: normalizeSocketMessage(msg) })
      );
    });

    /* -------------------- MESSAGE REACTION -------------------- */

    /**
     * Reactions are treated as message updates.
     */
    socket.on("message_reaction", (msg) => {
      store.dispatch(
        editMessage({ message: normalizeSocketMessage(msg) })
      );
    });

    /* -------------------- MESSAGE DELIVERED -------------------- */

    /**
     * Update per-user delivery status for messages.
     */
    socket.on("message_delivered", ({ chatId, messageId, userId }) => {
      store.dispatch(
        updateMessageDelivery({
          chatId,
          messageId,
          userId,
        })
      );
    });

    /* -------------------- MESSAGES SEEN -------------------- */

    /**
     * Mark all messages in a chat as seen by a user.
     */
    socket.on("messages_seen", ({ chatId, userId }) => {
      store.dispatch(markAllMessagesSeen({ chatId, userId }));
    });

    /* -------------------- UNREAD COUNTS -------------------- */

    /**
     * Sync unread counts pushed from backend.
     * Backend remains the source of truth.
     */
    socket.on("unread_update", ({ chatId, count }: UnreadUpdatePayload) => {
      store.dispatch(setUnreadCount({ chatId, count }));
    });

    // socket.ts
    socket.on("typing", ({ userId, roomId, username, displayName }) => {
      store.dispatch(
        typingStarted({
          chatId: roomId,
          userId,
          name: displayName || username,
        })
      );
    });

    socket.on("stopTyping", ({ userId, roomId }) => {
      store.dispatch(
        typingStopped({
          chatId: roomId,
          userId,
        })
      );
    });

   // socket.ts

    socket.on("friend_request_received", (req) => {
      store.dispatch(addIncomingRequest(req));
    });

    socket.on("friend_request_sent", (req) => {
      store.dispatch(addOutgoingRequest(req));
    });

    socket.on("friend_request_accepted", (req) => {
      console.log("🎉 friend_request_accepted received:", req);
      const me = store.getState().auth.user?._id;
      if (!me) return;

      const friend = req.from._id === me ? req.to : req.from;

      store.dispatch(
        addFriendFromSocket({
          requestId: req._id,
          friend,
        })
      );
    });

    socket.on("friend_request_rejected", (requestId) => {
      console.log("❌ friend_request_rejected received:", requestId);
      store.dispatch(removeOutgoingRequest(requestId));
    });

    socket.on("friend_request_cancelled", (requestId) => {
      store.dispatch(removeIncomingRequest(requestId));
    });

    socket.on("friend_removed", ({ friendId }) => {
      store.dispatch(removeFriendFromSocket(friendId));
    });

    /* -------------------- PRESENCE -------------------- */

    socket.on("online_users", (userIds: string[]) => {
      userIds.forEach((id) => {
        store.dispatch(updatePresence({ userId: id, status: "online" }));
      });
    });

    /**
     * Update real-time online/offline presence.
     */
    socket.on(
      "presence_update",
      ({ userId, status }: PresenceUpdatePayload) => {
        store.dispatch(updatePresence({ userId, status }));
      }
    );
    /* -------------------- CONNECTION EVENTS -------------------- */

    /**
     * Cleanup heartbeat on disconnect.
     */
    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket disconnected:", reason);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error);
    });

    /**
     * Rejoin all rooms after reconnection.
     */
    socket.on("reconnect", () => {
      if (userId) socket?.emit("join", userId);
      allChats.forEach((chatId) => socket?.emit("joinGroup", chatId));
    });
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

/* -------------------- CLEANUP -------------------- */

/**
 * Gracefully disconnect the socket and remove all listeners.
 * Called on logout or full application teardown.
 */
export const disconnectSocket = () => {
  if (!socket) return;

  console.log("🧹 Disconnecting socket");

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};
