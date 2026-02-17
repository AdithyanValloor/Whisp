"use client";

import { MessageCirclePlus, X } from "lucide-react";
import { useState, useMemo, JSX } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { createGroupChat } from "@/redux/features/groupSlice";
import type { Chat } from "@/redux/features/chatSlice";
import { useParams } from "next/navigation";

import Personal from "./Personal";
import GroupChat from "./Groups";
import SearchInput from "../GlobalComponents/SearchInput";
import IconButton from "../GlobalComponents/IconButtons";
import NewChat from "./NewChat";

type ChatType = "personal" | "group";

export default function InboxSection() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [chatType, setChatType] = useState<ChatType>("personal");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const { friends } = useAppSelector((state) => state.friends);
  const { actionLoading } = useAppSelector((state) => state.group);
  const { chats } = useAppSelector((state) => state.chat);
  const perChatUnread = useAppSelector((state) => state.unread.perChat);

  const params = useParams<{ chatId?: string }>();
  const selectedChatId = params?.chatId;

  /* ---------- Unread counters ---------- */
  const { personalUnread, groupUnread } = useMemo(() => {
    let personal = 0;
    let group = 0;

    chats.forEach((chat: Chat) => {
      const count = perChatUnread[chat._id] ?? 0;
      chat.isGroup ? (group += count) : (personal += count);
    });

    return { personalUnread: personal, groupUnread: group };
  }, [chats, perChatUnread]);

  /* ---------- Navigation ---------- */
  const openChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const sections: Record<ChatType, JSX.Element> = {
    personal: (
      <Personal 
        ifInbox 
        onOpenChat={openChat} 
        selectedChatId={selectedChatId} 
      />
    ),
    group: (
      <GroupChat
        ifInbox
        onOpenChat={openChat}
        selectedChatId={selectedChatId}
      />
    ),
  };

  /* ---------- Group creation ---------- */
  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.size === 0) return;

    const res = await dispatch(
      createGroupChat({
        name: groupName.trim(),
        userIds: Array.from(selectedUsers),
      }),
    ).unwrap();

    setShowCreateModal(false);
    setGroupName("");
    setSelectedUsers(new Set());
    setChatType("group");

    router.push(`/chat/${res._id}`);
  };

  return (
    <div className="h-full w-full relative">
      <div className="h-full w-full p-3 flex flex-col gap-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold p-1">Chats</h1>
          {/* Create group FAB */}
          <IconButton
            ariaLabel="Create group chat"
            onClick={() => setShowCreateModal(true)}
          >
            <MessageCirclePlus aria-hidden />
          </IconButton>
        </div>

        {/* Search */}
        <SearchInput />

        {/* Tabs */}
        <div className="relative flex border-b border-base-content/10">
          {(
            [
              { type: "personal", label: "Personal", unread: personalUnread },
              { type: "group", label: "Groups", unread: groupUnread },
            ] as const
          ).map(({ type, label, unread }) => {
            const active = chatType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => setChatType(type)}
                className={` flex-1 py-2 text-sm transition-colors duration-200 ${chatType === type ? "cursor-auto" : "cursor-pointer"}`}
              >
                <span
                  className={`inline-flex relative items-center gap-2 transition-colors duration-200 text-base-content/80 text-base`}
                >
                  {label}

                  {unread > 0 && (
                    <span className="absolute -right-5 -top-1 leading-none border-2 border-base-200 bg-red-700 font-semibold text-white font-sans text-[10px] rounded-full min-w-5 h-5 px-[4px] flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <span
            className="absolute bottom-0 left-0 h-[1px] w-1/2 bg-base-content
              transition-transform duration-300 ease-out"
            style={{
              transform:
                chatType === "personal" ? "translateX(0%)" : "translateX(100%)",
            }}
          />
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">{sections[chatType]}</div>
      </div>

      {/* Create group modal */}
      {showCreateModal && (
        <NewChat
          onClose={() => setShowCreateModal(false)}
          groupName={groupName}
          setGroupName={setGroupName}
          friends={friends}
          selectedUsers={selectedUsers}
          toggleUserSelection={toggleUserSelection}
          handleCreateGroup={handleCreateGroup}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
