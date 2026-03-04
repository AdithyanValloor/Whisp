"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { XCircle, LogOut, Minus, UserRoundCheck } from "lucide-react";
import {
  selectIsBlockedByMe,
  useAppDispatch,
  useAppSelector,
} from "@/redux/hooks";
import {
  togglePinLocal,
  togglePin,
  markUnreadLocal,
  markAsUnread,
  markAsRead,
  toggleArchive,
  toggleArchiveLocal,
  clearChat,
  deleteChat,
  deleteChatLocal,
} from "@/redux/features/chatSlice";
import { resetUnread } from "@/redux/features/unreadSlice";
import {
  MdMarkChatRead,
  MdMarkUnreadChatAlt,
  MdBlock,
} from "react-icons/md";
import { usePathname, useRouter } from "next/navigation";
import {
  acceptFriend,
  addFriend,
  cancelFriend,
} from "@/redux/features/friendsSlice";
import { FaUserMinus, FaUserPlus, FaCircleMinus } from "react-icons/fa6";
import { RiChatDeleteFill, RiDeleteBin5Fill, RiEraserFill, RiInboxArchiveFill, RiInboxUnarchiveFill, RiPushpinFill, RiUnpinFill } from "react-icons/ri";


interface InboxContextMenuProps {
  x: number;
  y: number;
  position: "top" | "bottom";
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  chatId?: string;
  chatType?: "personal" | "group" | "other";
  onRemove?: (userId: string) => void;
  onBlock?: (userId: string, isBlocked: boolean) => void;
  onExitGroup?: (chatId: string) => void;
}

export default function InboxContextMenu({
  x,
  y,
  onClose,
  menuRef,
  position,
  chatType,
  chatId,
  onRemove,
  onExitGroup,
  onBlock,
}: InboxContextMenuProps) {
  const chats = useAppSelector((state) => state.chat.chats);
  const chat = chats.find((c) => c._id === chatId);
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = useAppSelector((s) => s.auth.user);

  const targetUser =
    chatType === "personal" && chat
      ? chat.members.find((m) => m._id !== currentUser?._id)
      : null;

  const isBlockedByMe = useAppSelector(
    selectIsBlockedByMe(targetUser?._id ?? ""),
  );

  const isChatOpen = chatId && pathname === `/chat/${chatId}`;

  const isPinned = chat?.isPinned ?? false;
  const isArchived = chat?.isArchived ?? false;
  const unreadCount = useAppSelector((state) =>
    chatId ? (state.unread.perChat[chatId] ?? 0) : 0,
  );

  const friends = useAppSelector((s) => s.friends.friends);
  const { incoming, outgoing } = useAppSelector((s) => s.friends.requests);

  const friendStatus: "friend" | "outgoing" | "incoming" | "none" = (() => {
    if (!targetUser) return "none";
    if (friends.some((f) => f._id === targetUser._id)) return "friend";
    if (outgoing.some((r) => r.to._id === targetUser._id)) return "outgoing";
    if (incoming.some((r) => r.from._id === targetUser._id)) return "incoming";
    return "none";
  })();

  const incomingReq = incoming.find((r) => r.from._id === targetUser?._id);
  const outgoingReq = outgoing.find((r) => r.to._id === targetUser?._id);

  const hasUnread = unreadCount > 0;

  const dispatch = useAppDispatch();

  const menuItems = [
    {
      key: "pin",
      label: isPinned ? "Unpin Chat" : "Pin Chat",
      icon: isPinned ? RiUnpinFill : RiPushpinFill,
    },
    {
      key: "archive",
      label: isArchived ? "Unarchive Chat" : "Archive Chat",
      icon: isArchived ? RiInboxUnarchiveFill : RiInboxArchiveFill,
    },
    {
      key: hasUnread ? "read" : "unread",
      label: hasUnread ? "Mark as Read" : "Mark as Unread",
      icon: hasUnread ? MdMarkChatRead : MdMarkUnreadChatAlt,
    },

    ...(isChatOpen
      ? [
          {
            key: "close",
            label: "Close Chat",
            icon: RiChatDeleteFill,
          },
        ]
      : []),

    { divider: true },

    ...(chatType === "personal" && targetUser
      ? [
          friendStatus === "friend"
            ? {
                key: "remove",
                label: "Remove Friend",
                icon: FaUserMinus,
                danger: true,
              }
            : friendStatus === "incoming"
              ? {
                  key: "accept",
                  label: "Accept Request",
                  icon: UserRoundCheck,
                }
              : friendStatus === "outgoing"
                ? {
                    key: "cancel",
                    label: "Cancel Request",
                    icon: FaCircleMinus,
                  }
                : {
                    key: "add",
                    label: "Add Friend",
                    icon: FaUserPlus,
                  },
          {
            key: "block",
            label: isBlockedByMe ? "Unblock User" : "Block User",
            icon: MdBlock,
            danger: true,
          },
        ]
      : []),

    ...(chatType === "group"
      ? [{ key: "exit", label: "Exit Group", icon: LogOut, danger: true }]
      : []),

    {
      key: "clear",
      label: "Clear Chat",
      icon: RiEraserFill,
      danger: true,
    },
    {
      key: "delete",
      label: "Delete Chat",
      icon: RiDeleteBin5Fill,
      danger: true,
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[99998]"
        onClick={onClose}
        onContextMenu={onClose}
      />

      <motion.div
        ref={menuRef}
        initial={{
          opacity: 0,
          scale: 0.96,
          y: position === "bottom" ? 6 : -6,
        }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className="fixed z-[99999] bg-base-100 border border-base-content/10 shadow-2xl rounded-xl w-52 p-1.5 backdrop-blur-md"
        // className="fixed z-[99999] bg-base-100 border border-base-content/10 shadow-xl rounded-xl w-48 p-1.5 backdrop-blur-sm"
        style={{
          left: x,
          ...(position === "bottom"
            ? { top: y }
            : { bottom: window.innerHeight - y }),
        }}
      >
        <ul className="flex flex-col gap-1">
          {menuItems.map((item, index) => {
            if ("divider" in item) {
              return (
                <li key={`divider-${index}`}>
                  <hr className="my-1 border-base-content/10" />
                </li>
              );
            }

            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!chatId) return;

                    switch (item.key) {
                      case "pin":
                        onClose();
                        setTimeout(() => {
                          dispatch(togglePinLocal(chatId));
                          dispatch(togglePin(chatId));
                        }, 120);
                        return;

                      case "unread":
                        dispatch(markUnreadLocal(chatId));
                        dispatch(markAsUnread(chatId));
                        break;

                      case "read":
                        dispatch(resetUnread(chatId));
                        dispatch(markAsRead(chatId));
                        break;

                      case "close":
                        router.replace("/chat");
                        break;

                      case "remove":
                        if (targetUser) {
                          onRemove?.(targetUser._id);
                        }
                        break;

                      case "add":
                        if (targetUser) {
                          dispatch(addFriend(targetUser.username));
                        }
                        break;

                      case "accept":
                        if (incomingReq) {
                          dispatch(acceptFriend(incomingReq._id));
                        }
                        break;

                      case "cancel":
                        if (outgoingReq) {
                          dispatch(cancelFriend(outgoingReq._id));
                        }
                        break;

                      case "archive":
                        dispatch(toggleArchiveLocal(chatId));
                        dispatch(toggleArchive(chatId));
                        if (isPinned) {
                          dispatch(togglePinLocal(chatId));
                          dispatch(togglePin(chatId));
                        }
                        break;

                      case "exit":
                        onExitGroup?.(chatId);
                        break;

                      case "clear":
                        dispatch(clearChat(chatId));
                        dispatch(resetUnread(chatId));
                        break;

                      case "delete":
                        dispatch(deleteChatLocal(chatId));
                        dispatch(deleteChat(chatId));
                        dispatch(resetUnread(chatId));
                        if (isChatOpen) router.replace("/chat");
                        break;

                      case "block":
                        if (targetUser) {
                          onClose();
                          onBlock?.(targetUser._id, isBlockedByMe);
                        }
                        break;

                      default:
                        break;
                    }

                    onClose();
                  }}
                  className={`
                    flex items-center justify-between
                    w-full px-3 py-2
                    rounded-lg
                    text-sm 
                    transition-colors duration-150
                    cursor-pointer
                    ${
                      item.danger
                        ? "text-red-400 hover:bg-red-300/10"
                        : "text-base-content hover:bg-base-content/10"
                    }
                  `}
                >
                  <span className="opacity-80">{item.label}</span>
                  <Icon
                    size={18}
                    className={`ml-2 flex-shrink-0 ${(item.key === "remove" || item.key === "add") && "-mr-[2.5px]"}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </>,
    document.body,
  );
}
