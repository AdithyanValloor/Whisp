import ProfilePicture from "../ProfilePicture/ProfilePicture";
import defaultPFP from "@/public/default-pfp.png";
import { selectMessagesByChat } from "@/redux/selectors/messageSelectors";
import {
  selectUserStatus,
  useAppDispatch,
  useAppSelector,
} from "@/redux/hooks";
import {
  Check,
  CheckCheck,
  CircleSlash,
  Crown,
  Shield,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import InboxContextMenu from "../inbox/components/InboxContextMenu";
import { removeFriend } from "@/redux/features/friendsSlice";
import ConfirmModal from "../GlobalComponents/ConfirmModal";
import { MdBlock, MdPushPin } from "react-icons/md";
import {
  leaveGroup,
  deleteGroup,
  transferOwnership,
} from "@/redux/features/chatSlice";
import TransferOwnershipModal from "../chat/TransferOwnershipModal";
import { blockUser, unblockUser } from "@/redux/features/blockSlice";
import { RootState } from "@/redux/store";
import { RiPushpinFill } from "react-icons/ri";
import { FaBellSlash } from "react-icons/fa6";
import { isChatMuted } from "@/utils/isChatMuted";

interface UserType {
  _id?: string;
  name: string;
  displayName?: string;
  profilePic: string;
  lastMessage?: string;
  status?: "online" | "offline";
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
  role?: "owner" | "admin" | "member";
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
  openDropdown?: boolean;
  modal?: boolean;
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
    openDropdown,
    modal,
  } = props;

  const chats = useAppSelector((state) => state.chat.chats);
  const chat = chats.find((c) => c._id === msgId);

  const chatMuted = chat?._id ? isChatMuted(chat._id) : false;

  const isPinned = chat?.isPinned ?? false;

  const isInbox = props.ifInbox === true;
  const activeContextMenuChatId = isInbox
    ? props.activeContextMenuChatId
    : undefined;
  const contextMenuRef = isInbox ? props.contextMenuRef : undefined;
  const onContextMenuOpen = isInbox ? props.onContextMenuOpen : undefined;
  const onContextMenuClose = isInbox ? props.onContextMenuClose : undefined;
  const contextMenuPos = isInbox ? props.contextMenuPos : undefined;
  const chatType = isInbox ? props.chatType : undefined;
  const currentUser = useAppSelector((s) => s.auth.user);
  const currentUserId = currentUser?._id;

  const targetUser =
    chatType === "personal" && chat
      ? chat.members.find((m) => m._id !== currentUserId)
      : null;

  const typingUsers = useAppSelector((s) => s.typing.byChat[msgId] ?? {});
  const dispatch = useAppDispatch();

  const isMenuOpen = activeContextMenuChatId === msgId;

  const [removeUserId, setRemoveUserId] = useState<string | null>(null);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [exitChatId, setExitChatId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<{
    userId: string;
    isBlocked: boolean;
  } | null>(null);

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

  const isBlockedByMe = useAppSelector((state: RootState) => {
    if (chat?.isGroup) return false;
    const otherMember = chat?.members.find((m) => m._id !== currentUser?._id);
    if (!otherMember) return false;
    return state.block.blockedUsers.some((u) => u._id === otherMember._id);
  });

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
      finalY = mouseY;
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

  const generateBadge = (role?: "owner" | "admin" | "member") => {
    if (!role) return null;

    const roleText = role.charAt(0).toUpperCase() + role.slice(1);

    let IconComponent;
    let styles;

    switch (role) {
      case "owner":
        IconComponent = Crown;
        styles = "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
        break;

      case "admin":
        IconComponent = Shield;
        styles = "bg-amber-500/10 text-amber-600 border-amber-500/30";
        break;

      default:
        IconComponent = UserRound;
        styles = "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    }

    return (
      <span
        className={`
          inline-flex items-center gap-1
          px-2 py-0.5
          text-[12px] font-semibold
          rounded-full
          border
          transition-all duration-200
          ${styles}`}
      >
        <IconComponent size={12} strokeWidth={2.5} />
        {roleText}
      </span>
    );
  };

  return (
    <>
      <div
        onContextMenu={openContextMenu}
        className={`cursor-pointer w-full p-2 rounded-lg flex items-center transition-colors ${isBlockedByMe ? "opacity-50" : ""}
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
            <h3 className="font-semibold opacity-80 truncate flex-1 text-base-content">
              {userData.displayName || userData.name}
            </h3>
            {!modal && lastMessageTime && !isBlockedByMe && (
              <p
                className={`text-[12px] opacity-80 font-semibold text-base-content ${unread ? "text-green-500" : ""}`}
              >
                {lastMessageTime}
              </p>
            )}
            {isPinned && (
              <RiPushpinFill size={18} className="ml-1.5 opacity-80" />
            )}

            {isGroupMemberCard && generateBadge(props.groupMember?.role)}
          </div>

          {!hideLastMessage && (
            <div className="text-[13px] flex items-center justify-between gap-2 min-w-0">
              {/* LEFT TEXT AREA */}
              <span className="flex-1 min-w-0 truncate text-base-content flex items-center gap-1">
                {isGroupMemberCard ? (
                  isMemberTyping ? (
                    <span className="loading loading-dots loading-sm opacity-70" />
                  ) : null
                ) : isChatTyping ? (
                  <span className="loading loading-dots loading-sm opacity-70" />
                ) : rightSlot ? (
                  status
                ) : (
                  <span
                    className={`${unread ? "opacity-100" : "opacity-60"} truncate`}
                  >
                    {isBlockedByMe ? "Blocked User" : lastMessageText}
                  </span>
                )}
              </span>

              {/* SEEN / DELIVERED ICON */}
              {!isBlockedByMe &&
                !isGroupMemberCard &&
                !isChatTyping &&
                isMyMessage &&
                (ifSeen ? (
                  <CheckCheck
                    size={20}
                    strokeWidth={3}
                    className="text-blue-400 flex-shrink-0"
                  />
                ) : ifDelivered ? (
                  <Check
                    size={20}
                    strokeWidth={3}
                    className="flex-shrink-0 text-base-content/80"
                  />
                ) : null)}

              {/* UNREAD BADGE */}
              {unread > 0 && (
                <span
                  className="bg-green-500 text-black font-bold
                    min-w-5 h-5 px-1 rounded-full
                    flex items-center justify-center
                    flex-shrink-0"
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              
              {chatMuted &&  <FaBellSlash
                    size={18}
                    className="flex-shrink-0 text-base-content/50"
                  />}

            </div>
          )}
        </div>
        {rightSlot && (
          <div className="ml-2 flex-shrink-0" data-right-slot>
            {rightSlot}
          </div>
        )}
        {isBlockedByMe && (
          <span className="p-1 mx-1 rounded-full bg-red-500/10">
            <MdBlock className="text-red-500 flex-shrink-0" size={21} />
          </span>
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
            onRemove={(userId) => setRemoveUserId(userId)}
            onBlock={(userId, isBlocked) =>
              setBlockTarget({ userId, isBlocked })
            }
            onExitGroup={(chatId) => {
              setExitChatId(chatId);
              setShowLeaveModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {removeUserId && targetUser && (
        <ConfirmModal
          open
          title={`Remove ${targetUser.displayName || targetUser.username}`}
          description={`Are you sure you want to remove ${
            targetUser.displayName || targetUser.username
          } from your friends?`}
          confirmText="Remove"
          onCancel={() => setRemoveUserId(null)}
          onConfirm={() => {
            dispatch(removeFriend(removeUserId));
            setRemoveUserId(null);
          }}
        />
      )}

      {exitChatId &&
        (() => {
          const ec = chats.find((c) => c._id === exitChatId);
          const ecIsOwner = ec?.createdBy?._id === currentUserId;
          const ecIsLast = (ec?.members?.length ?? 0) === 1;
          const ecNeedsTransfer = ecIsOwner && !ecIsLast;

          return (
            <>
              {showLeaveModal && (
                <ConfirmModal
                  open
                  title={
                    ecNeedsTransfer
                      ? "Transfer Ownership Required"
                      : ecIsLast
                        ? `Delete ${ec?.chatName}?`
                        : `Leave ${ec?.chatName}?`
                  }
                  confirmText={
                    ecNeedsTransfer
                      ? "Continue"
                      : ecIsLast
                        ? "Delete Group"
                        : "Leave Group"
                  }
                  cancelText="Cancel"
                  onCancel={() => {
                    setShowLeaveModal(false);
                    setExitChatId(null);
                  }}
                  onConfirm={() => {
                    setShowLeaveModal(false);
                    if (ecNeedsTransfer) {
                      setShowTransferModal(true);
                    } else if (ecIsLast) {
                      dispatch(deleteGroup({ chatId: exitChatId }));
                      setExitChatId(null);
                    } else {
                      dispatch(leaveGroup({ chatId: exitChatId }));
                      setExitChatId(null);
                    }
                  }}
                  description={
                    ecNeedsTransfer
                      ? "You are the owner of this group. You must transfer ownership before leaving."
                      : ecIsLast
                        ? "You are the last member. Leaving will permanently delete this group."
                        : "Are you sure you want to leave? You won't be able to rejoin unless invited."
                  }
                />
              )}

              {showTransferModal && (
                <TransferOwnershipModal
                  show={showTransferModal}
                  onClose={() => {
                    setShowTransferModal(false);
                    setExitChatId(null);
                  }}
                  members={ec?.members ?? []}
                  currentUserId={currentUserId ?? ""}
                  onTransfer={async (newOwnerId) => {
                    await dispatch(
                      transferOwnership({ chatId: exitChatId, newOwnerId }),
                    );
                    dispatch(leaveGroup({ chatId: exitChatId }));
                    setShowTransferModal(false);
                    setExitChatId(null);
                  }}
                />
              )}
            </>
          );
        })()}

      {blockTarget && (
        <ConfirmModal
          open
          title={blockTarget.isBlocked ? "Unblock User" : "Block User"}
          description={
            blockTarget.isBlocked
              ? "Are you sure you want to unblock this user?"
              : "Are you sure you want to block this user? They will be removed from your friends."
          }
          confirmText={blockTarget.isBlocked ? "Unblock" : "Block"}
          onCancel={() => setBlockTarget(null)}
          onConfirm={() => {
            if (blockTarget.isBlocked) {
              dispatch(unblockUser(blockTarget.userId));
            } else {
              dispatch(blockUser(blockTarget.userId));
            }
            setBlockTarget(null);
          }}
        />
      )}
    </>
  );
}
