"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import FriendCard from "../Message/FriendCard";
import { fetchChats } from "@/redux/features/chatSlice";
import SearchInput from "../GlobalComponents/SearchInput";
import { useParams, useRouter } from "next/navigation";

interface ContextMenuState {
  x: number;
  y: number;
  chatId: string;
  position: "top" | "bottom";
}

export default function ArchivedChats() {
  const dispatch = useAppDispatch();
  const { chats, listLoading } = useAppSelector((state) => state.chat);
  const { user, sessionLoading } = useAppSelector((state) => state.auth);
  const perChatUnread = useAppSelector((state) => state.unread.perChat);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const handleContextMenuOpen = useCallback((state: ContextMenuState) => {
    setContextMenu(state);
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (user?._id && !sessionLoading) {
      dispatch(fetchChats());
    }
  }, [dispatch, user?._id, sessionLoading]);

  const archivedChats = chats.filter((c) => c.isArchived);

  const filteredChats = archivedChats.filter((chat) => {
    const isGroup = chat.isGroup;

    if (isGroup) {
      return chat.chatName?.toLowerCase().includes(search.toLowerCase());
    }

    const otherUser = chat.members.find((m) => m._id !== user?._id);

    return (
      otherUser?.username?.toLowerCase().includes(search.toLowerCase()) ||
      otherUser?.displayName?.toLowerCase().includes(search.toLowerCase())
    );
  });

  /* ---------- Navigation ---------- */
  const openChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const params = useParams<{ chatId?: string }>();
  const selectedChatId = params?.chatId;

  return (
    <div className="h-full w-full p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-base-content p-1">
          Archived Chats
        </h1>
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search archived chats"
      />

      <div className="flex-1 overflow-y-auto">
        {sessionLoading || (listLoading && chats.length === 0) ? (
          <p className="p-3">Loading...</p>
        ) : archivedChats.length === 0 ? (
          <p className="p-3 text-center opacity-70">No archived chats</p>
        ) : filteredChats.length === 0 ? (
          <p className="p-3 text-center opacity-70">No chats found</p>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredChats.map((chat) => {
              const isGroup = chat.isGroup;
              const otherUser = !isGroup
                ? chat.members.find((m) => m._id !== user?._id)
                : null;
              const unreadCount = perChatUnread[chat._id] || 0;

              return (
                <FriendCard
                  ifInbox
                  key={chat._id}
                  chatType={isGroup ? "group" : "personal"}
                  msgId={chat._id}
                  unread={unreadCount}
                  onClick={() => openChat(chat._id)}
                  selectedChat={selectedChatId}
                  user={
                    isGroup
                      ? {
                          name: chat.chatName,
                          profilePic: "",
                        }
                      : {
                          _id: otherUser?._id,
                          name: otherUser?.username || chat.chatName,
                          displayName: otherUser?.displayName,
                          profilePic: otherUser?.profilePicture?.url || "",
                        }
                  }
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
          </div>
        )}
      </div>
    </div>
  );
}
