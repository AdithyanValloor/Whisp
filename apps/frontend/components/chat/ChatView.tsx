"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import ProfileView from "../layout/profileView";
import ProfilePicture from "../ProfilePicture/ProfilePicture";
import { ArrowLeft } from "lucide-react";
import { selectMessagesByChat } from "@/redux/features/messageSelectors";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import {
  fetchMessages,
  sendMessage,
  MessageType,
  deleteMessageApi,
  editMessageApi,
  markChatAsRead,
  markMessagesAsSeen,
  fetchMessageContext,
  setJumpTo,
} from "@/redux/features/messageSlice";
import {
  addMembers,
  removeMembers,
  toggleAdmin,
  leaveGroup,
  deleteGroup,
  transferOwnership,
} from "@/redux/features/chatSlice";
import GroupSidebar from "../layout/GroupchatSideBar";
import { resetUnread } from "@/redux/features/unreadSlice";
import MessageInput from "./MessageInput";
import { motion, AnimatePresence } from "framer-motion";
import { ChatHeader } from "./ChatHeader";
import { ChatBody } from "./ChatBody";
import ChatSearchComponent from "./ChatSearchComponent";
import ConfirmModal from "../GlobalComponents/ConfirmModal";
import { setActiveChatId } from "@/utils/activeChat";

interface ChatViewProps {
  chat: {
    _id: string;
    chatName: string;
    isGroup: boolean;
    members: {
      _id: string;
      username: string;
      displayName?: string;
      profilePicture?: { url: string | null };
      status?: "online" | "offline";
    }[];
  };
  currentUser: {
    _id: string;
    username: string;
    displayName?: string;
    profilePic?: string;
  };
  socket: Socket | null;
}

type SidebarMode = "profile" | "search" | null;

export default function ChatView({ chat, currentUser, socket }: ChatViewProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const onlineStatus = useAppSelector((state) => state.presence.users);

  const messages = useAppSelector((state) =>
    selectMessagesByChat(state, chat._id),
  );
  const typingUsers = useAppSelector((s) => s.typing.byChat[chat._id] ?? {});

  const lastMessageId = messages.at(-1)?._id;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedRef = useRef<Set<string>>(new Set());
  const markAsSeenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMarkingRef = useRef(false);
  const hasMarkedInitialRef = useRef(false);
  const [message, setMessage] = useState("");
  // ---------------------------------------------
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<MessageType | null>(
    null,
  );
  const [showDeleteModal, setShowDeleteModal] = useState<{
    open: boolean;
    msg: MessageType | null;
  }>({
    open: false,
    msg: null,
  });
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  console.log("CHAT:", chat);
  console.log("MESSAGES COUNT:", messages.length);

  useEffect(() => {
    setActiveChatId(chat._id);

    return () => {
      setActiveChatId(null);
    };
  }, [chat._id]);

  // Detect mobile screen
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(!!e.matches);
    };
    setIsMobile(!!m.matches);
    m.addEventListener
      ? m.addEventListener("change", onChange)
      : (m.onchange = onChange);

    return () => {
      m.removeEventListener
        ? m.removeEventListener("change", onChange)
        : (m.onchange = null);
    };
  }, []);

  const displayUser = chat.isGroup
    ? {
        _id: chat._id,
        username: chat.chatName,
        displayName: chat.chatName,
        profilePicture: { url: null },
      }
    : (chat.members.find((m) => m._id !== currentUser._id) ?? {
        _id: "unknown",
        username: "Unknown",
        displayName: "Unknown",
        profilePicture: {
          url: currentUser.profilePic ?? null,
        },
      });

  let displayStatus: "online" | "offline" = "offline";

  if (!chat.isGroup) {
    const otherUser = chat.members.find((m) => m._id !== currentUser._id);

    if (otherUser?._id) {
      const userId = otherUser._id;
      displayStatus = onlineStatus[userId] || "offline";
    }
  } else {
    displayStatus = "online";
  }

  console.log(displayStatus);

  const displayName = displayUser.displayName;
  const name = displayUser.username;
  const displayPic = displayUser.profilePicture?.url || "/default-pfp.png";

  // Handle back button click - navigate back to chat list
  const handleBackClick = () => {
    router.push("/chat");
  };

  // Stable mark as seen function
  const markChatAsSeen = useCallback(async () => {
    if (!isPageVisible || isMarkingRef.current || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender._id === currentUser._id) {
      return;
    }

    isMarkingRef.current = true;
    console.log("✅ Marking chat as read/seen:", chat._id);

    try {
      dispatch(resetUnread(chat._id));
      await dispatch(markChatAsRead(chat._id)).unwrap();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await dispatch(markMessagesAsSeen(chat._id)).unwrap();
      console.log(`👁️ Chat ${chat._id} marked successfully`);
    } catch (err) {
      console.error("❌ Failed to mark chat:", err);
    } finally {
      isMarkingRef.current = false;
    }
  }, [chat._id, dispatch, isPageVisible, messages, currentUser._id]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsPageVisible(visible);

      if (visible && messages.length > 0 && hasMarkedInitialRef.current) {
        markChatAsSeen();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [messages.length, markChatAsSeen]);

  // Reset state when chat changes
  useEffect(() => {
    console.log("🔄 Chat changed to:", chat._id);
    hasMarkedInitialRef.current = false;
    isMarkingRef.current = false;
    setShowProfile(false); // Close profile when chat changes

    if (markAsSeenTimeoutRef.current) {
      clearTimeout(markAsSeenTimeoutRef.current);
      markAsSeenTimeoutRef.current = null;
    }

    setTimeout(() => {
      const container = document.querySelector(".messages-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
        console.log("📜 Scrolled to bottom on chat change");
      }
    }, 150);

    return () => {
      if (markAsSeenTimeoutRef.current) {
        clearTimeout(markAsSeenTimeoutRef.current);
        markAsSeenTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [chat._id]);

  // Fetch messages for this chat
  useEffect(() => {
    if (hasFetchedRef.current.has(chat._id)) {
      return;
    }

    console.log("=== FETCHING MESSAGES FOR CHAT:", chat._id);
    hasFetchedRef.current.add(chat._id);

    dispatch(fetchMessages(chat._id))
      .unwrap()
      .then((result) => {
        console.log("✅ Messages fetched successfully");
        setTimeout(() => {
          const container = document.querySelector(".messages-container");
          if (container) {
            container.scrollTop = container.scrollHeight;
            console.log("📜 Scrolled to bottom after fetch");
          }
        }, 100);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch messages:", err);
        hasFetchedRef.current.delete(chat._id);
      });
  }, [chat._id, dispatch]);

  useEffect(() => {
    if (!isPageVisible) return;
    if (!lastMessageId) return;

    const lastMessage = messages[messages.length - 1];

    if (lastMessage.sender._id === currentUser._id) return;

    if (isMarkingRef.current) return;

    isMarkingRef.current = true;

    const timer = setTimeout(async () => {
      try {
        console.log("👁️ Marking chat as seen:", chat._id);

        dispatch(resetUnread(chat._id));
        await dispatch(markChatAsRead(chat._id)).unwrap();
        await dispatch(markMessagesAsSeen(chat._id)).unwrap();
      } catch (err) {
        console.error("❌ Mark as seen failed:", err);
      } finally {
        isMarkingRef.current = false;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [lastMessageId, chat._id, currentUser._id, dispatch]);

  // Socket event listeners
  const handleTyping = () => {
    if (!socket?.connected) return;

    socket.emit("typing", {
      roomId: chat._id,
      userId: currentUser._id,
      username: currentUser.username,
      displayName: currentUser.displayName,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (socket?.connected) {
        socket.emit("stopTyping", {
          roomId: chat._id,
          userId: currentUser._id,
        });
      }
    }, 1500);
  };

  const handleSend = async () => {
    if (!message.trim() && !editingMessage) return;
    setShowPicker(false);

    if (editingMessage) {
      await dispatch(
        editMessageApi({
          chatId: chat._id,
          messageId: editingMessage._id,
          content: editingMessage.content.trim(),
        }),
      );
      setEditingMessage(null);
      return;
    }

    const content = message;
    setMessage("");

    try {
      await dispatch(
        sendMessage({
          chatId: chat._id,
          content,
          replyTo: replyingTo?._id || null,
        }),
      ).unwrap();

      setReplyingTo(null);

      if (socket?.connected) {
        socket.emit("stopTyping", {
          roomId: chat._id,
          userId: currentUser._id,
        });
      }
    } catch (err) {
      console.error("Send message failed:", err);
    }
  };

  const scrollToMessage = async (messageId: string) => {
    setHighlightedMessageId(messageId);

    const exists = messages.find((m) => m._id === messageId);

    if (!exists) {
      await dispatch(
        fetchMessageContext({ messageId, chatId: chat._id }),
      ).unwrap();
    } else {
      // Route through jumpTo so the Messages effect handles centering — no double-click
      dispatch(setJumpTo({ chatId: chat._id, messageId }));
    }
  };

  useEffect(() => {
    if (!highlightedMessageId) return;

    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1500);
  }, [highlightedMessageId]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Chat Area */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ease-in-out
          ${isMobile || !sidebarMode ? "w-full" : "w-2/3"}
        `}
      >
        {/* Header */}
        <ChatHeader
          isMobile={isMobile}
          displayName={displayName || name}
          displayStatus={displayStatus}
          displayPic={displayPic}
          onBack={handleBackClick}
          onProfileClick={() =>
            setSidebarMode((prev) => (prev === "profile" ? null : "profile"))
          }
          setSidebarMode={setSidebarMode}
        />
        {/* Messages Area */}
        <ChatBody
          chatId={chat._id}
          currentUser={currentUser}
          typingUsers={typingUsers}
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          setReplyingTo={setReplyingTo}
          onEdit={(msg) => {
            setReplyingTo(null);
            setEditingMessage(msg);
          }}
          onDelete={(msg) => setShowDeleteModal({ open: true, msg })}
          scrollToMessage={scrollToMessage}
          highlightedMessageId={highlightedMessageId}
        />

        {/* Delete Modal */}
        <ConfirmModal
          open={showDeleteModal.open}
          title="Delete Message"
          description="Are you sure you want to delete this message?"
          cancelText="Cancel"
          confirmText="Delete"
          onCancel={() => setShowDeleteModal({ open: false, msg: null })}
          onConfirm={() => {
            if (showDeleteModal.msg) {
              dispatch(
                deleteMessageApi({
                  chatId: chat._id,
                  messageId: showDeleteModal.msg._id,
                }),
              );
            }
            setShowDeleteModal({ open: false, msg: null });
          }}
        />

        {/* Message Input */}
        <div className="flex-shrink-0 safe-area-bottom">
          <MessageInput
            isMobile={isMobile}
            message={message}
            setMessage={setMessage}
            handleSend={handleSend}
            handleTyping={handleTyping}
            editingMessage={editingMessage}
            setEditingMessage={setEditingMessage}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
          />
        </div>
      </div>

      {/* Profile/Group Sidebar - Smooth slide-in animation */}
      <AnimatePresence mode="popLayout">
        {sidebarMode && (
          <motion.div
            key="sidebar"
            initial={isMobile ? { x: "100%" } : undefined}
            animate={isMobile ? { x: 0 } : undefined}
            exit={isMobile ? { x: "100%" } : undefined}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className={`
              ${isMobile ? "absolute inset-0 z-30" : "relative w-1/3"}
              h-full mx-2 pb-3`}
          >
            <div className="h-full w-full shadow-md border border-base-content/10 overflow-hidden rounded-2xl">
              {sidebarMode === "search" && (
                <ChatSearchComponent
                  chatId={chat._id}
                  currentUser={currentUser}
                  onClose={() => setSidebarMode(null)}
                  onSelectMessage={(id) => {
                    scrollToMessage(id);
                  }}
                />
              )}

              {sidebarMode === "profile" && (
                <>
                  {isMobile && (
                    <div className="flex items-center gap-2 px-4 py-3 border-b">
                      <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setSidebarMode(null)}
                        className="p-2 rounded-full hover:bg-base-200 transition"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <span className="font-semibold">
                        {chat.isGroup ? "Group Info" : "Profile"}
                      </span>
                    </div>
                  )}

                  {chat.isGroup ? (
                    <GroupSidebar
                      group={chat}
                      currentUserId={currentUser._id}
                      onAddMembers={(ids) =>
                        dispatch(addMembers({ chatId: chat._id, members: ids }))
                      }
                      onRemoveMember={(id) =>
                        dispatch(
                          removeMembers({ chatId: chat._id, member: id }),
                        )
                      }
                      onMakeAdmin={(id) =>
                        dispatch(
                          toggleAdmin({
                            chatId: chat._id,
                            member: id,
                            makeAdmin: true,
                          }),
                        )
                      }
                      onRemoveAdmin={(id) =>
                        dispatch(
                          toggleAdmin({
                            chatId: chat._id,
                            member: id,
                            makeAdmin: false,
                          }),
                        )
                      }
                      onLeaveGroup={() =>
                        dispatch(leaveGroup({ chatId: chat._id }))
                      }
                      onDeleteGroup={() =>
                        dispatch(deleteGroup({ chatId: chat._id }))
                      }
                      onTransferOwnership={(id) =>
                        dispatch(
                          transferOwnership({
                            chatId: chat._id,
                            newOwnerId: id,
                          }),
                        ).then(() => {
                          dispatch(leaveGroup({ chatId: chat._id }));
                        })
                      }
                    />
                  ) : (
                    <ProfileView user={displayUser} />
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}
