import ProfilePicture from "../ProfilePicture/ProfilePicture";
import defaultPFP from "@/public/default-pfp.png";
import { selectMessagesByChat } from "@/redux/features/messageSelectors";
import { selectUserStatus, useAppSelector } from "@/redux/hooks";
import { Check, CheckCheck, Shield, UserRound } from "lucide-react";
import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import InboxContextMenu from "../inbox/components/InboxContextMenu";

interface UserType {
  _id?: string;
  name: string;
  displayName?: string;
  profilePic: string;
  lastMessage?: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  chatId: string;
  position: "top" | "bottom";
}

interface GroupMemberType {
  _id: string;
  username: string;
  displayName: string;
  profilePicture?: {
    url: string | null;
  };
  role?: string;
}

interface BaseFriendCardProps {
  user?: UserType;
  groupMember?: GroupMemberType;
  msgId: string;
  selectedChat?: string;
  unread?: number;
  rightSlot?: React.ReactNode;
  hideLastMessage?: boolean;
  forceActive?: boolean;
  onClick?: () => void;
  ClassName?: string;
  openDropdown: boolean;
}

interface InboxFriendCardProps extends BaseFriendCardProps {
  ifInbox?: true;
  chatType: "personal" | "group" | "other";
  activeContextMenuChatId?: string | null;
  contextMenuRef?: React.RefObject<HTMLDivElement | null>;
  onContextMenuOpen?: (state: ContextMenuState) => void;
  onContextMenuClose?: () => void;
  contextMenuPos?: { x: number; y: number; position: "top" | "bottom" } | null;
}

interface NonInboxFriendCardProps extends BaseFriendCardProps {
  ifInbox?: false;
  chatType?: never;
}

type FriendCardProps = InboxFriendCardProps | NonInboxFriendCardProps;

export default function FriendCard(props: FriendCardProps) {
  const {
    msgId,
    selectedChat,
    onClick,
    unread = 0,
    rightSlot,
    hideLastMessage,
    forceActive,
    ClassName,
    openDropdown
  } = props;

  const isInbox = props.ifInbox === true;
  const activeContextMenuChatId = isInbox
    ? props.activeContextMenuChatId
    : undefined;
  const contextMenuRef = isInbox ? props.contextMenuRef : undefined;
  const onContextMenuOpen = isInbox ? props.onContextMenuOpen : undefined;
  const onContextMenuClose = isInbox ? props.onContextMenuClose : undefined;
  const contextMenuPos = isInbox ? props.contextMenuPos : undefined;
  const chatType = isInbox ? props.chatType : undefined;

  const typingUsers = useAppSelector((s) => s.typing.byChat[msgId] ?? {});

  const currentUser = useAppSelector((s) => s.auth.user);
  const currentUserId = currentUser?._id;

  const isMenuOpen = activeContextMenuChatId === msgId;

  // =-=-=-=-=-=-==-=-=-=-=-=-=-=-=-=-=

  const isGroupMemberCard = !!props.groupMember;

  const userData = isGroupMemberCard
    ? {
        _id: props.groupMember!._id,
        name: props.groupMember!.username,
        displayName: props.groupMember!.displayName,
        profilePic: props.groupMember!.profilePicture?.url ?? defaultPFP,
      }
    : {
        ...props.user!,
        profilePic: props.user!.profilePic || defaultPFP,
      };

  const status = useAppSelector(selectUserStatus(userData._id ?? ""));

  // =-=-=-=-=-=-==-=-=-=-=-=-=-=-=-=-=

  const openContextMenu = (e: React.MouseEvent) => {
    if (!isInbox || !onContextMenuOpen) return;

    e.preventDefault();
    // stopPropagation prevents the backdrop's onContextMenu from firing,
    // so right-clicking a different card while one is open swaps instantly
    // without the backdrop closing state in between.
    e.stopPropagation();

    // Same card right-clicked again → toggle closed
    if (isMenuOpen) {
      onContextMenuClose?.();
      return;
    }

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const menuWidth = 192;
    const menuHeight = 260;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalX = mouseX;
    let finalY = mouseY;
    let position: "top" | "bottom" = "bottom";

    if (finalX + menuWidth > viewportWidth)
      finalX = viewportWidth - menuWidth - 10;
    if (finalX < 10) finalX = 10;

    const spaceBelow = viewportHeight - mouseY;
    const spaceAbove = mouseY;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      position = "top";
      finalY = mouseY - menuHeight;
      if (finalY < 10) finalY = 10;
    } else {
      if (finalY + menuHeight > viewportHeight) {
        finalY = viewportHeight - menuHeight - 10;
      }
    }

    // Calling open directly (not close-then-open) means the parent swaps
    // state in a single setState, giving a zero-flicker card-to-card transition.
    onContextMenuOpen({ x: finalX, y: finalY, chatId: msgId, position });
  };

  // Messages for last-message preview
  const messages = useAppSelector((state) =>
    selectMessagesByChat(state, msgId),
  );

  const { lastMessageText, lastMessageTime } = useMemo(() => {
    const lastMsg = messages.at(-1);

    if (!lastMsg || !lastMsg.sender) {
      return { lastMessageText: "No messages yet", lastMessageTime: "" };
    }

    let text = "";
    if (lastMsg.deleted) {
      text = "Message deleted";
    } else if (lastMsg.content) {
      text = lastMsg.content;
    } else {
      text = "No content";
    }

    const msgDate = new Date(lastMsg.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - msgDate.getTime()) / (1000 * 60 * 60);

    let timeStr = "";
    if (diffInHours < 24) {
      timeStr = msgDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInHours < 24 * 7) {
      timeStr = msgDate.toLocaleDateString([], { weekday: "short" });
    } else {
      timeStr = msgDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }

    return { lastMessageText: text, lastMessageTime: timeStr };
  }, [messages]);

  const lastMsg = messages.at(-1);
  const isMyMessage = lastMsg?.sender._id === currentUserId;
  const ifSeen = lastMsg?.seenBy && lastMsg.seenBy.length > 0;
  const ifDelivered = lastMsg?.deliveredTo && lastMsg.deliveredTo.length > 0;

  const typingUserIds = Object.keys(typingUsers);

  const isChatTyping =
    typingUserIds.filter((id) => id !== currentUserId).length > 0;

  const isMemberTyping = isGroupMemberCard
    ? typingUserIds.includes(userData._id ?? "")
    : false;

  const generateBadge = (role: string | undefined) => {
    if (!role) return null;

    const isAdmin = role === "admin";
    const Icon = isAdmin ? Shield : UserRound;
    const roleText = role.charAt(0).toUpperCase() + role.slice(1);

    return (
      <span
        className={`
          inline-flex items-center gap-1
          px-2 py-0.5
          text-[12px] font-semibold
          rounded-full
          border
          transition-all duration-200
          ${
            isAdmin
              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
          }
        `}
      >
        <Icon size={12} strokeWidth={2.5} />
        {roleText}
      </span>
    );
  };

  return (
    <>
      <div
        onContextMenu={openContextMenu}
        className={`cursor-pointer w-full p-2 rounded-lg flex items-center transition-colors
          ${forceActive || msgId === selectedChat ? "bg-base-content/5" : "hover:bg-base-content/5"}
          ${isMenuOpen ? "bg-base-content/5" : ""} ${openDropdown && "bg-base-content/5"} ${ClassName}
        `}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-right-slot]")) return;
          onClick?.();
        }}
      >
        <ProfilePicture
          src={userData.profilePic}
          status={status}
          size="sm"
          showStatus={chatType !== "group"}
        />

        <div className="px-2 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold truncate flex-1 text-base-content">
              {userData.displayName || userData.name}
            </h3>
            {lastMessageTime && (
              <p
                className={`text-[11px] font-semibold text-base-content opacity-60 ${unread ? "text-green-500" : ""}`}
              >
                {lastMessageTime}
              </p>
            )}

            {isGroupMemberCard && generateBadge(props.groupMember?.role)}
          </div>

          {!hideLastMessage && (
            <p className="text-[12px] opacity-70 flex items-center justify-between gap-1 min-w-0">
              <span className="truncate min-w-0 text-base-content flex items-center gap-1">
                {isGroupMemberCard ? (
                  isMemberTyping ? (
                    <>
                      <span className="loading loading-dots loading-sm opacity-70" />
                    </>
                  ) : null
                ) : isChatTyping ? (
                  <>
                    <span className="loading loading-dots loading-sm opacity-70" />
                  </>
                ) : rightSlot ? (
                  status
                ) : (
                  lastMessageText
                )}
              </span>

              {!isGroupMemberCard &&
                !isChatTyping &&
                isMyMessage &&
                (ifSeen ? (
                  <CheckCheck
                    size={16}
                    strokeWidth={3}
                    className="text-blue-400 flex-shrink-0"
                  />
                ) : ifDelivered ? (
                  <Check
                    size={16}
                    strokeWidth={3}
                    className="flex-shrink-0 text-base-content"
                  />
                ) : null)}
            </p>
          )}
        </div>

        {unread > 0 && (
          <span className="bg-green-500 text-black text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center ml-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}

        {rightSlot && (
          <div className="ml-2 flex-shrink-0" data-right-slot>
            {rightSlot}
          </div>
        )}
      </div>

      {/* Portal-rendered menu — only mounted for the active card */}
      <AnimatePresence>
        {isMenuOpen && isInbox && contextMenuRef && contextMenuPos && (
          <InboxContextMenu
            x={contextMenuPos.x}
            y={contextMenuPos.y}
            position={contextMenuPos.position}
            onClose={() => onContextMenuClose?.()}
            menuRef={contextMenuRef}
            chatId={msgId}
            chatType={chatType}
          />
        )}
      </AnimatePresence>
    </>
  );
}
