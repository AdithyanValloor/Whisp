import ProfilePicture from "../ProfilePicture/ProfilePicture";
import defaultPFP from "@/public/default-pfp.png";
import { selectMessagesByChat } from "@/redux/features/messageSelectors";
import { useAppSelector } from "@/redux/hooks";
import { Check, CheckCheck } from "lucide-react";
import { useMemo } from "react";

interface UserType {
  name: string;
  displayName?: string;
  profilePic: string;
  status: "online" | "offline";
  lastMessage?: string;
}

interface FriendCardProps {
  user: UserType;
  chatType?: "personal" | "group" | "other";
  onClick?: () => void;
  selectedChat?: string;
  msgId: string;
  unread?: number;
  rightSlot?: React.ReactNode;
  hideLastMessage?: boolean;
  forceActive?: boolean;
}

export default function FriendCard({
  msgId,
  selectedChat,
  user,
  onClick,
  chatType,
  unread = 0,
  rightSlot,
  hideLastMessage,
  forceActive,
}: FriendCardProps) {
  
    const currentUser = useAppSelector((s) => s.auth.user);
    console.log("Current User : ",currentUser);
    const currentUserId = currentUser?._id;
    

  // Get messages for this chat from Redux
  const messages = useAppSelector(state =>
    selectMessagesByChat(state, msgId)
  );  

  // Get the last message and format time
  const { lastMessageText, lastMessageTime } = useMemo(() => {
    const lastMsg = messages.at(-1);
  
    if (!lastMsg || !lastMsg.sender) {
      return { lastMessageText: "No messages yet", lastMessageTime: "" };
    }
  
    // Message text
    let text = "";
    if (lastMsg.deleted) {
      text = "Message deleted";
    } else if (lastMsg.content) {
      text = lastMsg.content;
    } else {
      text = "No content";
    }
  
    // Time formatting
    const msgDate = new Date(lastMsg.createdAt);
    const now = new Date();
    const diffInHours =
      (now.getTime() - msgDate.getTime()) / (1000 * 60 * 60);
  
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
  }, [messages, currentUserId]);
  
  const lastMsg = messages.at(-1);
  const lastMsgUser = lastMsg?.sender._id

  const isMyMessage = lastMsgUser === currentUserId;
  const ifSeen = lastMsg?.seenBy && lastMsg.seenBy.length > 0
  const ifDelivered = lastMsg?.deliveredTo && lastMsg.deliveredTo.length > 0

  console.log("lastMsgUser :", lastMsgUser , "-------------------------------------");
  console.log("currentUserId :", currentUserId , "-------------------------------------");
  console.log("IsMyMessage :", isMyMessage , "-------------------------------------");
  

  return (
    <div
      className={`cursor-pointer p-2 rounded-lg flex items-center
        ${
          forceActive || msgId === selectedChat
            ? "bg-base-content/5"
            : "hover:bg-base-content/5"
        }
      `}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-right-slot]")) return;
        onClick?.();
      }}
    >
      <ProfilePicture
        src={user.profilePic?.length ? user.profilePic : defaultPFP}
        status={user.status}
        size="sm"
        showStatus={chatType !== "group"}
      />

      <div className="px-2 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium truncate flex-1">
            {user.displayName || user.name}
          </h3>

          {lastMessageTime && (
            <p
              className={`text-[11px] font-semibold opacity-60 ${
                unread ? "text-primary" : ""
              }`}
            >
              {lastMessageTime}
            </p>
          )}
        </div>

        {!hideLastMessage && (
          <p className="text-[13px] opacity-60 truncate flex items-center gap-1">
            {isMyMessage && (
              ifSeen ? (
                <CheckCheck size={16} strokeWidth={3} className="text-blue-400 flex-shrink-0" />
              ) : ifDelivered ? (
                <Check size={16} strokeWidth={3} className="flex-shrink-0" />
              ) : null
            )}

            {rightSlot ? user.status : lastMessageText}
          </p>
        )}

      </div>

      {unread > 0 && (
        <span className="bg-primary text-black text-xs font-semibold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center ml-1">
          {unread > 99 ? "99+" : unread}
        </span>
      )}

      {rightSlot && (
        <div
          className="ml-2 flex-shrink-0"
          data-right-slot
        >
          {rightSlot}
        </div>
      )}
    </div>

  );
}