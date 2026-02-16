"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import FriendCard from "../Message/FriendCard";
import { fetchChats } from "@/redux/features/chatSlice";

interface ContextMenuState {
  x: number;
  y: number;
  chatId: string;
  position: "top" | "bottom";
}

interface PersonalProps {
  onOpenChat: (chatId: string) => void;
  selectedChatId?: string;
  ifInbox: boolean;
}

export default function Personal({
  onOpenChat,
  ifInbox,
  selectedChatId,
}: PersonalProps) {
  const dispatch = useAppDispatch();

  const { chats, listLoading } = useAppSelector((state) => state.chat);
  const { user, sessionLoading } = useAppSelector((state) => state.auth);

  const perChatUnread = useAppSelector((state) => state.unread.perChat);
  const onlineStatus = useAppSelector((state) => state.presence.users);

  // Single context menu state for the entire list — only one can be open at a time.
  // Closing is handled entirely by the backdrop inside InboxContextMenu,
  // so we don't need any manual window event listeners here.
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const handleContextMenuOpen = useCallback((state: ContextMenuState) => {
    setContextMenu(state);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  /* -------- Fetch chats once -------- */
  useEffect(() => {
    if (user?._id && !sessionLoading) {
      dispatch(fetchChats());
    }
  }, [dispatch, user?._id, sessionLoading]);

  if (sessionLoading || (listLoading && chats.length === 0)) {
    return <p className="p-3">Loading chats...</p>;
  }

  const personalChats = chats.filter((c) => !c.isGroup);

  if (personalChats.length === 0) {
    return <p className="p-3 text-center opacity-70">No personal chats yet</p>;
  }

  return (
    <div className="h-full w-full flex flex-col gap-1">
      {personalChats.map((chat) => {
        const otherUser = chat.members.find((m) => m._id !== user?._id);
        const unreadCount = perChatUnread[chat._id] || 0;

        return (
          <FriendCard
            ifInbox
            key={chat._id}
            user={{
              _id: otherUser?._id,
              name: otherUser?.username || chat.chatName,
              displayName: otherUser?.displayName,
              profilePic: otherUser?.profilePicture?.url || "",
              lastMessage: chat.lastMessage?.content || "",
            }}
            chatType="personal"
            msgId={chat._id}
            selectedChat={selectedChatId}
            unread={unreadCount}
            onClick={() => onOpenChat(chat._id)}
            // Context menu props — lifted state
            activeContextMenuChatId={contextMenu?.chatId ?? null}
            contextMenuRef={contextMenuRef}
            onContextMenuOpen={handleContextMenuOpen}
            onContextMenuClose={handleContextMenuClose}
            contextMenuPos={
              contextMenu?.chatId === chat._id
                ? {
                    x: contextMenu.x,
                    y: contextMenu.y,
                    position: contextMenu.position,
                  }
                : null
            }
          />
        );
      })}

      {/*
        Portal-rendered menu lives here at the Personal level.
        AnimatePresence handles the exit animation.
        The menu is rendered via createPortal inside InboxContextMenu,
        so its DOM position is always document.body — fully above the layout.
      */}
    </div>
  );
}
