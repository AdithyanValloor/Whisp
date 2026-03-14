"use client";

import Image from "next/image";
import defaultPFP from "@/public/default-pfp.png";
import { AtSign, Users, Reply, X, UserRoundPlus, UserRoundCheck, UsersRound } from "lucide-react";

import { useAppDispatch } from "@/redux/hooks";
import { acceptFriend, rejectFriend } from "@/redux/features/friendsSlice";

import {
  deleteNotification,
  deleteNotificationLocal,
  InboxNotification,
  NotificationType,
} from "@/redux/features/notificationSlice";

import AppButton from "@/components/GlobalComponents/AppButton";

interface NotificationCardProps {
  notification: InboxNotification;
  onClick?: (notification: InboxNotification) => void;
}

/* ───────────────── helpers ───────────────── */

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ───────────────── icon config ───────────────── */

const iconConfig: Record<
  NotificationType,
  { Icon: React.ElementType; bg: string; color: string }
> = {
  friend_request_received: {
    Icon: UserRoundPlus,
    bg: "bg-yellow-950 pl-[2px]",
    color: "text-yellow-400",
  },

  friend_request_accepted: {
    Icon: UserRoundCheck,
    bg: "bg-green-950 pl-[2px]",
    color: "text-green-400",
  },

  mention: {
    Icon: AtSign,
    bg: "bg-green-950",
    color: "text-green-400",
  },

  group_added: {
    Icon: UsersRound,
    bg: "bg-cyan-950 pl-[2px]",
    color: "text-cyan-500",
  },

  reply: {
    Icon: Reply,
    bg: "bg-info/15",
    color: "text-info",
  },
};

/* ───────────────── message builder ───────────────── */

function buildMessage(notification: InboxNotification) {
  const actor = notification.actor;
  const name = actor?.displayName || actor?.username || "Someone";

  switch (notification.type) {
    case "friend_request_accepted":
      return {
        title: `${name} accepted your friend request`,
      };

    case "friend_request_received":
      return {
        title: `${name} sent you a friend request`,
      };

    case "mention":
      return {
        title: `${name} mentioned you`,
        subtitle: notification.message?.content,
      };

    case "group_added":
      return {
        title: `${name} added you to ${notification.group?.chatName}`,
        subtitle: "Tap to open the group",
      };

    case "reply":
      return {
        title: `${name} replied to your message`,
        subtitle: notification.message?.content,
      };

    default:
      return { title: "Notification" };
  }
}

/* ───────────────── component ───────────────── */

export default function NotificationCard({
  notification,
  onClick,
}: NotificationCardProps) {
  const dispatch = useAppDispatch();

  const { Icon, bg, color } = iconConfig[notification.type];

  const { title, subtitle } = buildMessage(notification);

  const pfpSrc = notification.actor?.profilePicture?.url || defaultPFP;

  const isFriendRequest = notification.type === "friend_request_received";

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.friendRequest) {
      dispatch(acceptFriend(notification.friendRequest));
      dispatch(deleteNotificationLocal(notification._id));
      dispatch(deleteNotification(notification._id));
    }
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.friendRequest) {
      dispatch(rejectFriend(notification.friendRequest));
      dispatch(deleteNotificationLocal(notification._id));
      dispatch(deleteNotification(notification._id));
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();

    dispatch(deleteNotificationLocal(notification._id));
    dispatch(deleteNotification(notification._id));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(notification)}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(notification)}
      className={`
        relative w-full flex items-start gap-3 px-3 py-3 rounded-xl
        transition-colors duration-150 text-left cursor-pointer group overflow-hidden 
        ${
          notification.read
            ? "hover:bg-base-content/5"
            : "bg-base-content/2 hover:bg-base-content/5"
        }
      `}
    >
      {/* Avatar */}

      {!notification.read && (
        <span className="absolute top-0 left-0  shrink-0 w-[2px] h-full opacity-30 rounded-full bg-cyan-500" />
      )}

      <div className="relative shrink-0">
        <Image
          src={pfpSrc}
          alt="avatar"
          width={42}
          height={42}
          className="rounded-full object-cover border border-base-content/10"
        />

        <span
          className={`
            absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
            border-3 border-base-200 ${bg}
          `}
        >
          <Icon size={12} className={color} strokeWidth={2.5} />
        </span>
      </div>

      {/* Content */}

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            notification.read
              ? "text-base-content/70"
              : "text-base-content font-medium"
          }`}
        >
          {title}
        </p>

        {subtitle && (
          <p className="text-xs text-base-content/50 mt-0.5 truncate">
            {subtitle}
          </p>
        )}

        <p className="text-xs text-base-content/40 mt-1">
          {timeAgo(notification.createdAt)}
        </p>

        {/* Friend Request Actions */}

        {isFriendRequest && (
          <div className="flex gap-2 mt-3">
            <AppButton onClick={handleAccept} className="flex-1">
              Accept
            </AppButton>

            <AppButton
              onClick={handleReject}
              className="flex-1 bg-red-900 hover:bg-red-800"
            >
              Reject
            </AppButton>
          </div>
        )}
      </div>

      <button
        aria-label="delete"
        onClick={handleDelete}
        className="
    absolute top-1 right-1
    p-1 rounded-full
    text-base-content/40
    hover:text-base-content
    cursor-pointer
    transition group-hover:opacity-100 opacity-0
  "
      >
        <X size={15} />
      </button>

      {/* Unread dot */}
    </div>
  );
}
