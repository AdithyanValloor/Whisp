'use client';

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import FriendCard from "../Message/FriendCard";
import { fetchChats } from "@/redux/features/chatSlice";

interface PersonalProps {
  onOpenChat: (chatId: string) => void;
  selectedChatId?: string;
}

export default function Personal({ onOpenChat, selectedChatId }: PersonalProps) {
  const dispatch = useAppDispatch();

  const { chats, listLoading } = useAppSelector((state) => state.chat);
  const { user, sessionLoading } = useAppSelector((state) => state.auth);

  const perChatUnread = useAppSelector((state) => state.unread.perChat);
  const onlineStatus = useAppSelector((state) => state.presence.users);

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
    return (
      <p className="p-3 text-center opacity-70">
        No personal chats yet
      </p>
    );
  }

  return (
    <div className="h-full w-full flex flex-col gap-1">
      {personalChats.map((chat) => {

        const otherUser = chat.members.find(
          (m) => m._id !== user?._id
        );

        const otherUserId = otherUser?._id;
        const status =
          otherUserId && onlineStatus[otherUserId]
            ? onlineStatus[otherUserId]
            : "offline";
                
        const unreadCount = perChatUnread[chat._id] || 0;
        return (
          <FriendCard
            key={chat._id}
            user={{
              name: otherUser?.username || chat.chatName,
              displayName: otherUser?.displayName,
              profilePic: otherUser?.profilePicture?.url || "",
              status: status || "offline",
              lastMessage: chat.lastMessage?.content || "",
            }}
            chatType="personal"
            msgId={chat._id}
            selectedChat={selectedChatId}
            unread={ unreadCount }
            onClick={() => onOpenChat(chat._id)}
          />
        );
      })}
    </div>
  );
}
