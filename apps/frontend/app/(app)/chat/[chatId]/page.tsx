"use client";

import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/hooks";
import { useEffect, useMemo } from "react";
import ChatView from "@/components/chat/ChatView";
import { getSocket } from "@/utils/socket";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();

  const chat = useAppSelector((s) =>
    s.chat.chats.find((c) => c._id === chatId)
  );

  const currentUser = useAppSelector((s) => s.auth.user);
  const allChats = useAppSelector((s) => s.chat.chats);
  const isLoading = useAppSelector((s) => s.chat.listLoading);

  const socket = useMemo(() => {
    if (!currentUser) return null;
    return getSocket(
      currentUser._id,
      allChats.map((c) => c._id)
    );
  }, [currentUser?._id, allChats.length]);

  useEffect(() => {
    if (!chat && !isLoading) {
      router.push("/chat");
    }
  }, [chat, isLoading, router]);

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!chat) return null;

  return (
    <ChatView
      chat={chat}
      currentUser={currentUser}
      socket={socket}
    />
  );
}
